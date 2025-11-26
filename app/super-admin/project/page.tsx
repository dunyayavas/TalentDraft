"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { AdminGameSetup } from "@/components/admin-game-setup";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabaseClient";
import { deleteProject } from "@/lib/supabaseService";

interface ProjectRow {
  id: string;
  name: string;
  company: string;
  admin_email: string;
}

interface SessionRow {
  id: string;
  name: string;
  company: string | null;
  pick_mode: string;
  pick_value: number;
  created_at: string;
}

export default function ProjectDetailsPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [resultsLoadingId, setResultsLoadingId] = useState<string | null>(null);

  // Read project id from query string on client side to avoid useSearchParams
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id");
    setProjectId(id);
  }, []);

  useEffect(() => {
    async function load() {
      if (!projectId) {
        setError("Missing project id");
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
        const { data: proj, error: pErr } = await supa
          .from("projects")
          .select("id, name, company, admin_email")
          .eq("id", projectId)
          .single();
        if (pErr || !proj) throw pErr || new Error("Project not found");
        setProject(proj as any);

        const { data: sess, error: sErr } = await supa
          .from("sessions")
          .select("id, name, company, pick_mode, pick_value, created_at")
          .eq("project_id", projectId)
          .order("created_at", { ascending: false });
        if (sErr) throw sErr;
        setSessions((sess || []) as any);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load project");
      } finally {
        setLoading(false);
      }
    }
    if (projectId) {
      load();
    }
  }, [projectId]);

  if (!user || role !== "super_admin") {
    return <div className="text-sm text-destructive">Access denied. Please log in as super admin.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Project Details</h1>
          {project && (
            <p className="text-sm text-muted-foreground">
              {project.name} – {project.company} (admin: {project.admin_email})
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              if (!projectId) return;
              if (!window.confirm("Delete this project and all its sessions? This cannot be undone.")) return;
              try {
                await deleteProject(projectId);
                router.push("/super-admin");
              } catch (e: any) {
                console.error(e);
                alert(e?.message || "Failed to delete project");
              }
            }}
          >
            Delete Project
          </Button>
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
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}
      {loading && <div className="text-sm text-muted-foreground">Loading project…</div>}

      {!loading && project && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Existing Games</CardTitle>
            </CardHeader>
            <CardContent>
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
                      <TD className="whitespace-nowrap">{s.company || project.company}</TD>
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
                                Players & Picks
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
                                {resultsLoadingId === s.id ? "Opening Results…" : "Results"}
                              </button>
                            </div>
                          )}
                        </div>
                      </TD>
                    </TR>
                  ))}
                  {sessions.length === 0 && (
                    <TR>
                      <TD colSpan={6} className="text-sm text-muted-foreground">No games yet for this project.</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </CardContent>
          </Card>

          <div className="border-t pt-4">
            <AdminGameSetup company={project.company} projectId={project.id} />
          </div>
        </>
      )}
    </div>
  );
}
