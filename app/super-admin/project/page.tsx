"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  pick_mode: string;
  pick_value: number;
}

export default function ProjectDetailsPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [projectId, setProjectId] = useState<string | null>(null);

  const [project, setProject] = useState<ProjectRow | null>(null);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSessionName, setNewSessionName] = useState("");
  const [newPickMode, setNewPickMode] = useState<"percentage" | "fixed">("fixed");
  const [newPickValue, setNewPickValue] = useState(10);
  const [creatingSession, setCreatingSession] = useState(false);

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
          .select("id, name, pick_mode, pick_value")
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
        <Card>
          <CardHeader>
            <CardTitle>Sessions in this Project</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-end">
              <div>
                <Label htmlFor="session-name" className="text-xs">New session name</Label>
                <Input
                  id="session-name"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g. Draft Round 1"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs">Pick mode</Label>
                <select
                  className="h-8 text-sm rounded-md border px-2 bg-background"
                  value={newPickMode}
                  onChange={(e) => setNewPickMode(e.target.value as any)}
                >
                  <option value="fixed">Fixed</option>
                  <option value="percentage">Percentage</option>
                </select>
              </div>
              <div>
                <Label htmlFor="pick-value" className="text-xs">Pick value</Label>
                <Input
                  id="pick-value"
                  type="number"
                  value={newPickValue}
                  onChange={(e) => setNewPickValue(Number(e.target.value) || 0)}
                  className="h-8 text-sm w-24"
                />
              </div>
              <Button
                size="sm"
                className="h-8"
                disabled={creatingSession || !newSessionName}
                onClick={async () => {
                  if (!projectId) return;
                  if (!isSupabaseConfigured()) {
                    alert("Supabase is not configured. Cannot create session.");
                    return;
                  }
                  try {
                    setCreatingSession(true);
                    const supa = getSupabase();
                    if (!supa) throw new Error("Supabase client not available");
                    const { error: sErr } = await supa.from("sessions").insert({
                      project_id: projectId,
                      name: newSessionName,
                      company: project.company,
                      pick_mode: newPickMode,
                      pick_value: newPickValue,
                    });
                    if (sErr) throw sErr;
                    const { data: sess, error: reloadErr } = await supa
                      .from("sessions")
                      .select("id, name, pick_mode, pick_value")
                      .eq("project_id", projectId)
                      .order("created_at", { ascending: false });
                    if (reloadErr) throw reloadErr;
                    setSessions((sess || []) as any);
                    setNewSessionName("");
                  } catch (e: any) {
                    console.error(e);
                    alert(e?.message || "Failed to create session");
                  } finally {
                    setCreatingSession(false);
                  }
                }}
              >
                {creatingSession ? "Creating..." : "Create Session"}
              </Button>
            </div>
            <Table>
              <THead>
                <TR>
                  <TH>Name</TH>
                  <TH>Pick Mode</TH>
                  <TH>Pick Value</TH>
                  <TH className="w-40">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {sessions.map((s) => (
                  <TR key={s.id}>
                    <TD className="whitespace-nowrap">{s.name}</TD>
                    <TD>{s.pick_mode}</TD>
                    <TD>{s.pick_value}</TD>
                    <TD>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => alert("Demo: would show players and picks for this session.")}
                        >
                          Players & Picks
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2 text-xs"
                          onClick={() => alert("Demo: would open aggregated results for this session.")}
                        >
                          Results
                        </Button>
                      </div>
                    </TD>
                  </TR>
                ))}
                {sessions.length === 0 && (
                  <TR>
                    <TD colSpan={4} className="text-sm text-muted-foreground">No sessions yet for this project.</TD>
                  </TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
