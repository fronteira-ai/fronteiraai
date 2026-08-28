/**
 * Merchant Feed Platform — merchant authorization record (PART G §34).
 *
 * Registro interno SIMPLES de autorização de um lojista para permitir que o
 * ParaguAI use o feed dele. NÃO inventa autorização: só o operador, com
 * evidência real de consentimento do lojista, preenche o campo authorized_by.
 *
 * Regra dura: `authorizationRecord.canOnboard === true` APENAS se houver
 * authorized_by, authorization_date e source_url válidos + status "ACTIVE".
 * Uma URL que apenas "valida" NÃO autoriza ativação (activation gate, §18).
 */

export type MerchantAuthorizationStatus = "ACTIVE" | "PENDING_LEGAL" | "REVOKED";

export interface MerchantAuthorizationRecord {
  merchantSlug: string;
  /** Quem no ParaguAI obteve o consentimento (nome/referência do operador). */
  authorizedBy: string;
  authorizationDate: string; // ISO date
  sourceUrl: string;
  /** Uso permitido: ex. "display_offers", "price_history", "catalog". */
  allowedUsage: string[];
  contactReference?: string;
  status: MerchantAuthorizationStatus;
  /** Termos/fichas de origem: registrar referência da conversa/proposta. */
  evidenceReference?: string;
}

/**
 * Valida o registro de autorização de forma estrita. Retorna true APENAS quando
 * há autorização plena. Sem authorizedBy/date/sourceUrl válidos → false.
 */
export function canOnboardMerchant(a: MerchantAuthorizationRecord | null | undefined): boolean {
  if (!a) return false;
  if (a.status !== "ACTIVE") return false;
  if (!a.authorizedBy?.trim()) return false;
  if (!a.authorizationDate) return false;
  if (!isValidSourceUrl(a.sourceUrl)) return false;
  const d = new Date(a.authorizationDate);
  if (Number.isNaN(d.getTime())) return false;
  if (d.getTime() > Date.now() + 1000 * 60 * 60 * 24) return false; // não futuro
  return true;
}

export function isValidSourceUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^https?:$/.test(u.protocol);
  } catch {
    return false;
  }
}
