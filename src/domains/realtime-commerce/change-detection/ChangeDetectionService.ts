import type { IMarketChangeRepository } from "../repositories/IMarketChangeRepository";
import type { DetectChangesInput, MarketChange } from "../types";
import { ChangeDetector } from "./ChangeDetector";

/** Application-facing entry point for Epic 2 — wraps the pure ChangeDetector
 * with persistence. This is the only class outside consumers should call;
 * ChangeDetector stays pure and independently testable. */
export class ChangeDetectionService {
  private readonly detector = new ChangeDetector();

  constructor(private readonly repo: IMarketChangeRepository) {}

  async detectAndRecord(input: DetectChangesInput): Promise<MarketChange[]> {
    const changes = this.detector.detect(input);
    if (changes.length === 0) return [];
    return this.repo.insertMany(changes);
  }
}
