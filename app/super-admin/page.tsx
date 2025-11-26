"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { demoUsers } from "@/lib/authDemo";

interface DemoGame {
  id: string;
  name: string;
  company: string;
}

const initialGames: DemoGame[] = [
  { id: "g-1", name: "Acme FY25 Talent Draft", company: "Acme Corp" },
  { id: "g-2", name: "Globex Pilot", company: "Globex" },
];

export default function SuperAdminPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [games, setGames] = useState<DemoGame[]>(initialGames);
  const [newGameName, setNewGameName] = useState("");
  const [newGameCompany, setNewGameCompany] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminCompany, setNewAdminCompany] = useState("");

  if (!user || role !== "super_admin") {
    return <div className="text-sm text-destructive">Access denied. Please log in as super admin.</div>;
  }

  function handleCreateGame() {
    if (!newGameName || !newGameCompany) return;
    const g: DemoGame = { id: `g-${games.length + 1}`, name: newGameName, company: newGameCompany };
    setGames((prev) => [...prev, g]);
    setNewGameName("");
    setNewGameCompany("");
  }

  function handleDeleteGame(id: string) {
    setGames((prev) => prev.filter((g) => g.id !== id));
  }

  function handleCreateAdmin() {
    if (!newAdminEmail || !newAdminCompany) return;
    alert(`Demo only: would create admin ${newAdminEmail} for company ${newAdminCompany}.`);
    setNewAdminEmail("");
    setNewAdminCompany("");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Super Admin</h1>
          <p className="text-sm text-muted-foreground">Manage companies, admins, and games.</p>
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
          <CardTitle>Games</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Label htmlFor="game-name" className="text-xs">Game name</Label>
              <Input
                id="game-name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="e.g. Acme FY25 Draft"
                className="h-8 text-sm"
              />
            </div>
            <div>
              <Label htmlFor="game-company" className="text-xs">Company</Label>
              <Input
                id="game-company"
                value={newGameCompany}
                onChange={(e) => setNewGameCompany(e.target.value)}
                placeholder="e.g. Acme Corp"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleCreateGame}>Create Game</Button>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Company</TH>
                <TH className="w-40">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {games.map((g) => (
                <TR key={g.id}>
                  <TD className="whitespace-nowrap">{g.name}</TD>
                  <TD>{g.company}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => alert("Demo only: view/edit game in real app.")}>Edit</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => alert("Demo only: would open results list.")}>Results</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-destructive border-destructive" onClick={() => handleDeleteGame(g.id)}>Delete</Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {games.length === 0 && (
                <TR>
                  <TD colSpan={3} className="text-sm text-muted-foreground">No games yet.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <THead>
              <TR>
                <TH>Email</TH>
                <TH>Role</TH>
                <TH>Company</TH>
              </TR>
            </THead>
            <TBody>
              {demoUsers.map((u) => (
                <TR key={u.id}>
                  <TD className="whitespace-nowrap">{u.email}</TD>
                  <TD>{u.role}</TD>
                  <TD>{u.company || "-"}</TD>
                </TR>
              ))}
            </TBody>
          </Table>

          <div className="border-t pt-4 space-y-2">
            <div className="text-sm font-medium">Create admin user</div>
            <div className="flex flex-wrap gap-2 items-end">
              <div>
                <Label htmlFor="admin-email" className="text-xs">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@company.com"
                  className="h-8 text-sm"
                />
              </div>
              <div>
                <Label htmlFor="admin-company" className="text-xs">Company</Label>
                <Input
                  id="admin-company"
                  value={newAdminCompany}
                  onChange={(e) => setNewAdminCompany(e.target.value)}
                  placeholder="Company name"
                  className="h-8 text-sm"
                />
              </div>
              <Button size="sm" className="h-8" onClick={handleCreateAdmin}>Create Admin (demo)</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
