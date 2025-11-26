"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import Papa from "papaparse";
import { fileToText } from "@/lib/utils";

interface SessionRow {
  id: string;
  name: string;
  company: string | null;
  pick_mode: string;
  pick_value: number;
}

interface PlayerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  token: string;
}

interface NewPlayerInput {
  firstName: string;
  lastName: string;
  email: string;
}

interface TalentRow {
  id: string;
  name: string;
  function: string | null;
  department: string | null;
  level: string | null;
  grade: string | null;
  time_in_company: string | null;
  time_in_job: string | null;
  performance: string | null;
  potential: string | null;
}

export default function GameAdminPage() {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [session, setSession] = useState<SessionRow | null>(null);
  const [sessionName, setSessionName] = useState("");
  const [pickMode, setPickMode] = useState<"percentage" | "fixed">("fixed");
  const [pickValue, setPickValue] = useState<number>(10);
  const [talents, setTalents] = useState<TalentRow[]>([]);
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [talentCount, setTalentCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPlayers, setNewPlayers] = useState<NewPlayerInput[]>([{
    firstName: "",
    lastName: "",
    email: "",
  }]);
  const [savingPlayers, setSavingPlayers] = useState(false);
  const [addingTalents, setAddingTalents] = useState(false);

  // Read session id from query param on client
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("session");
    setSessionId(id);
  }, []);

  useEffect(() => {
    async function load() {
      if (!sessionId) {
        setError("Missing session id");
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const supa = getSupabase();
        if (!supa) throw new Error("Supabase client not available");

        const { data: sess, error: sErr } = await supa
          .from("sessions")
          .select("id, name, company, pick_mode, pick_value")
          .eq("id", sessionId)
          .single();
        if (sErr || !sess) throw sErr || new Error("Session not found");
        setSession(sess as any);
        setSessionName((sess as any).name as string);
        setPickMode(((sess as any).pick_mode as "percentage" | "fixed") ?? "fixed");
        setPickValue((sess as any).pick_value as number);

        const { data: pls, error: pErr } = await supa
          .from("players")
          .select("id, first_name, last_name, email, token")
          .eq("session_id", sessionId)
          .order("first_name", { ascending: true });
        if (pErr) throw pErr;
        setPlayers((pls || []) as any);

        const { data: tdata, count, error: tErr } = await supa
          .from("talents")
          .select("id, name, function, department, level, grade, time_in_company, time_in_job, performance, potential", { count: "exact" })
          .eq("session_id", sessionId)
          .order("name", { ascending: true });
        if (tErr) throw tErr;
        setTalents((tdata || []) as any);
        setTalentCount(count ?? (tdata ? tdata.length : 0));
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load game");
      } finally {
        setLoading(false);
      }
    }
    if (sessionId) load();
  }, [sessionId]);

  async function handleAddPlayers() {
    if (!sessionId) return;
    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured.");
      return;
    }
    const usable = newPlayers.filter(
      (p) => p.firstName.trim() || p.lastName.trim() || p.email.trim(),
    );
    if (usable.length === 0) return;
    try {
      setSavingPlayers(true);
      const supa = getSupabase();
      if (!supa) throw new Error("Supabase client not available");
      const base =
        typeof window !== "undefined"
          ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "")
          : "";
      const rows: { first_name: string | null; last_name: string | null; email: string | null; token: string; session_id: string }[] = [];
      for (const p of usable) {
        const token = crypto.randomUUID();
        rows.push({
          session_id: sessionId,
          first_name: p.firstName || null,
          last_name: p.lastName || null,
          email: p.email || null,
          token,
        });
      }
      const { error: insErr } = await supa.from("players").insert(rows as any[]);
      if (insErr) throw insErr;
      const { data: pls, error: pErr } = await supa
        .from("players")
        .select("id, first_name, last_name, email, token")
        .eq("session_id", sessionId)
        .order("first_name", { ascending: true });
      if (pErr) throw pErr;
      setPlayers((pls || []) as any);
      setNewPlayers([{ firstName: "", lastName: "", email: "" }]);
      if (base) {
        alert("New players added. Use the links table to share updated invites.");
      }
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add players");
    } finally {
      setSavingPlayers(false);
    }
  }

  async function handleAddTalents(file: File) {
    if (!sessionId) return;
    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured.");
      return;
    }
    try {
      setAddingTalents(true);
      const text = await fileToText(file);
      const parsed: any = Papa.parse(text, { header: true, skipEmptyLines: true });
      const data = parsed.data as unknown as Record<string, string>[];
      const supa = getSupabase();
      if (!supa) throw new Error("Supabase client not available");
      const payload = data
        .map((row) => {
          const name =
            row["Name"] || row["name"] || row["Name and Surname"] || row["Full Name"] || "";
          if (!name) return null;
          return {
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
        })
        .filter(Boolean) as any[];
      if (payload.length === 0) {
        alert("No valid talents found in CSV.");
        return;
      }
      const { error: tErr } = await supa.from("talents").insert(payload);
      if (tErr) throw tErr;
      const { count, error: cntErr } = await supa
        .from("talents")
        .select("id", { count: "exact", head: true })
        .eq("session_id", sessionId);
      if (cntErr) throw cntErr;
      setTalentCount(count ?? 0);
      alert(`Added ${payload.length} talents to this game.`);
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to add talents");
    } finally {
      setAddingTalents(false);
    }
  }

  if (!sessionId) {
    return <div className="text-sm text-destructive">Missing session id.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Game Admin</h1>
          {session && (
            <p className="text-sm text-muted-foreground">
              {session.name} {session.company ? `– ${session.company}` : ""} (mode: {session.pick_mode}, value: {session.pick_value})
            </p>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.back()}
        >
          Back
        </Button>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading game…</div>}

      {!loading && !error && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Edit Game Settings</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="session-name">Name</Label>
                <Input
                  id="session-name"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Q1 Executive Draft"
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Pick Mode</Label>
                <div className="flex gap-2">
                  <select
                    className="h-9 text-sm rounded-md border px-2 bg-background"
                    value={pickMode}
                    onChange={(e) => setPickMode(e.target.value as "percentage" | "fixed")}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="percentage">Percentage</option>
                  </select>
                  <Input
                    type="number"
                    min={1}
                    value={pickValue}
                    onChange={(e) => setPickValue(Number(e.target.value) || 0)}
                    className="w-28"
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    if (!sessionId) return;
                    if (!isSupabaseConfigured()) {
                      alert("Supabase is not configured.");
                      return;
                    }
                    try {
                      const supa = getSupabase();
                      if (!supa) throw new Error("Supabase client not available");
                      const { error: uErr } = await supa
                        .from("sessions")
                        .update({ name: sessionName, pick_mode: pickMode, pick_value: pickValue })
                        .eq("id", sessionId);
                      if (uErr) throw uErr;
                      setSession((prev) =>
                        prev
                          ? {
                              ...prev,
                              name: sessionName,
                              pick_mode: pickMode,
                              pick_value: pickValue,
                            }
                          : prev,
                      );
                      alert("Game settings saved.");
                    } catch (e: any) {
                      console.error(e);
                      alert(e?.message || "Failed to save settings");
                    }
                  }}
                >
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Talent Pool</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Current talents in this game: {talentCount ?? "-"}
              </p>
              <div className="space-y-2">
                <Label className="text-xs">Add more talents via CSV</Label>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleAddTalents(f);
                  }}
                  disabled={addingTalents}
                />
                {addingTalents && (
                  <p className="text-xs text-muted-foreground">Uploading and adding talents…</p>
                )}
              </div>
              {talents.length > 0 && (
                <div className="mt-4 border rounded-md overflow-auto max-h-80">
                  <Table>
                    <THead>
                      <TR>
                        <TH>Name</TH>
                        <TH>Function</TH>
                        <TH>Department</TH>
                        <TH>Level</TH>
                        <TH>Grade</TH>
                        <TH>Time in Company</TH>
                        <TH>Time in Job</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {talents.map((t) => (
                        <TR key={t.id}>
                          <TD className="whitespace-nowrap">{t.name}</TD>
                          <TD className="whitespace-nowrap">{t.function || "-"}</TD>
                          <TD className="whitespace-nowrap">{t.department || "-"}</TD>
                          <TD className="whitespace-nowrap">{t.level || "-"}</TD>
                          <TD className="whitespace-nowrap">{t.grade || "-"}</TD>
                          <TD className="whitespace-nowrap text-xs">{t.time_in_company || "-"}</TD>
                          <TD className="whitespace-nowrap text-xs">{t.time_in_job || "-"}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Players & Invite Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs">Add more players</Label>
                <div className="space-y-2">
                  {newPlayers.map((p, idx) => (
                    <div key={idx} className="flex flex-wrap gap-2">
                      <Input
                        placeholder="First name"
                        value={p.firstName}
                        onChange={(e) => {
                          const next = [...newPlayers];
                          next[idx] = { ...next[idx], firstName: e.target.value };
                          setNewPlayers(next);
                        }}
                        className="w-32"
                      />
                      <Input
                        placeholder="Last name"
                        value={p.lastName}
                        onChange={(e) => {
                          const next = [...newPlayers];
                          next[idx] = { ...next[idx], lastName: e.target.value };
                          setNewPlayers(next);
                        }}
                        className="w-32"
                      />
                      <Input
                        placeholder="Email (optional)"
                        value={p.email}
                        onChange={(e) => {
                          const next = [...newPlayers];
                          next[idx] = { ...next[idx], email: e.target.value };
                          setNewPlayers(next);
                        }}
                        className="w-56"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setNewPlayers((prev) => [...prev, { firstName: "", lastName: "", email: "" }])
                    }
                  >
                    + Add Row
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleAddPlayers}
                    disabled={savingPlayers}
                  >
                    {savingPlayers ? "Saving…" : "Save Players"}
                  </Button>
                </div>
              </div>

              <div className="border rounded-md overflow-auto">
                <Table>
                  <THead>
                    <TR>
                      <TH>#</TH>
                      <TH>Player</TH>
                      <TH>Email</TH>
                      <TH>Link</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {players.map((p, idx) => {
                      const name = `${p.first_name || ""} ${p.last_name || ""}`.trim() || "Player";
                      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
                      const link = `${basePath}/p?token=${encodeURIComponent(p.token)}`;
                      return (
                        <TR key={p.id}>
                          <TD className="w-10">{idx + 1}</TD>
                          <TD>{name}</TD>
                          <TD>{p.email || "-"}</TD>
                          <TD>
                            <a
                              href={link}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {link}
                            </a>
                          </TD>
                        </TR>
                      );
                    })}
                    {players.length === 0 && (
                      <TR>
                        <TD colSpan={4} className="text-sm text-muted-foreground">
                          No players yet for this game.
                        </TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={async () => {
                    if (!sessionId) return;
                    if (!isSupabaseConfigured()) {
                      alert("Supabase is not configured.");
                      return;
                    }
                    try {
                      const supa = getSupabase();
                      if (!supa) throw new Error("Supabase client not available");
                      const { data, error: pErr } = await supa
                        .from("players")
                        .select("token")
                        .eq("session_id", sessionId)
                        .limit(1)
                        .maybeSingle();
                      if (pErr) throw pErr;
                      if (!data || !(data as any).token) {
                        alert("No players found for this game yet.");
                        return;
                      }
                      router.push(`/results?token=${encodeURIComponent((data as any).token as string)}`);
                    } catch (e: any) {
                      console.error(e);
                      alert(e?.message || "Failed to open results");
                    }
                  }}
                >
                  View Aggregated Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
