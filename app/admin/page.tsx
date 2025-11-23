"use client";

import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectItem } from "@/components/ui/select";
import Papa from "papaparse";
import { downloadCsv, fileToText } from "@/lib/utils";
import type { Talent } from "@/lib/types";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { createGame, type AdminPlayerInput } from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function AdminPage() {
  const [sessionName, setSessionName] = useState("");
  const [pickMode, setPickMode] = useState<"percentage" | "fixed">("percentage");
  const [pickValue, setPickValue] = useState<number>(15);
  const [talents, setTalents] = useState<Talent[]>([]);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [playersCount, setPlayersCount] = useState<number>(3);
  const [players, setPlayers] = useState<AdminPlayerInput[]>([{ firstName: "", lastName: "", email: "" }, { firstName: "", lastName: "", email: "" }, { firstName: "", lastName: "", email: "" }]);
  const [invites, setInvites] = useState<{ name: string; email?: string; link: string; token: string }[] | null>(null);

  const computedQuota = useMemo(() => {
    if (talents.length === 0) return 0;
    if (pickMode === "percentage") return Math.max(1, Math.ceil((talents.length * pickValue) / 100));
    return Math.max(1, Math.min(talents.length, Math.floor(pickValue)));
  }, [talents.length, pickMode, pickValue]);

  useEffect(() => {
    setPlayers((prev) => {
      const next = [...prev];
      if (playersCount > next.length) {
        while (next.length < playersCount) next.push({ firstName: "", lastName: "", email: "" });
      } else if (playersCount < next.length) {
        next.length = playersCount;
      }
      return next;
    });
  }, [playersCount]);

  function onDownloadTemplate() {
    const headers = ["Name","Function","Department","Level","Grade","TimeInCompany","TimeInJob","Performance","Potential"];
    const rows = [headers, ["Jane Doe","Sales","EMEA","N-2","G8","3y","1y","A","H"], ["John Smith","Engineering","PLATFORM","N-3","G6","2y","6m","B","M"]];
    downloadCsv("talents_template.csv", rows.map(r=>r.map(String)));
  }

  async function onCsvUpload(file: File) {
    const text = await fileToText(file);
    const parsed: any = Papa.parse(text, { header: true, skipEmptyLines: true });
    const data = parsed.data as unknown as Record<string, string>[];
    const headers = Array.from(new Set(data.flatMap((row) => Object.keys(row))));
    setRawHeaders(headers);
    setRawRows(data);

    const mapped: Talent[] = [];
    for (const row of data) {
      const name = row["Name"] || row["name"] || row["Name and Surname"] || row["Full Name"] || "";
      if (!name) continue;
      const extra: Record<string, any> = {};
      for (const [k, v] of Object.entries(row)) {
        if (["Name","name","Name and Surname","Full Name"].includes(k)) continue;
        extra[k] = v;
      }
      mapped.push({
        id: crypto.randomUUID(),
        sessionId: "TEMP",
        name,
        function: row["Function"],
        department: row["Department"],
        level: row["Level"],
        grade: row["Grade"],
        timeInCompany: row["TimeInCompany"],
        timeInJob: row["TimeInJob"],
        performance: row["Performance"],
        potential: row["Potential"],
        extra,
      });
    }
    setTalents(mapped);
  }

  async function onSetupGame() {
    if (!sessionName || rawRows.length === 0) return;
    if (!isSupabaseConfigured()) {
      alert("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.");
      return;
    }
    try {
      const base = typeof window !== "undefined" ? window.location.origin + (process.env.NEXT_PUBLIC_BASE_PATH || "") : "";
      const { invites } = await createGame({ sessionName, pickMode, pickValue, rawRows, players, baseUrl: base });
      setInvites(invites);
    } catch (e) {
      console.error(e);
      alert("Failed to setup game. Check console for details.");
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={sessionName} onChange={(e)=>setSessionName(e.target.value)} placeholder="e.g., Q1 Executive Draft" />
          </div>
          <div className="grid gap-1.5">
            <Label>Pick Mode</Label>
            <div className="flex gap-2">
              <Select value={pickMode} onChange={(v)=>setPickMode(v as any)}>
                <SelectItem value="percentage">Percentage</SelectItem>
                <SelectItem value="fixed">Fixed number</SelectItem>
              </Select>
              <Input type="number" min={1} value={pickValue} onChange={(e)=>setPickValue(Number(e.target.value)||0)} className="w-28" />
            </div>
            <p className="text-xs text-muted-foreground">Default 15%. Current quota from pool: <b>{computedQuota}</b></p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Talent Pool</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="flex items-center gap-2">
            <input type="file" accept=".csv" onChange={(e)=>{const f=e.target.files?.[0]; if (f) onCsvUpload(f);}} />
            <Button variant="secondary" onClick={onDownloadTemplate}>Download CSV Template</Button>
          </div>
          <p className="text-sm text-muted-foreground">Detected talents: {talents.length}. Showing all columns below.</p>
          {rawRows.length>0 && (
            <div className="max-h-80 overflow-auto border rounded-md">
              <Table>
                <THead>
                  <TR>
                    {rawHeaders.map((h) => (
                      <TH key={h}>{h}</TH>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {rawRows.map((row, i) => (
                    <TR key={i}>
                      {rawHeaders.map((h) => (
                        <TD key={h}>{row[h] || ""}</TD>
                      ))}
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
          <CardTitle>Players</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {!isSupabaseConfigured() && (
            <div className="text-sm text-destructive">Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.</div>
          )}
          <div className="flex items-center gap-2">
            <Label className="w-24">Count</Label>
            <Input type="number" min={1} value={playersCount} onChange={(e)=>setPlayersCount(Math.max(1, Number(e.target.value)||1))} className="w-28" />
          </div>
          <div className="overflow-auto border rounded-md">
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>First Name</TH>
                  <TH>Last Name</TH>
                  <TH>Email</TH>
                </TR>
              </THead>
              <TBody>
                {players.map((p, idx) => (
                  <TR key={idx}>
                    <TD className="w-10">{idx+1}</TD>
                    <TD><Input value={p.firstName} onChange={(e)=>{ const n=[...players]; n[idx] = { ...n[idx], firstName: e.target.value }; setPlayers(n); }} placeholder="Name" /></TD>
                    <TD><Input value={p.lastName} onChange={(e)=>{ const n=[...players]; n[idx] = { ...n[idx], lastName: e.target.value }; setPlayers(n); }} placeholder="Surname" /></TD>
                    <TD><Input value={p.email || ""} onChange={(e)=>{ const n=[...players]; n[idx] = { ...n[idx], email: e.target.value }; setPlayers(n); }} placeholder="Email (optional)" /></TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </div>
          <div className="flex gap-2">
            <Button onClick={onSetupGame} disabled={!sessionName || rawRows.length===0 || players.length===0}>Setup the Game</Button>
          </div>
          {invites && invites.length>0 && (
            <div className="mt-4">
              <div className="text-sm font-medium mb-2">Invite Links</div>
              <div className="overflow-auto border rounded-md">
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
                    {invites.map((inv, idx) => (
                      <TR key={inv.token}>
                        <TD className="w-10">{idx+1}</TD>
                        <TD>{inv.name}</TD>
                        <TD>{inv.email || "-"}</TD>
                        <TD><a className="text-blue-600 hover:underline" href={inv.link} target="_blank" rel="noreferrer">{inv.link}</a></TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

