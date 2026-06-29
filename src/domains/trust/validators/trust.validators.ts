import { TrustStatus, TrustBadge, VerificationType, TrustEventType, TrustSource } from "../types/enums";

// ── Result type ──────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function ok(): ValidationResult {
  return { valid: true, errors: [] };
}

function fail(...errors: string[]): ValidationResult {
  return { valid: false, errors };
}

// ── Trust status transitions ─────────────────────────────────────────────────

const VALID_STATUS_TRANSITIONS: Record<TrustStatus, TrustStatus[]> = {
  [TrustStatus.Unverified]: [TrustStatus.Pending, TrustStatus.Rejected],
  [TrustStatus.Pending]: [TrustStatus.Verified, TrustStatus.Rejected, TrustStatus.Unverified],
  [TrustStatus.Verified]: [TrustStatus.Suspended, TrustStatus.Unverified],
  [TrustStatus.Suspended]: [TrustStatus.Verified, TrustStatus.Rejected],
  [TrustStatus.Rejected]: [TrustStatus.Pending],
};

export function validateStatusTransition(
  from: TrustStatus,
  to: TrustStatus
): ValidationResult {
  const allowed = VALID_STATUS_TRANSITIONS[from] ?? [];
  if (!allowed.includes(to)) {
    return fail(`Transição inválida: ${from} → ${to}. Permitidas: ${allowed.join(", ")}`);
  }
  return ok();
}

// ── Trust score ──────────────────────────────────────────────────────────────

export function validateTrustScore(score: number): ValidationResult {
  if (!Number.isInteger(score)) return fail("Trust score deve ser inteiro");
  if (score < 0 || score > 100) return fail("Trust score deve estar entre 0 e 100");
  return ok();
}

// ── Badge constraints ────────────────────────────────────────────────────────

const BADGE_REQUIRES_STATUS: Record<TrustBadge, TrustStatus[]> = {
  [TrustBadge.None]: [TrustStatus.Unverified, TrustStatus.Pending, TrustStatus.Rejected, TrustStatus.Suspended],
  [TrustBadge.Basic]: [TrustStatus.Verified, TrustStatus.Unverified],
  [TrustBadge.Verified]: [TrustStatus.Verified],
  [TrustBadge.Premium]: [TrustStatus.Verified],
};

export function validateBadgeForStatus(
  badge: TrustBadge,
  status: TrustStatus
): ValidationResult {
  const allowed = BADGE_REQUIRES_STATUS[badge] ?? [];
  if (!allowed.includes(status)) {
    return fail(
      `Badge "${badge}" não pode ser concedido a merchant com status "${status}". ` +
      `Requer: ${allowed.join(", ")}`
    );
  }
  return ok();
}

// ── Verification ─────────────────────────────────────────────────────────────

export function validateVerificationType(type: string): ValidationResult {
  const valid = Object.values(VerificationType) as string[];
  if (!valid.includes(type)) {
    return fail(`Tipo de verificação inválido: "${type}". Válidos: ${valid.join(", ")}`);
  }
  return ok();
}

export function validateRejectionReason(reason: string | undefined): ValidationResult {
  if (!reason || reason.trim().length === 0) {
    return fail("Motivo de rejeição obrigatório ao rejeitar verificação");
  }
  if (reason.trim().length > 500) {
    return fail("Motivo de rejeição deve ter no máximo 500 caracteres");
  }
  return ok();
}

// ── Event input ──────────────────────────────────────────────────────────────

export function validateEventInput(input: {
  merchant_id?: string;
  event_type?: string;
  source?: string;
}): ValidationResult {
  const errors: string[] = [];

  if (!input.merchant_id || input.merchant_id.trim() === "") {
    errors.push("merchant_id é obrigatório");
  }

  const validTypes = Object.values(TrustEventType) as string[];
  if (!input.event_type || !validTypes.includes(input.event_type)) {
    errors.push(`event_type inválido. Válidos: ${validTypes.join(", ")}`);
  }

  const validSources = Object.values(TrustSource) as string[];
  if (!input.source || !validSources.includes(input.source)) {
    errors.push(`source inválido. Válidos: ${validSources.join(", ")}`);
  }

  return errors.length > 0 ? fail(...errors) : ok();
}

// ── Verification POST body ────────────────────────────────────────────────────

export function validateVerificationBody(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") return fail("Body inválido");
  const b = body as Record<string, unknown>;
  if (!b.verification_type) return fail("verification_type é obrigatório");
  return validateVerificationType(String(b.verification_type));
}
