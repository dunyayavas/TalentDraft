"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { AdminGameSetup } from "@/components/admin-game-setup";

interface SessionRow {
  id: string;
  name: string;
  company: string | null;
  pick_mode: string;
  pick_value: number;
  created_at: string;
}

export default function AdminDashboardPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [resultsLoadingId, setResultsLoadingId] = useState<string | null>(null);

  if (!user || role !== "admin") {
    return <div className="text-sm text-destructive">Access denied. Please log in as admin.</div>;
  }

  const company = user.company || "Unknown";

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const supa = getSupabase();
        if (!supa) throw new Error("Supabase client not available");
        let query = supa
          .from("sessions")
          .select("id, name, company, pick_mode, pick_value, created_at")
          .order("created_at", { ascending: false });
        if (company && company !== "Unknown") {
          query = query.eq("company", company);
        }
        const { data, error: sErr } = await query;
        if (sErr) throw sErr;
        setSessions((data || []) as any);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load games");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [company]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Admin – {company}</h1>
          <p className="text-sm text-muted-foreground">Manage players and games for your company.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            logout();
            router.push("/");
          }}
        >
          Logout
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Existing Games</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-sm text-destructive mb-2">{error}</div>}
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Company</TH>
                <TH>Pick Mode</TH>
                <TH>Pick Value</TH>
                <TH className="w-40">Created At</TH>
                <TH className="w-24 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {sessions.map((s) => (
                <TR key={s.id}>
                  <TD className="whitespace-nowrap">{s.name}</TD>
                  <TD className="whitespace-nowrap">{s.company || "-"}</TD>
                  <TD>{s.pick_mode}</TD>
                  <TD>{s.pick_value}</TD>
                  <TD className="whitespace-nowrap text-xs text-muted-foreground">{new Date(s.created_at).toLocaleString()}</TD>
                  <TD className="align-top">
                    <div className="relative flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 w-7 px-0"
                        onClick={() =>
                          setOpenMenuId((prev) => (prev === s.id ? null : s.id))
                        }
                      >
                        ···
                      </Button>
                      {openMenuId === s.id && (
                        <div className="absolute right-0 top-7 z-10 w-40 rounded-md border bg-background shadow-md text-xs">
                          <button
                            className="block w-full px-3 py-2 text-left hover:bg-muted"
                            onClick={() => {
                              setOpenMenuId(null);
                              router.push(`/game-admin?session=${s.id}`);
                            }}
                          >
                            Edit Game
                          </button>
                          <button
                            className="block w-full px-3 py-2 text-left hover:bg-muted disabled:opacity-60"
                            disabled={resultsLoadingId === s.id}
                            onClick={async () => {
                              setResultsLoadingId(s.id);
                              setOpenMenuId(null);
                              try {
                                if (!isSupabaseConfigured()) {
                                  alert("Supabase is not configured.");
                                  return;
                                }
                                const supa = getSupabase();
                                if (!supa) throw new Error("Supabase client not available");
                                const { data, error: pErr } = await supa
                                  .from("players")
                                  .select("token")
                                  .eq("session_id", s.id)
                                  .limit(1)
                                  .maybeSingle();
                                if (pErr) throw pErr;
                                if (!data || !data.token) {
                                  alert("No players found for this game yet.");
                                  return;
                                }
                                const url = `/results?token=${encodeURIComponent(
                                  (data as any).token as string,
                                )}`;
                                router.push(url);
                              } catch (e: any) {
                                console.error(e);
                                alert(e?.message || "Failed to open results");
                              } finally {
                                setResultsLoadingId(null);
                              }
                            }}
                          >
                            {resultsLoadingId === s.id ? "Opening Results…" : "View Results"}
                          </button>
                        </div>
                      )}
                    </div>
                  </TD>
                </TR>
              ))}
              {!loading && sessions.length === 0 && (
                <TR>
                  <TD colSpan={6} className="text-sm text-muted-foreground">No games found for this company yet.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <div className="border-t pt-4">
        <AdminGameSetup company={company} />
      </div>
    </div>
  );
}
