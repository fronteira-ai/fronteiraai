import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { SupabaseVerificationRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { VerificationService } from "@/src/domains/trust/services/VerificationService";
import { validateVerificationBody } from "@/src/domains/trust/validators/trust.validators";
import { VerificationType } from "@/src/domains/trust/types/enums";

type Params = { params: Promise<{ merchantId: string }> };

/**
 * GET /api/trust/merchant/[merchantId]/verification
 * Merchant only — lists own verification records.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchantId } = await params;

  if (auth.merchant.id !== merchantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const verificationRepo = new SupabaseVerificationRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const service = new VerificationService(verificationRepo, eventRepo);

  const verifications = await service.getMerchantVerifications(merchantId);

  return NextResponse.json({ data: verifications });
}

/**
 * POST /api/trust/merchant/[merchantId]/verification
 * Merchant only — submit a verification request.
 * Body: { verification_type: VerificationType, metadata?: Record<string, unknown> }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchantId } = await params;

  if (auth.merchant.id !== merchantId) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const validation = validateVerificationBody(body);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join("; ") }, { status: 422 });
  }

  const { verification_type, metadata } = body as {
    verification_type: VerificationType;
    metadata?: Record<string, unknown>;
  };

  const verificationRepo = new SupabaseVerificationRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const service = new VerificationService(verificationRepo, eventRepo);

  const verification = await service.submitVerification(merchantId, verification_type, metadata);

  if (!verification) {
    return NextResponse.json({ error: "Falha ao submeter verificação" }, { status: 500 });
  }

  return NextResponse.json({ data: verification }, { status: 201 });
}
