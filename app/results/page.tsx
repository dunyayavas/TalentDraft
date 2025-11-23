"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadCsv, fileToText } from "@/lib/utils";
import { scoreTalents } from "@/lib/scoring";
import type { PlayerSubmission, SessionConfig, TalentScoreRow } from "@/lib/types";

export default function ResultsPage() {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [subs, setSubs] = useState<PlayerSubmission[]>([]);

  const rows: TalentScoreRow[] = useMemo(() => {
    if (!config) return [];
    return scoreTalents(config.talents as any, subs);
  }, [config, subs]);

  async function onImportConfig(file: File) {
    try {
      const text = await fileToText(file);
      const data = JSON.parse(text);
      if (data?.type !== "SessionConfig") throw new Error("Invalid session config file");
      setConfig(data as SessionConfig);
    } catch (e) {
      alert("Failed to import Session Config JSON.");
      console.error(e);
    }
  }

  async function onImportSubmissions(files: FileList | null) {
    if (!files) return;
    const next: PlayerSubmission[] = [];
    for (const f of Array.from(files)) {
      try {
        const text = await fileToText(f);
        const data = JSON.parse(text);
        if (data?.type === "PlayerSubmission") next.push(data as PlayerSubmission);
      } catch (e) {
        console.warn("Skipping invalid submission file", f.name);
      }
    }
    setSubs(next);
  }

  function onExportCSV() {
    const header = ["Talent","CriticalityScore","Popularity","AvgOrder"];
    const data = rows.map((r)=> [r.name, String(r.criticalityScore), String(r.popularity), r.avgOrder==null?"":String(r.avgOrder)]);
    downloadCsv("talent_results.csv", [header, ...data]);
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Aggregate Results</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-1.5">
            <div className="text-sm font-medium">Session Config</div>
            <input type="file" accept="application/json" onChange={(e)=> onImportConfig(e.target.files?.[0] as File)} />
            {config && <div className="text-sm text-muted-foreground">Loaded: <b>{config.session.name}</b> • Pool: {config.talents.length}</div>}
          </div>
          <div className="grid gap-1.5">
            <div className="text-sm font-medium">Player Submissions</div>
            <input type="file" accept="application/json" multiple onChange={(e)=> onImportSubmissions(e.target.files)} />
            <div className="text-sm text-muted-foreground">Loaded submissions: {subs.length}</div>
          </div>
        </CardContent>
      </Card>

      {config && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Talents Ranking</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={()=>{setConfig(null); setSubs([]);}}>Reset</Button>
              <Button onClick={onExportCSV} disabled={rows.length===0}>Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>#</TH>
                  <TH>Talent</TH>
                  <TH>Criticality</TH>
                  <TH>Popularity</TH>
                  <TH>Avg Order</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r, idx) => (
                  <TR key={r.talentId}>
                    <TD className="w-12">{idx + 1}</TD>
                    <TD className="whitespace-nowrap">{r.name}</TD>
                    <TD>{r.criticalityScore}</TD>
                    <TD>{r.popularity}</TD>
                    <TD>{r.avgOrder ?? "-"}</TD>
                  </TR>
                ))}
                {rows.length===0 && (
                  <TR>
                    <TD colSpan={5} className="text-muted-foreground">No results yet. Import session and submissions.</TD>
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
