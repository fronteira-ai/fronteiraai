import type { ISessionRepository } from "../repositories/ISessionRepository";
import type { SessionPayload, StoredSession } from "../types/analytics.types";

export class SessionService {
  constructor(private readonly sessionRepo: ISessionRepository) {}

  async createSession(payload: SessionPayload): Promise<StoredSession | null> {
    if (!payload.anonymous_id || payload.anonymous_id.length > 128) {
      return null;
    }
    return this.sessionRepo.create(payload);
  }

  async getSession(sessionId: string): Promise<StoredSession | null> {
    if (!sessionId) return null;
    return this.sessionRepo.findById(sessionId);
  }

  async endSession(sessionId: string, exitPage: string): Promise<void> {
    if (!sessionId) return;
    await this.sessionRepo.end(sessionId, exitPage);
  }
}
