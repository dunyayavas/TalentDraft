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
}) {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured");
  const supa = getSupabase();
  if (!supa) throw new Error("Supabase client not available");

  const { data: session, error: sErr } = await supa
    .from("sessions")
    .insert({ name: params.sessionName, pick_mode: params.pickMode, pick_value: params.pickValue })
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
