export type PickMode = "percentage" | "fixed";

export interface Session {
  id: string;
  name: string;
  pickMode: PickMode;
  pickValue: number; // percentage if pickMode=percentage, else fixed number
  createdAt: number;
  version: number;
}

export interface Talent {
  id: string; // generated UUID or from CSV
  sessionId: string;
  name: string;
  // Optional known columns; keep map for extras
  function?: string;
  department?: string;
  level?: string;
  grade?: string;
  timeInCompany?: string;
  timeInJob?: string;
  performance?: string;
  potential?: string;
  extra?: Record<string, string | number | null>;
}

export interface Player {
  id: string;
  sessionId: string;
  name: string;
  email?: string;
}

export interface PickItem {
  id: string; // pick id
  sessionId: string;
  playerId: string;
  order: number; // 1..N
  talentId: string;
  rationale?: string;
}

export interface Submission {
  id: string;
  sessionId: string;
  playerId: string;
  submittedAt: number;
}

// Shareable JSON artifacts
export interface SessionConfig {
  type: "SessionConfig";
  version: number;
  session: Session;
  talents: Omit<Talent, "sessionId">[];
}

export interface PlayerSubmission {
  type: "PlayerSubmission";
  version: number;
  sessionId: string;
  player: { id: string; name: string; email?: string };
  picks: Array<{ order: number; talentId: string; rationale?: string }>;
  submittedAt: number;
}

export interface TalentScoreRow {
  talentId: string;
  name: string;
  criticalityScore: number;
  popularity: number; // number of players who picked
  avgOrder: number | null; // null if never picked
}
