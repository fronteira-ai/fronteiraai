import type { SupabaseClient } from "@supabase/supabase-js";
import type { ISessionRepository } from "../repositories/ISessionRepository";
import type { SessionPayload, StoredSession } from "../types/analytics.types";

export class SupabaseSessionRepository implements ISessionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async create(payload: SessionPayload): Promise<StoredSession | null> {
    const { data, error } = await this.client
      .from("buyer_sessions")
      .insert({
        buyer_id: payload.buyer_id ?? null,
        anonymous_id: payload.anonymous_id,
        device_type: payload.device_type ?? null,
        browser: payload.browser ?? null,
        country: payload.country ?? null,
        city: payload.city ?? null,
        language: payload.language ?? null,
        entry_page: payload.entry_page ?? null,
        event_count: 0,
        started_at: new Date().toISOString(),
        last_event_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[SupabaseSessionRepository.create]", error.message);
      return null;
    }
    return data as unknown as StoredSession;
  }

  async findById(sessionId: string): Promise<StoredSession | null> {
    const { data, error } = await this.client
      .from("buyer_sessions")
      .select("*")
      .eq("id", sessionId)
      .maybeSingle();

    if (error) {
      console.error("[SupabaseSessionRepository.findById]", error.message);
      return null;
    }
    return data as unknown as StoredSession | null;
  }

  async touch(sessionId: string, exitPage?: string): Promise<void> {
    const fields: Record<string, unknown> = {
      last_event_at: new Date().toISOString(),
    };
    if (exitPage) fields.exit_page = exitPage;

    await this.client
      .from("buyer_sessions")
      .update(fields)
      .eq("id", sessionId);
  }

  async end(sessionId: string, exitPage: string): Promise<void> {
    const session = await this.findById(sessionId);
    if (!session) return;

    const durationSeconds = Math.floor(
      (Date.now() - new Date(session.started_at).getTime()) / 1000
    );

    await this.client
      .from("buyer_sessions")
      .update({
        ended_at: new Date().toISOString(),
        exit_page: exitPage,
        duration_seconds: durationSeconds,
        last_event_at: new Date().toISOString(),
      })
      .eq("id", sessionId);
  }

  async countRecent(sinceMinutes: number): Promise<number> {
    const since = new Date(Date.now() - sinceMinutes * 60 * 1000);
    const { count, error } = await this.client
      .from("buyer_sessions")
      .select("id", { count: "exact", head: true })
      .gte("started_at", since.toISOString());

    if (error) return 0;
    return count ?? 0;
  }
}
