import type { SessionPayload, StoredSession } from "../types/analytics.types";

export interface ISessionRepository {
  create(payload: SessionPayload): Promise<StoredSession | null>;
  findById(sessionId: string): Promise<StoredSession | null>;
  touch(sessionId: string, exitPage?: string): Promise<void>;
  end(sessionId: string, exitPage: string): Promise<void>;
  countRecent(sinceMinutes: number): Promise<number>;
}
