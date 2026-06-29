import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseVerificationEvidenceRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationEvidenceRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { VerificationAuditService } from "@/src/domains/trust/services/VerificationAuditService";
import { VerificationEvidenceService } from "@/src/domains/trust/services/VerificationEvidenceService";
import { EvidenceType } from "@/src/domains/trust/types/enums";

type Params = { merchantId: string; verificationId: string };

function buildEvidenceService(): VerificationEvidenceService {
  const client = getSupabaseServiceClient();
  const evidenceRepo = new SupabaseVerificationEvidenceRepository(client);
  const historyRepo = new SupabaseVerificationHistoryRepository(client);
  const auditService = new VerificationAuditService(historyRepo);
  return new VerificationEvidenceService(evidenceRepo, auditService);
}

// GET — list active evidence for a verification
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { merchantId, verificationId } = await params;

  const merchantAuth = await requireMerchant();
  const adminAuth = await requireAdmin();
  const isAdmin = !isAuthError(adminAuth);
  const isMerchant = !isMerchantAuthError(merchantAuth);

  if (!isMerchant && !isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  if (isMerchant && !isAdmin) {
    const auth = merchantAuth as { merchant: { id: string } };
    if (auth.merchant?.id !== merchantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
  }

  const evidenceService = buildEvidenceService();
  const evidence = await evidenceService.getEvidence(verificationId);

  return NextResponse.json({ data: evidence });
}

// POST — add evidence to a verification
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { merchantId, verificationId } = await params;

  const merchantAuth = await requireMerchant();
  const adminAuth = await requireAdmin();
  const isAdmin = !isAuthError(adminAuth);
  const isMerchant = !isMerchantAuthError(merchantAuth);

  if (!isMerchant && !isAdmin) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let uploadedById: string;
  if (isMerchant) {
    const auth = merchantAuth as { merchant: { id: string }; userId: string };
    if (auth.merchant?.id !== merchantId) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
    }
    uploadedById = auth.userId;
  } else {
    const auth = adminAuth as { userId: string };
    uploadedById = auth.userId;
  }

  const body = await req.json().catch(() => null);
  if (!body?.evidence_type || !body?.label) {
    return NextResponse.json({ error: "Campos 'evidence_type' e 'label' são obrigatórios" }, { status: 400 });
  }

  const validTypes = Object.values(EvidenceType) as string[];
  if (!validTypes.includes(body.evidence_type)) {
    return NextResponse.json({ error: `evidence_type inválido: ${body.evidence_type}` }, { status: 400 });
  }

  const evidenceService = buildEvidenceService();
  const evidence = await evidenceService.addEvidence(
    {
      verification_id: verificationId,
      merchant_id: merchantId,
      evidence_type: body.evidence_type as EvidenceType,
      label: body.label,
      content: body.content,
      file_path: body.file_path,
      mime_type: body.mime_type,
      file_size_bytes: body.file_size_bytes,
    },
    uploadedById
  );

  if (!evidence) {
    return NextResponse.json({ error: "Falha ao adicionar evidência" }, { status: 500 });
  }

  return NextResponse.json({ data: evidence }, { status: 201 });
}
