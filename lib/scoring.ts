import type { PlayerSubmission, Talent, TalentScoreRow } from "./types";

export function scoreTalents(talents: Talent[], submissions: PlayerSubmission[]): TalentScoreRow[] {
  const nameById = new Map<string, string>();
  talents.forEach((t) => nameById.set(t.id, t.name));

  const points = new Map<string, number>();
  const popularitySet = new Map<string, Set<string>>();
  const orderSum = new Map<string, number>();
  const orderCount = new Map<string, number>();

  for (const sub of submissions) {
    const N = sub.picks.length || 0;
    for (const pick of sub.picks) {
      const p = N + 1 - pick.order;
      points.set(pick.talentId, (points.get(pick.talentId) || 0) + p);
      if (!popularitySet.has(pick.talentId)) popularitySet.set(pick.talentId, new Set());
      popularitySet.get(pick.talentId)!.add(sub.player.id);
      orderSum.set(pick.talentId, (orderSum.get(pick.talentId) || 0) + pick.order);
      orderCount.set(pick.talentId, (orderCount.get(pick.talentId) || 0) + 1);
    }
  }

  const rows: TalentScoreRow[] = talents.map((t) => {
    const p = points.get(t.id) || 0;
    const pop = popularitySet.get(t.id)?.size || 0;
    const count = orderCount.get(t.id) || 0;
    const avg = count > 0 ? Number((orderSum.get(t.id)! / count).toFixed(2)) : null;
    return { talentId: t.id, name: t.name, criticalityScore: p, popularity: pop, avgOrder: avg };
  });

  rows.sort((a, b) => {
    if (b.criticalityScore !== a.criticalityScore) return b.criticalityScore - a.criticalityScore;
    if (b.popularity !== a.popularity) return b.popularity - a.popularity;
    // For avgOrder, lower is better; treat null as worse
    if (a.avgOrder == null && b.avgOrder == null) return 0;
    if (a.avgOrder == null) return 1;
    if (b.avgOrder == null) return -1;
    return a.avgOrder - b.avgOrder;
  });

  return rows;
}
