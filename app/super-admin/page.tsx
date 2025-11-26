"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { createProject, listProjectsWithStats, type ProjectWithStats } from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function SuperAdminPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [projectName, setProjectName] = useState("");
  const [projectCompany, setProjectCompany] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [creating, setCreating] = useState(false);

  if (!user || role !== "super_admin") {
    return <div className="text-sm text-destructive">Access denied. Please log in as super admin.</div>;
  }

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured. Projects view requires Supabase.");
        setLoading(false);
        return;
      }
      try {
        const data = await listProjectsWithStats();
        setProjects(data);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleCreateProject() {
    if (!projectName || !projectCompany || !adminEmail || !adminPassword) return;
    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured. Cannot create projects.");
      return;
    }
    try {
      setCreating(true);
      await createProject({ name: projectName, company: projectCompany, adminEmail, adminPassword });
      const data = await listProjectsWithStats();
      setProjects(data);
      setProjectName("");
      setProjectCompany("");
      setAdminEmail("");
      setAdminPassword("");
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "Failed to create project");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Manage projects (companies), admins, and game stats.</p>
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
          <CardTitle>Create Project</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
            <div>
              <Label htmlFor="project-name" className="text-xs">Project name</Label>
              <Input
                id="project-name"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. FY25 Talent Draft"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="project-company" className="text-xs">Company</Label>
              <Input
                id="project-company"
                value={projectCompany}
                onChange={(e) => setProjectCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="admin-email" className="text-xs">Admin email</Label>
              <Input
                id="admin-email"
                type="email"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                placeholder="admin@company.com"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="admin-password" className="text-xs">Admin password</Label>
              <Input
                id="admin-password"
                type="text"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Set a demo password"
                className="h-8 text-sm"
              />
            </div>
          </div>
          <Button size="sm" className="h-8" onClick={handleCreateProject} disabled={creating}>
            {creating ? "Creating..." : "Create Project"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Projects</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && <div className="text-sm text-destructive">{error}</div>}
          <Table>
            <THead>
              <TR>
                <TH>Project</TH>
                <TH>Company</TH>
                <TH># Sessions</TH>
                <TH># Games Played</TH>
                <TH className="w-16 text-right">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {projects.map((p) => (
                <TR key={p.id}>
                  <TD className="whitespace-nowrap">{p.name}</TD>
                  <TD className="whitespace-nowrap">{p.company}</TD>
                  <TD>{p.sessionCount}</TD>
                  <TD>{p.gamesPlayed}</TD>
                  <TD className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 w-8 px-0 text-xs"
                      onClick={() => router.push(`/super-admin/project?id=${encodeURIComponent(p.id)}`)}
                      aria-label="Open project details"
                    >
                      ⋯
                    </Button>
                  </TD>
                </TR>
              ))}
              {!loading && projects.length === 0 && (
                <TR>
                  <TD colSpan={5} className="text-sm text-muted-foreground">No projects yet.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
