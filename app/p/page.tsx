"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchGameByToken, savePlayerPicks } from "@/lib/supabaseService";
import { isSupabaseConfigured } from "@/lib/supabaseClient";

export default function PlayerPage() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const sensors = useSensors(useSensor(PointerSensor));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ id: string; name: string; pick_mode: "percentage" | "fixed"; pick_value: number } | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [talents, setTalents] = useState<Array<{ id: string; name: string }>>([]);
  const [slots, setSlots] = useState<Array<{ talentId: string; rationale?: string } | null>>([]);

  const N = useMemo(() => {
    if (!session) return 0;
    const total = talents.length;
    if (session.pick_mode === "percentage") return Math.max(1, Math.ceil((total * session.pick_value) / 100));
    return Math.max(1, Math.min(total, Math.floor(session.pick_value)));
  }, [session, talents.length]);

  useEffect(() => {
    async function init() {
      if (!token) {
        setError("Missing token in URL (?token=...) ");
        setLoading(false);
        return;
      }
      if (!isSupabaseConfigured()) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }
      try {
        const data = await fetchGameByToken(token);
        setSession(data.session);
        setPlayer(data.player);
        setTalents((data.talents || []).map((t: any) => ({ id: t.id, name: t.name })));
        const total = (data.talents || []).length;
        let quota = data.session.pick_mode === "percentage" ? Math.max(1, Math.ceil((total * data.session.pick_value) / 100)) : Math.max(1, Math.min(total, Math.floor(data.session.pick_value)));
        const initial = new Array(quota).fill(null) as Array<{ talentId: string; rationale?: string } | null>;
        if (data.picks && Array.isArray(data.picks)) {
          for (const p of data.picks) {
            const idx = (p.order || 1) - 1;
            if (idx >= 0 && idx < initial.length) initial[idx] = { talentId: p.talent_id, rationale: p.rationale || "" };
          }
        }
        setSlots(initial);
      } catch (e: any) {
        setError(e?.message || "Failed to load game");
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [token]);

  useEffect(() => {
    if (N === 0) return;
    setSlots((prev) => {
      const next = prev.slice(0, N);
      while (next.length < N) next.push(null);
      return next;
    });
  }, [N]);

  const pickedIds = useMemo(() => new Set(slots.filter(Boolean).map((s) => (s as any).talentId)), [slots]);
  const pool = useMemo(() => talents.filter((t) => !pickedIds.has(t.id)), [talents, pickedIds]);
  const idToName = useMemo(() => (id: string) => {
    const t = talents.find((x) => x.id === id);
    return t?.name || id;
  }, [talents]);

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) return;
    const a = String(active.id);
    const o = String(over.id);
    if (!o.startsWith("slot:")) return;
    const targetIndex = parseInt(o.slice(5), 10);

    if (a.startsWith("talent:")) {
      const talentId = a.slice(7);
      setSlots((prev) => {
        const next = prev.map((s) => (s && s.talentId === talentId ? null : s));
        const replaced = next[targetIndex];
        next[targetIndex] = { talentId, rationale: replaced?.rationale || "" };
        return [...next];
      });
      return;
    }

    if (a.startsWith("slot:")) {
      const fromIndex = parseInt(a.slice(5), 10);
      if (fromIndex === targetIndex) return;
      setSlots((prev) => {
        const next = [...prev];
        const tmp = next[fromIndex];
        next[fromIndex] = next[targetIndex];
        next[targetIndex] = tmp;
        return next;
      });
    }
  }

  async function onSave() {
    if (!session || !player) return;
    const picks = slots
      .map((s, i) => (s ? { order: i + 1, talent_id: s.talentId, rationale: s.rationale || undefined } : null))
      .filter(Boolean) as Array<{ order: number; talent_id: string; rationale?: string }>;
    try {
      await savePlayerPicks(session.id, player.id, picks);
      alert("Saved");
    } catch (e) {
      console.error(e);
      alert("Failed to save");
    }
  }

  if (loading) return <div className="text-sm text-muted-foreground">Loading game…</div>;
  if (error) return <div className="text-sm text-destructive">{error}</div>;

  return (
    <DndContext sensors={sensors} onDragEnd={onDragEnd}>
      <div className="grid gap-6 sm:grid-cols-3">
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardTitle>Talent Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              <Table>
                <THead>
                  <TR>
                    <TH>Talent</TH>
                  </TR>
                </THead>
                <TBody>
                  {pool.map((t) => (
                    <DraggablePoolRow key={t.id} id={t.id} name={t.name} />
                  ))}
                  {pool.length === 0 && (
                    <TR>
                      <TD className="text-muted-foreground">All picked.</TD>
                    </TR>
                  )}
                </TBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>My Picks ({slots.filter(Boolean).length}/{N})</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setSlots((prev) => prev.map(() => null))}>Clear</Button>
              <Button onClick={onSave}>Save</Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh]">
              <div className="grid gap-3">
                {slots.map((s, idx) => (
                  <PickSlot key={idx} index={idx} value={s} displayName={s ? idToName(s.talentId) : undefined} onChange={(val) => {
                    setSlots((prev) => {
                      const next = [...prev];
                      next[idx] = val;
                      return next;
                    });
                  }} />
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </DndContext>
  );
}

function DraggablePoolRow({ id, name }: { id: string; name: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `talent:${id}` });
  const style = { transform: CSS.Transform.toString(transform || null) } as React.CSSProperties;
  return (
    <TR ref={setNodeRef} {...attributes} {...listeners} style={style} className="cursor-grab select-none">
      <TD className="py-2">{name}</TD>
    </TR>
  );
}

function PickSlot({ index, value, displayName, onChange }: { index: number; value: { talentId: string; rationale?: string } | null; displayName?: string; onChange: (v: { talentId: string; rationale?: string } | null) => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${index}` });
  const highlight = isOver ? "ring-2 ring-blue-500" : "";

  return (
    <div ref={setNodeRef} className={`rounded-md border p-3 ${highlight}`}>
      <div className="text-xs text-muted-foreground mb-2">#{index + 1}</div>
      {value ? (
        <DraggablePickCard index={index} value={value} displayName={displayName || value.talentId} onRemove={() => onChange(null)} onRationale={(r) => onChange({ ...value, rationale: r })} />
      ) : (
        <div className="h-10 text-sm text-muted-foreground flex items-center">Drop talent here</div>
      )}
    </div>
  );
}

function DraggablePickCard({ index, value, displayName, onRemove, onRationale }: { index: number; value: { talentId: string; rationale?: string }; displayName: string; onRemove: () => void; onRationale: (r: string) => void }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `slot:${index}` });
  const style = { transform: CSS.Transform.toString(transform || null) } as React.CSSProperties;
  return (
    <div ref={setNodeRef} {...attributes} {...listeners} style={style} className="flex items-center gap-2">
      <div className="flex-1">
        <div className="font-medium text-sm">{displayName}</div>
        <Label className="text-xs">Rationale (optional)</Label>
        <Input value={value.rationale || ""} onChange={(e) => onRationale(e.target.value)} placeholder="Why?" />
      </div>
      <Button size="sm" variant="outline" onClick={onRemove}>Remove</Button>
    </div>
  );
}
