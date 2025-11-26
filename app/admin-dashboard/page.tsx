"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

interface DemoGame {
  id: string;
  name: string;
  company: string;
}

const demoGames: DemoGame[] = [
  { id: "g-1", name: "Acme FY25 Talent Draft", company: "Acme Corp" },
  { id: "g-2", name: "Globex Pilot", company: "Globex" },
];

export default function AdminDashboardPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [newGameName, setNewGameName] = useState("");

  if (!user || role !== "admin") {
    return <div className="text-sm text-destructive">Access denied. Please log in as admin.</div>;
  }

  const company = user.company || "Unknown";
  const games = useMemo(() => demoGames.filter((g) => g.company === company), [company]);

  function handleCreateGame() {
    if (!newGameName) return;
    alert(`Demo only: would create game "${newGameName}" for ${company}.`);
    setNewGameName("");
  }

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
          <CardTitle>Your Games</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 items-end">
            <div>
              <Label htmlFor="admin-game-name" className="text-xs">New game name</Label>
              <Input
                id="admin-game-name"
                value={newGameName}
                onChange={(e) => setNewGameName(e.target.value)}
                placeholder="e.g. Acme FY25 Draft"
                className="h-8 text-sm"
              />
            </div>
            <Button size="sm" className="h-8" onClick={handleCreateGame}>Create Game (demo)</Button>
          </div>

          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH className="w-40">Actions</TH>
              </TR>
            </THead>
            <TBody>
              {games.map((g) => (
                <TR key={g.id}>
                  <TD className="whitespace-nowrap">{g.name}</TD>
                  <TD>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => alert("Demo only: edit game/players.")}>Edit</Button>
                      <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => alert("Demo only: open results for this game.")}>View Results</Button>
                    </div>
                  </TD>
                </TR>
              ))}
              {games.length === 0 && (
                <TR>
                  <TD colSpan={2} className="text-sm text-muted-foreground">No games for this company yet.</TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
