import type { SignalProvenanceRecord } from "../types/trust.types";

export interface ISignalProvenanceRepository {
  findBySignalId(signalId: string): Promise<SignalProvenanceRecord | null>;
  findByMerchantId(merchantId: string): Promise<SignalProvenanceRecord[]>;
  create(input: Omit<SignalProvenanceRecord, "id" | "created_at">): Promise<SignalProvenanceRecord | null>;
}
