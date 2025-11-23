"use client";

import { useEffect, useMemo, useState } from "react";
import { DndContext, DragEndEvent, PointerSensor, useDraggable, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem } from "@/components/ui/select";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { downloadJson, fileToText } from "@/lib/utils";
import type { PlayerSubmission, SessionConfig } from "@/lib/types";

interface PickState { talentId: string; rationale?: string }

export default function PlayPage() {
  const [config, setConfig] = useState<SessionConfig | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerEmail, setPlayerEmail] = useState("");
  const [pool, setPool] = useState<string[]>([]); // talent ids not picked
  const [picks, setPicks] = useState<PickState[]>([]); // ordered picks

  const sensors = useSensors(useSensor(PointerSensor));

  const N = useMemo(() => {
    if (!config) return 0;
    const total = config.talents.length;
    if (config.session.pickMode === "percentage") return Math.max(1, Math.ceil((total * config.session.pickValue) / 100));
    return Math.max(1, Math.min(total, Math.floor(config.session.pickValue)));
  }, [config]);

  useEffect(() => {
    if (!config) return;
    // initialize pool from config
    const ids = config.talents.map((t) => t.id);
    setPool(ids);
    setPicks([]);
  }, [config]);

  function idToName(id: string) {
    const t = config?.talents.find((x) => x.id === id);
    return t?.name || id;
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!config || !active) return;
    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;

    // Case 1: reorder within picks (active is a pick item id and over is pick item id)
    if (overId && picks.some((p) => p.talentId === activeId) && picks.some((p) => p.talentId === overId)) {
      const oldIndex = picks.findIndex((p) => p.talentId === activeId);
      const newIndex = picks.findIndex((p) => p.talentId === overId);
      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const copy = picks.slice();
        const [moved] = copy.splice(oldIndex, 1);
        copy.splice(newIndex, 0, moved);
        setPicks(copy.map((p, i) => ({ ...p })));
      }
      return;
    }

    // Case 2: drag from pool to picks
    if (activeId.startsWith("pool:")) {
      const talentId = activeId.slice(5);
      if (picks.some((p) => p.talentId === talentId)) return; // already picked
      if (picks.length >= N) return; // quota reached
      const insertIndex = overId && picks.some((p) => p.talentId === overId) ? picks.findIndex((p) => p.talentId === overId) : picks.length;
      const newPicks = picks.slice();
      newPicks.splice(insertIndex, 0, { talentId });
      setPicks(newPicks);
      setPool((prev) => prev.filter((id) => id !== talentId));
      return;
    }

    // Case 3: moving a pick back to pool if dropped over pool header (optional) – skip for MVP
  }

  function addByClick(id: string) {
    if (!config) return;
    if (picks.length >= N) return;
    if (picks.some((p) => p.talentId === id)) return;
    setPicks([...picks, { talentId: id }]);
    setPool(pool.filter((x) => x !== id));
  }

  function removePick(id: string) {
    const idx = picks.findIndex((p) => p.talentId === id);
    if (idx === -1) return;
    const copy = picks.slice();
    const [removed] = copy.splice(idx, 1);
    setPicks(copy);
    setPool((prev) => [...prev, removed.talentId]);
  }

  function onExportSubmission() {
    if (!config) return;
    const submission: PlayerSubmission = {
      type: "PlayerSubmission",
      version: 1,
      sessionId: config.session.id,
      player: { id: crypto.randomUUID(), name: playerName || "Anonymous", email: playerEmail || undefined },
      picks: picks.map((p, i) => ({ order: i + 1, talentId: p.talentId, rationale: p.rationale })),
      submittedAt: Date.now(),
    };
    downloadJson(`${slugify(config.session.name)}_${slugify(playerName || "player")}_submission.json`, submission);
  }

  async function onImportConfig(file: File) {
    try {
      const text = await fileToText(file);
      const data = JSON.parse(text);
      if (data?.type !== "SessionConfig") throw new Error("Invalid config file");
      setConfig(data as SessionConfig);
    } catch (e) {
      alert("Failed to import session config. Ensure you selected the right JSON.");
      console.error(e);
    }
  }

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Load Session</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label>Session Config JSON</Label>
            <input type="file" accept="application/json" onChange={(e)=>{const f=e.target.files?.[0]; if (f) onImportConfig(f);}} />
          </div>
          <div className="grid gap-1.5">
            <Label>Player</Label>
            <div className="flex gap-2">
              <Input placeholder="Name (optional)" value={playerName} onChange={(e)=>setPlayerName(e.target.value)} />
              <Input placeholder="Email (optional)" value={playerEmail} onChange={(e)=>setPlayerEmail(e.target.value)} />
            </div>
          </div>
          {config && (
            <div className="sm:col-span-2 text-sm text-muted-foreground">Session: <b>{config.session.name}</b> • Pool: {config.talents.length} • Picks allowed: {N}</div>
          )}
        </CardContent>
      </Card>

      {config && (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          <div className="grid gap-6 sm:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Talent Pool</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <THead>
                    <TR>
                      <TH>Name</TH>
                      <TH></TH>
                    </TR>
                  </THead>
                  <TBody>
                    {pool.map((id) => (
                      <TR key={id}>
                        <TD>{idToName(id)}</TD>
                        <TD className="text-right">
                          <div className="flex justify-end gap-2">
                            <DraggablePoolItem id={id} />
                            <Button size="sm" variant="outline" onClick={()=>addByClick(id)}>Add</Button>
                          </div>
                        </TD>
                      </TR>
                    ))}
                    {pool.length === 0 && (
                      <TR>
                        <TD colSpan={2} className="text-muted-foreground">Pool empty or all picked.</TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My Picks ({picks.length}/{N})</CardTitle>
              </CardHeader>
              <CardContent>
                <SortableContext items={picks.map((p)=>p.talentId)} strategy={verticalListSortingStrategy}>
                  <Table>
                    <THead>
                      <TR>
                        <TH>#</TH>
                        <TH>Talent</TH>
                        <TH>Rationale (optional)</TH>
                        <TH></TH>
                      </TR>
                    </THead>
                    <TBody>
                      {picks.map((p, idx) => (
                        <SortablePickRow key={p.talentId} id={p.talentId} index={idx} name={idToName(p.talentId)} rationale={p.rationale || ""} onRationale={(val)=>{
                          const copy = picks.slice();
                          copy[idx] = { ...copy[idx], rationale: val };
                          setPicks(copy);
                        }} onRemove={()=>removePick(p.talentId)} />
                      ))}
                      {picks.length===0 && (
                        <TR>
                          <TD colSpan={4} className="text-muted-foreground">Drag talents here or use Add to build your list.</TD>
                        </TR>
                      )}
                    </TBody>
                  </Table>
                </SortableContext>
                <div className="mt-4 flex gap-2">
                  <Button onClick={onExportSubmission} disabled={!config || picks.length===0}>Export Submission</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DndContext>
      )}
    </div>
  );
}

function DraggablePoolItem({ id }: { id: string }) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: `pool:${id}` });
  const style = { transform: CSS.Transform.toString(transform || null) } as React.CSSProperties;
  return (
    <button ref={setNodeRef} {...listeners} {...attributes} style={style} className="h-8 px-2 text-xs rounded-md border bg-background hover:bg-muted">
      Drag
    </button>
  );
}

function SortablePickRow({ id, index, name, rationale, onRationale, onRemove }: { id: string; index: number; name: string; rationale: string; onRationale: (v: string)=>void; onRemove: ()=>void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  } as React.CSSProperties;
  return (
    <TR ref={setNodeRef} style={style} {...attributes}>
      <TD className="w-10">
        <button {...listeners} className="cursor-grab text-xs rounded border px-2 py-1">::</button>
      </TD>
      <TD className="whitespace-nowrap">{name}</TD>
      <TD>
        <Input value={rationale} onChange={(e)=>onRationale(e.target.value)} placeholder="Why did you pick this talent?" />
      </TD>
      <TD className="text-right w-20">
        <Button size="sm" variant="outline" onClick={onRemove}>Remove</Button>
      </TD>
    </TR>
  );
}

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
