"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadCsv } from "@/lib/utils";
import { scoreTalents } from "@/lib/scoring";
import type { PlayerSubmission, TalentScoreRow } from "@/lib/types";
import { fetchResultsByToken } from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function ResultsPage() {
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading results…</div>}>
      <ResultsPageInner />
    </Suspense>
  );
}

function ResultsPageInner() {
  const search = useSearchParams();
  const token = search.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionName, setSessionName] = useState<string | null>(null);
  const [talentRows, setTalentRows] = useState<TalentScoreRow[]>([]);

  useEffect(() => {
    async function load() {
      if (!token) {
        setError("Missing token in URL (?token=...)");
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const { session, talents, picks } = await fetchResultsByToken(token);
        setSessionName(session.name);

        // Convert raw picks into PlayerSubmission objects grouped by player_id
        const byPlayer = new Map<string, { sessionId: string; playerId: string; picks: { order: number; talentId: string }[] }>();
        for (const p of picks as Array<{ player_id: string; order: number; talent_id: string }>) {
          let entry = byPlayer.get(p.player_id);
          if (!entry) {
            entry = { sessionId: session.id, playerId: p.player_id, picks: [] };
            byPlayer.set(p.player_id, entry);
          }
          entry.picks.push({ order: p.order, talentId: p.talent_id });
        }

        const submissions: PlayerSubmission[] = Array.from(byPlayer.values()).map((g) => ({
          type: "PlayerSubmission",
          version: 1,
          sessionId: g.sessionId,
          player: { id: g.playerId, name: "" },
          picks: g.picks,
          submittedAt: 0,
        }));

        const rows = scoreTalents(talents as any, submissions);
        setTalentRows(rows);
      } catch (e: any) {
        console.error(e);
        setError(e?.message || "Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [token]);

  const rows = talentRows;

  function onExportCSV() {
    const header = ["Talent","TimesChosen","TotalPoints","AvgRanking"];
    const data = rows.map((r)=> [
      r.name,
      String(r.timesChosen),
      String(r.totalPoints),
      r.avgOrder == null ? "" : String(r.avgOrder),
    ]);
    downloadCsv("talent_results.csv", [header, ...data]);
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading results…</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  return (
    <div className="grid gap-6">
      {sessionName && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Talents Ranking {sessionName ? `– ${sessionName}` : ""}</CardTitle>
            <div className="flex gap-2">
              <Button onClick={onExportCSV} disabled={rows.length===0}>Export CSV</Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Talent</TH>
                  <TH>Times Chosen</TH>
                  <TH>Total Points</TH>
                  <TH>Avg Ranking</TH>
                </TR>
              </THead>
              <TBody>
                {rows.map((r, idx) => (
                  <TR key={r.talentId}>
                    <TD className="whitespace-nowrap">{r.name}</TD>
                    <TD>{r.timesChosen}</TD>
                    <TD>{r.totalPoints}</TD>
                    <TD>{r.avgOrder ?? "-"}</TD>
                  </TR>
                ))}
                {rows.length===0 && (
                  <TR>
                    <TD colSpan={4} className="text-muted-foreground">No results yet. Import session and submissions.</TD>
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
