import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { VerificationService } from "@/src/domains/trust/services/VerificationService";
import { VerificationAuditService } from "@/src/domains/trust/services/VerificationAuditService";

type Params = { merchantId: string; verificationId: string };

function buildServices() {
  const client = getSupabaseServiceClient();
  const verificationRepo = new SupabaseVerificationRepository(client);
  const eventRepo = new SupabaseTrustEventRepository(client);
  const historyRepo = new SupabaseVerificationHistoryRepository(client);
  const auditService = new VerificationAuditService(historyRepo);
  const verificationService = new VerificationService(verificationRepo, eventRepo, auditService);
  return { verificationService };
}

// GET /api/trust/merchant/[merchantId]/verification/[verificationId]
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

  const { verificationService } = buildServices();
  const verification = await verificationService.getVerificationById(verificationId);

  if (!verification || verification.merchant_id !== merchantId) {
    return NextResponse.json({ error: "Verificação não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ data: verification });
}

// PATCH /api/trust/merchant/[merchantId]/verification/[verificationId]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<Params> }
): Promise<NextResponse> {
  const { merchantId, verificationId } = await params;

  const adminAuth = await requireAdmin();
  if (isAuthError(adminAuth)) return adminAuth as NextResponse;
  const { userId } = adminAuth as { userId: string };

  const body = await req.json().catch(() => null);
  if (!body || !body.action) {
    return NextResponse.json({ error: "Campo 'action' obrigatório" }, { status: 400 });
  }

  const { verificationService } = buildServices();

  const verification = await verificationService.getVerificationById(verificationId);
  if (!verification || verification.merchant_id !== merchantId) {
    return NextResponse.json({ error: "Verificação não encontrada" }, { status: 404 });
  }

  let updated = null;

  switch (body.action) {
    case "approve":
      updated = await verificationService.approveVerification(verificationId, userId);
      break;
    case "reject":
      if (!body.reason) return NextResponse.json({ error: "'reason' obrigatório para rejeição" }, { status: 400 });
      updated = await verificationService.rejectVerification(verificationId, userId, body.reason);
      break;
    case "revoke":
      if (!body.reason) return NextResponse.json({ error: "'reason' obrigatório para revogação" }, { status: 400 });
      updated = await verificationService.revokeVerification(verificationId, userId, body.reason);
      break;
    default:
      return NextResponse.json({ error: `Ação inválida: ${body.action}` }, { status: 400 });
  }

  if (!updated) {
    return NextResponse.json({ error: "Falha ao atualizar verificação" }, { status: 500 });
  }

  return NextResponse.json({ data: updated });
}
