import Dexie, { Table } from "dexie";
import type { PickItem, Player, Session, Submission, Talent } from "./types";

export class AppDB extends Dexie {
  sessions!: Table<Session, string>;
  talents!: Table<Talent, string>;
  players!: Table<Player, string>;
  picks!: Table<PickItem, string>;
  submissions!: Table<Submission, string>;

  constructor() {
    super("talentdraft-db");
    this.version(1).stores({
      sessions: "id, name, createdAt",
      talents: "id, sessionId, name",
      players: "id, sessionId, name",
      picks: "id, sessionId, playerId, order, talentId",
      submissions: "id, sessionId, playerId, submittedAt",
    });
  }
}

export const db = new AppDB();
