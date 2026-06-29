import type { SupabaseClient } from "@supabase/supabase-js";
import type { IVerificationEvidenceRepository, CreateEvidenceInput } from "../repositories/IVerificationEvidenceRepository";
import type { VerificationEvidenceRecord } from "../types/trust.types";

export class SupabaseVerificationEvidenceRepository implements IVerificationEvidenceRepository {
  constructor(private readonly client: SupabaseClient) {}

  async findByVerificationId(verificationId: string): Promise<VerificationEvidenceRecord[]> {
    const { data, error } = await this.client
      .from("verification_evidence")
      .select("*")
      .eq("verification_id", verificationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[EvidenceRepository.findByVerificationId]", error);
      return [];
    }
    return (data ?? []) as VerificationEvidenceRecord[];
  }

  async findActive(verificationId: string): Promise<VerificationEvidenceRecord[]> {
    const { data, error } = await this.client
      .from("verification_evidence")
      .select("*")
      .eq("verification_id", verificationId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[EvidenceRepository.findActive]", error);
      return [];
    }
    return (data ?? []) as VerificationEvidenceRecord[];
  }

  async create(input: CreateEvidenceInput): Promise<VerificationEvidenceRecord | null> {
    const { data, error } = await this.client
      .from("verification_evidence")
      .insert({
        verification_id: input.verification_id,
        merchant_id: input.merchant_id,
        evidence_type: input.evidence_type,
        label: input.label,
        content: input.content ?? null,
        file_path: input.file_path ?? null,
        mime_type: input.mime_type ?? null,
        file_size_bytes: input.file_size_bytes ?? null,
        uploaded_by: input.uploaded_by ?? null,
      })
      .select()
      .single();

    if (error) {
      console.error("[EvidenceRepository.create]", error);
      return null;
    }
    return data as VerificationEvidenceRecord;
  }

  async markValid(id: string, reviewNote?: string): Promise<VerificationEvidenceRecord | null> {
    const { data, error } = await this.client
      .from("verification_evidence")
      .update({ is_valid: true, review_note: reviewNote ?? null })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[EvidenceRepository.markValid]", error);
      return null;
    }
    return data as VerificationEvidenceRecord;
  }

  async markInvalid(id: string, reviewNote: string): Promise<VerificationEvidenceRecord | null> {
    const { data, error } = await this.client
      .from("verification_evidence")
      .update({ is_valid: false, review_note: reviewNote })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[EvidenceRepository.markInvalid]", error);
      return null;
    }
    return data as VerificationEvidenceRecord;
  }

  async softDelete(id: string): Promise<void> {
    const { error } = await this.client
      .from("verification_evidence")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      console.error("[EvidenceRepository.softDelete]", error);
    }
  }
}
