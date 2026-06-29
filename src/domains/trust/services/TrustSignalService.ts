import type { ITrustSignalRepository } from "../repositories/ITrustSignalRepository";
import type { ISignalProvenanceRepository } from "../repositories/ISignalProvenanceRepository";
import type { IMerchantTimelineRepository } from "../repositories/IMerchantTimelineRepository";
import type { TrustSignalRecord, PaginatedResult, PaginationOptions } from "../types/trust.types";
import {
  TrustSignalType,
  TrustSignalStatus,
  TrustSignalCategory,
  SignalTrustLevel,
  VerificationType,
  TimelineEventType,
  TimelineEventCategory,
  TimelineVisibility,
} from "../types/enums";
import type { MerchantVerificationRecord } from "../types/trust.types";

const VERIFICATION_TO_SIGNAL: Partial<Record<VerificationType, TrustSignalType>> = {
  [VerificationType.Company]: TrustSignalType.CompanyVerified,
  [VerificationType.Identity]: TrustSignalType.IdentityValidated,
  [VerificationType.Location]: TrustSignalType.LocationConfirmed,
  [VerificationType.Contact]: TrustSignalType.ContactConfirmed,
  [VerificationType.Hours]: TrustSignalType.HoursConfirmed,
  [VerificationType.Partner]: TrustSignalType.OfficialPartner,
  [VerificationType.Documentation]: TrustSignalType.DocumentationVerified,
  [VerificationType.Operation]: TrustSignalType.RecurringOperation,
  [VerificationType.Document]: TrustSignalType.DocumentVerified,
  [VerificationType.Address]: TrustSignalType.AddressVerified,
  [VerificationType.Phone]: TrustSignalType.PhoneVerified,
  [VerificationType.Email]: TrustSignalType.EmailVerified,
  [VerificationType.Bank]: TrustSignalType.BankVerified,
  [VerificationType.SocialMedia]: TrustSignalType.SocialMediaVerified,
  [VerificationType.Manual]: TrustSignalType.ManualVerified,
};

const SIGNAL_LABELS: Record<TrustSignalType, { title: string; description: string; category: TrustSignalCategory; sort: number }> = {
  [TrustSignalType.CompanyVerified]: { title: "Empresa Verificada", description: "CNPJ ou registro empresarial confirmado.", category: TrustSignalCategory.Business, sort: 1 },
  [TrustSignalType.IdentityValidated]: { title: "Identidade Validada", description: "Identidade do responsável confirmada.", category: TrustSignalCategory.Identity, sort: 2 },
  [TrustSignalType.LocationConfirmed]: { title: "Localização Confirmada", description: "Endereço físico verificado.", category: TrustSignalCategory.Operational, sort: 3 },
  [TrustSignalType.ContactConfirmed]: { title: "Contato Confirmado", description: "Canais de contato validados.", category: TrustSignalCategory.Operational, sort: 4 },
  [TrustSignalType.HoursConfirmed]: { title: "Horário Confirmado", description: "Horário de funcionamento verificado.", category: TrustSignalCategory.Operational, sort: 5 },
  [TrustSignalType.OfficialPartner]: { title: "Parceiro Oficial", description: "Parceria com marca ou distribuidor confirmada.", category: TrustSignalCategory.Compliance, sort: 6 },
  [TrustSignalType.DocumentationVerified]: { title: "Documentação Conferida", description: "Documentação completa revisada pela equipe.", category: TrustSignalCategory.Compliance, sort: 7 },
  [TrustSignalType.RecurringOperation]: { title: "Operação Recorrente", description: "Histórico de atividade contínua confirmado.", category: TrustSignalCategory.Business, sort: 8 },
  [TrustSignalType.DocumentVerified]: { title: "Documento Verificado", description: "Documento submetido e validado.", category: TrustSignalCategory.Identity, sort: 9 },
  [TrustSignalType.AddressVerified]: { title: "Endereço Verificado", description: "Endereço validado.", category: TrustSignalCategory.Operational, sort: 10 },
  [TrustSignalType.PhoneVerified]: { title: "Telefone Verificado", description: "Número de telefone confirmado.", category: TrustSignalCategory.Operational, sort: 11 },
  [TrustSignalType.EmailVerified]: { title: "E-mail Verificado", description: "Endereço de e-mail confirmado.", category: TrustSignalCategory.Operational, sort: 12 },
  [TrustSignalType.BankVerified]: { title: "Dados Bancários Verificados", description: "Conta bancária confirmada.", category: TrustSignalCategory.Compliance, sort: 13 },
  [TrustSignalType.SocialMediaVerified]: { title: "Redes Sociais Verificadas", description: "Presença digital confirmada.", category: TrustSignalCategory.Business, sort: 14 },
  [TrustSignalType.ManualVerified]: { title: "Verificação Manual", description: "Revisão manual pela equipe ParaguAI.", category: TrustSignalCategory.Compliance, sort: 15 },
};

