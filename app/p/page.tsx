"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DndContext, DragEndEvent, DragStartEvent, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
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
  return (
    <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
      <PlayerPageInner />
    </Suspense>
  );
}

function PlayerPageInner() {
  const search = useSearchParams();
  const token = search.get("token") || "";
  const sensors = useSensors(useSensor(PointerSensor));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ id: string; name: string; pick_mode: "percentage" | "fixed"; pick_value: number } | null>(null);
  const [player, setPlayer] = useState<any>(null);
  const [talents, setTalents] = useState<Array<{ id: string; name: string; func?: string | null }>>([]);
  const [slots, setSlots] = useState<Array<{ talentId: string; rationale?: string } | null>>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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

  function getActiveLabel() {
    if (!activeId) return null;
    if (activeId.startsWith("talent:")) {
      const id = activeId.slice(7);
      return idToDisplay(id);
    }
    if (activeId.startsWith("slot:")) {
      const idx = parseInt(activeId.slice(5), 10);
      const slot = slots[idx];
      if (!slot) return null;
      return idToDisplay(slot.talentId);
    }
    return null;
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
        setTalents((data.talents || []).map((t: any) => ({ id: t.id, name: t.name, func: (t as any).function || null })));
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
  const idToDisplay = useMemo(() => (id: string) => {
    const t = talents.find((x) => x.id === id);
    if (!t) return id;
    return t.func ? `${t.name} — ${t.func}` : t.name;
  }, [talents]);

  function getActiveLabel() {
    if (!activeId) return null;
    if (activeId.startsWith("talent:")) {
      const id = activeId.slice(7);
      return idToDisplay(id);
    }
    if (activeId.startsWith("slot:")) {
      const idx = parseInt(activeId.slice(5), 10);
      const slot = slots[idx];
      if (!slot) return null;
      return idToDisplay(slot.talentId);
    }
    return null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
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
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-6 sm:grid-cols-3 overflow-hidden">
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardTitle>Talent Pool</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[70vh] overflow-x-hidden">
              <div className="grid gap-2">
                {pool.map((t) => (
                  <DraggablePoolCard key={t.id} id={t.id} name={t.name} func={t.func || undefined} />
                ))}
                {pool.length === 0 && (
                  <div className="text-sm text-muted-foreground">All picked.</div>
                )}
              </div>
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
            <ScrollArea className="h-[70vh] overflow-x-hidden">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {slots.map((s, idx) => (
                  <PickSlot key={idx} index={idx} value={s} displayName={s ? idToDisplay(s.talentId) : undefined} onChange={(val) => {
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
      <DragOverlay>
        {activeId && (
          <div className="rounded-md border bg-muted px-3 py-2 text-xs shadow-md">
            {getActiveLabel()}
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function DraggablePoolCard({ id, name, func }: { id: string; name: string; func?: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `talent:${id}` });
  const style = { transform: CSS.Transform.toString(transform || null) } as React.CSSProperties;
  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="cursor-grab select-none rounded-md border px-3 py-2 bg-background hover:bg-muted text-left"
    >
      <div className="text-sm font-medium leading-tight">{name}</div>
      {func && <div className="text-xs text-muted-foreground mt-0.5">{func}</div>}
    </div>
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
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `slot:${index}` });
  const style = { transform: CSS.Transform.toString(transform || null) } as React.CSSProperties;
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value.rationale || "");

  function onSaveClick() {
    onRationale(draft.trim());
    setOpen(false);
  }

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`relative flex items-start gap-2 rounded-md border px-3 py-2 ${isDragging ? "bg-muted" : "bg-background"}`}
    >
      <div className="flex-1">
        <div className="font-medium text-sm mb-1 leading-tight">{displayName}</div>
        {value.rationale && (
          <div className="text-xs text-muted-foreground line-clamp-2">{value.rationale}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-7 text-xs"
            onClick={() => {
              setDraft(value.rationale || "");
              setOpen((prev) => !prev);
            }}
            aria-label={value.rationale ? "Edit rationale" : "Add rationale"}
          >
            +
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-7 text-xs text-destructive border-destructive/50"
            onClick={onRemove}
            aria-label="Remove pick"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true">
              <path
                d="M9 3h6a1 1 0 0 1 .96.73L16.78 5H20a1 1 0 1 1 0 2h-1.1l-.74 11.1A2 2 0 0 1 16.17 20H7.83a2 2 0 0 1-1.99-1.9L5.1 7H4a1 1 0 0 1 0-2h3.22l.82-1.27A1 1 0 0 1 9 3Zm6.9 4H8.1l.7 10.4a.5.5 0 0 0 .5.46h5.4a.5.5 0 0 0 .5-.46L15.9 7ZM10 9a1 1 0 0 1 .99.88L11 10v6a1 1 0 0 1-1.99.12L9 16v-6a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 .99.88L15 10v6a1 1 0 0 1-1.99.12L13 16v-6a1 1 0 0 1 1-1Z"
                fill="currentColor"
              />
            </svg>
          </Button>
        </div>
        {open && (
          <div className="absolute right-0 top-full mt-1 w-56 rounded-md border bg-background p-2 shadow-md z-10">
            <Label className="text-xs mb-1 block">Rationale</Label>
            <textarea
              className="w-full rounded-md border px-2 py-1 text-xs bg-background"
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onPointerDown={(e) => e.stopPropagation()}
            />
            <div className="mt-2 flex justify-end gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveClick();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
