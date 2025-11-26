"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Page() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("super@talentdraft.local");
  const [password, setPassword] = useState("super123");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const u = await login(email.trim(), password);
    setLoading(false);
    if (!u) {
      setError("Invalid email or password");
      return;
    }
    const r = u.role;
    if (r === "super_admin") router.push("/super-admin");
    else if (r === "admin") router.push("/admin-dashboard");
    else router.push("/player-dashboard");
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-semibold mb-1">TalentDraft Login</h1>
        <p className="text-sm text-muted-foreground">Demo login with role-based dashboards. Use the credentials below.</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-4 rounded-lg border p-4">
        <div className="space-y-1">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <div className="text-sm text-destructive">{error}</div>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </Button>
      </form>
      <div className="text-xs text-muted-foreground space-y-1">
        <div><span className="font-medium">Super Admin:</span> super@talentdraft.local / super123</div>
        <div><span className="font-medium">Admin (Acme Corp):</span> admin@acme.local / admin123</div>
        <div><span className="font-medium">Player (Acme Corp):</span> player@acme.local / player123</div>
      </div>
    </div>
  );
}