export class TrustSignalService {
  constructor(
    private readonly signalRepository: ITrustSignalRepository,
    private readonly provenanceRepository: ISignalProvenanceRepository,
    private readonly timelineRepository?: IMerchantTimelineRepository
  ) {}

  async getActiveSignals(merchantId: string): Promise<TrustSignalRecord[]> {
    return this.signalRepository.findActiveByMerchantId(merchantId);
  }

  async getSignals(merchantId: string, options?: PaginationOptions): Promise<PaginatedResult<TrustSignalRecord>> {
    return this.signalRepository.findByMerchantId(merchantId, options);
  }

  async getSignalById(id: string): Promise<TrustSignalRecord | null> {
    return this.signalRepository.findById(id);
  }

  async createFromVerification(
    verification: MerchantVerificationRecord,
    adminId: string,
    evidenceSummary: string = ""
  ): Promise<TrustSignalRecord | null> {
    const signalType = VERIFICATION_TO_SIGNAL[verification.verification_type];
    if (!signalType) return null;

    // Upsert: revoke existing signal for same type, then create new
    const existing = await this.signalRepository.findByVerificationId(verification.id);
    if (existing) {
      await this.signalRepository.updateStatus(existing.id, TrustSignalStatus.Revoked);
    }

    const meta = SIGNAL_LABELS[signalType];
    const signal = await this.signalRepository.create({
      merchant_id: verification.merchant_id,
      signal_type: signalType,
      status: TrustSignalStatus.Active,
      category: meta.category,
      title: meta.title,
      description: meta.description,
      evidence_summary: evidenceSummary,
      source: "admin",
      sort_order: meta.sort,
      issued_at: new Date().toISOString(),
      expires_at: verification.expires_at,
      is_public: true,
      verification_id: verification.id,
      metadata: { verification_type: verification.verification_type },
    });

    if (!signal) return null;

    await this.provenanceRepository.create({
      signal_id: signal.id,
      merchant_id: verification.merchant_id,
      generated_by: adminId,
      verification_id: verification.id,
      evidence_summary: evidenceSummary,
      how_obtained: `Verificação do tipo '${verification.verification_type}' aprovada por administrador.`,
      approved_by: adminId,
      trust_level: SignalTrustLevel.High,
      is_auditable: true,
      notes: null,
    });

    if (this.timelineRepository) {
      await this.timelineRepository.create({
        merchant_id: verification.merchant_id,
        event_type: TimelineEventType.TrustSignalActivated,
        title: meta.title,
        description: `Sinal de confiança '${meta.title}' ativado.`,
        category: TimelineEventCategory.Verification,
        reference_id: signal.id,
        reference_type: "trust_signal",
        visibility: TimelineVisibility.Public,
        occurred_at: new Date().toISOString(),
        metadata: { signal_type: signalType, verification_id: verification.id },
      });
    }

    return signal;
  }

  async revokeSignal(id: string, adminId: string): Promise<TrustSignalRecord | null> {
    const signal = await this.signalRepository.findById(id);
    if (!signal) return null;

    const updated = await this.signalRepository.updateStatus(id, TrustSignalStatus.Revoked);

    if (updated && this.timelineRepository) {
      const meta = SIGNAL_LABELS[signal.signal_type as TrustSignalType];
      await this.timelineRepository.create({
        merchant_id: signal.merchant_id,
        event_type: TimelineEventType.TrustSignalRevoked,
        title: `${meta?.title ?? signal.signal_type} revogado`,
        description: `Sinal de confiança revogado por administrador.`,
        category: TimelineEventCategory.Verification,
        reference_id: id,
        reference_type: "trust_signal",
        visibility: TimelineVisibility.Public,
        occurred_at: new Date().toISOString(),
        metadata: { revoked_by: adminId },
      });
    }

    return updated;
  }

  getLabelForType(signalType: TrustSignalType): string {
    return SIGNAL_LABELS[signalType]?.title ?? signalType;
  }
}
