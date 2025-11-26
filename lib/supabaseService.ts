import { getSupabase, isSupabaseConfigured } from "./supabaseClient";
import type { Session, Talent } from "./types";

export type AdminPlayerInput = { firstName: string; lastName: string; email?: string };

export async function createGame(params: {
  sessionName: string;
  pickMode: "percentage" | "fixed";
  pickValue: number;
  rawRows: Record<string, string>[];
  players: AdminPlayerInput[];
  baseUrl: string;
  company?: string;
  projectId?: string;
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase client not available");

  const { data: session, error: sErr } = await supa
    .from("sessions")
    .insert({
      name: params.sessionName,
      pick_mode: params.pickMode,
      pick_value: params.pickValue,
      company: params.company ?? null,
      project_id: params.projectId ?? null,
    })
    .select("*")
    .single();
  if (sErr || !session) throw sErr || new Error("Failed to create session");

  const sessionId: string = session.id;

  const talentsPayload = params.rawRows
    .map((row) => {
      const name = row["Name"] || row["name"] || row["Name and Surname"] || row["Full Name"] || "";
      if (!name) return null;
      const payload: any = {
        session_id: sessionId,
        name,
        function: row["Function"] || null,
        department: row["Department"] || null,
        level: row["Level"] || null,
        grade: row["Grade"] || null,
        time_in_company: row["TimeInCompany"] || row["Time in Company"] || null,
        time_in_job: row["TimeInJob"] || row["Time in Job"] || null,
        performance: row["Performance"] || null,
        potential: row["Potential"] || null,
        extra: row,
      };
      return payload;
    })
    .filter(Boolean);

  if (talentsPayload.length > 0) {
    const { error: tErr } = await supa.from("talents").insert(talentsPayload as any[]);
    if (tErr) throw tErr;
  }

  const invites: { name: string; email?: string; link: string; token: string }[] = [];
  for (const p of params.players) {
    const token = crypto.randomUUID();
    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.trim() || "Player";
    const { error: perr } = await supa.from("players").insert({ session_id: sessionId, first_name: p.firstName || null, last_name: p.lastName || null, email: p.email || null, token });
    if (perr) throw perr;
    const link = `${params.baseUrl}/p?token=${encodeURIComponent(token)}`;
    invites.push({ name: fullName, email: p.email, link, token });
  }

  return { sessionId, invites };
}

export async function fetchGameByToken(token: string) {
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase not configured");
  const { data: player, error: pErr } = await supa.from("players").select("* , sessions!inner(*)").eq("token", token).single();
  if (pErr || !player) throw pErr || new Error("Invalid link");
  const session = player.sessions as any as { id: string; name: string; pick_mode: "percentage" | "fixed"; pick_value: number };
  const { data: talents, error: tErr } = await supa.from("talents").select("*").eq("session_id", session.id).order("name", { ascending: true });
  if (tErr) throw tErr;
  let picks: Array<{ order: number; talent_id: string; rationale?: string }> = [];
  const { data: existing, error: eErr } = await supa.from("picks").select("order, talent_id, rationale").eq("session_id", session.id).eq("player_id", player.id).order("order");
  if (!eErr && existing) picks = existing as any;
  return { session, player, talents: talents || [], picks };
}

export async function savePlayerPicks(sessionId: string, playerId: string, picks: Array<{ order: number; talent_id: string; rationale?: string }>) {
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase not configured");
  const { error: delErr } = await supa.from("picks").delete().eq("session_id", sessionId).eq("player_id", playerId);
  if (delErr) throw delErr;
  if (picks.length > 0) {
    const payload = picks.map((p) => ({ session_id: sessionId, player_id: playerId, order: p.order, talent_id: p.talent_id, rationale: p.rationale || null }));
    const { error: insErr } = await supa.from("picks").insert(payload);
    if (insErr) throw insErr;
  }
}

// Simple project model for super-admin demo
export interface ProjectWithStats {
  id: string;
  name: string;
  company: string;
  admin_email: string;
  admin_password: string;
  sessionCount: number;
  gamesPlayed: number; // distinct players with at least one pick
}

export async function createProject(params: { name: string; company: string; adminEmail: string; adminPassword: string }) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase client not available");

  const { data, error } = await supa
    .from("projects")
    .insert({
      name: params.name,
      company: params.company,
      admin_email: params.adminEmail,
      admin_password: params.adminPassword,
    })
    .select("*")
    .single();

  if (error || !data) throw error || new Error("Failed to create project");
  return data as { id: string; name: string; company: string; admin_email: string; admin_password: string };
}

export async function listProjectsWithStats(): Promise<ProjectWithStats[]> {
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase not configured");

  const { data: projects, error: pErr } = await supa.from("projects").select("id, name, company, admin_email, admin_password");
  if (pErr || !projects) throw pErr || new Error("Failed to load projects");

  const { data: sessions, error: sErr } = await supa.from("sessions").select("id, project_id");
  if (sErr || !sessions) throw sErr || new Error("Failed to load sessions");

  const { data: picks, error: pkErr } = await supa.from("picks").select("session_id, player_id");
  if (pkErr || !picks) throw pkErr || new Error("Failed to load picks");

  return (projects as any[]).map((proj) => {
    const projSessions = sessions.filter((s: any) => s.project_id === proj.id);
    const sessionIds = new Set(projSessions.map((s: any) => s.id));
    const projPicks = picks.filter((pk: any) => sessionIds.has(pk.session_id));
    const distinctPlayers = new Set(projPicks.map((pk: any) => pk.player_id));
    return {
      id: proj.id,
      name: proj.name,
      company: proj.company,
      admin_email: proj.admin_email,
      admin_password: proj.admin_password,
      sessionCount: projSessions.length,
      gamesPlayed: distinctPlayers.size,
    } as ProjectWithStats;
  });
}

export async function deleteProject(projectId: string) {
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase not configured");
  const { error } = await supa.from("projects").delete().eq("id", projectId);
  if (error) throw error;
}

// Demo-only admin resolver: given email/password, see if there is a project
// whose admin_email/admin_password match and, if so, return basic admin info.
export async function findProjectAdminByCredentials(email: string, password: string): Promise<{ email: string; company: string } | null> {
  if (!isSupabaseConfigured()) return null;
  const supa = getSupabase();
  if (!supa) return null;
  const { data, error } = await supa
    .from("projects")
    .select("company")
    .eq("admin_email", email)
    .eq("admin_password", password)
    .maybeSingle();
  if (error || !data) return null;
  return { email, company: (data as any).company as string };
}

// For results page: given a player token, load its session, talents, and all picks
// for that session so we can aggregate results.
export async function fetchResultsByToken(token: string) {
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase not configured");

  // Reuse the players-sessions join to resolve the session from the token
  const { data: player, error: pErr } = await supa
    .from("players")
    .select("*, sessions!inner(*)")
    .eq("token", token)
    .single();
  if (pErr || !player) throw pErr || new Error("Invalid link");

  const session = player.sessions as any as { id: string; name: string; pick_mode: "percentage" | "fixed"; pick_value: number };

  const { data: talents, error: tErr } = await supa
    .from("talents")
    .select("*")
    .eq("session_id", session.id)
    .order("name", { ascending: true });
  if (tErr) throw tErr;

  const { data: picks, error: pickErr } = await supa
    .from("picks")
    .select("player_id, order, talent_id")
    .eq("session_id", session.id)
    .order("player_id", { ascending: true })
    .order("order", { ascending: true });
  if (pickErr) throw pickErr;

  return { session, talents: talents || [], picks: picks || [] };
}
