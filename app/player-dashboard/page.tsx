"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function PlayerDashboardPage() {
  const { user, role, logout } = useAuth();
  const router = useRouter();
  const [token, setToken] = useState("");

  if (!user || role !== "player") {
    return <div className="text-sm text-destructive">Access denied. Please log in as player.</div>;
  }

  function goToGame() {
    if (!token) return;
    router.push(`/p?token=${encodeURIComponent(token)}`);
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Player</h1>
          <p className="text-sm text-muted-foreground">Enter your invite link token to play your game.</p>
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
          <CardTitle>Join Game</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste the token from your invite link (from email like <code>?token=...</code>) to open your draft board.
          </p>
          <Input
            placeholder="Token from invite link"
            value={token}
            onChange={(e) => setToken(e.target.value)}
          />
          <Button onClick={goToGame}>Open Game</Button>
        </CardContent>
      </Card>
    </div>
  );
}
