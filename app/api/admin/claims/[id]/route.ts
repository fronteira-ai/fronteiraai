import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import { SupabaseVerificationEvidenceRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationEvidenceRepository";
import { SupabaseVerificationHistoryRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationHistoryRepository";
import { SupabaseTrustSignalRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustSignalRepository";
import { SupabaseSignalProvenanceRepository } from "@/src/domains/trust/infrastructure/SupabaseSignalProvenanceRepository";
import { TrustSignalService } from "@/src/domains/trust/services/TrustSignalService";

type Params = { params: Promise<{ id: string }> };

const REVIEW_ACTIONS = new Set(["approve", "reject", "request_info", "revoke"]);

export async function GET(_req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const { claimRepo, verificationService, eventService } = createMerchantOwnershipServices(auth.serviceClient);

  const claim = await claimRepo.findById(id);
  if (!claim) return NextResponse.json({ error: "Claim não encontrada" }, { status: 404 });

  const verificationResult = claim.verificationId
    ? await verificationService.getVerificationResult(
        claim.verificationId,
        new SupabaseVerificationEvidenceRepository(auth.serviceClient),
        new SupabaseVerificationHistoryRepository(auth.serviceClient)
      )
    : null;

  const brainEvents = await eventService.getMerchantEvents(claim.merchantId, 20);

  const { data: merchant } = await auth.serviceClient.from("merchants").select("user_id").eq("id", claim.merchantId).maybeSingle();
  const trustSignalService = new TrustSignalService(
    new SupabaseTrustSignalRepository(auth.serviceClient),
    new SupabaseSignalProvenanceRepository(auth.serviceClient)
  );
  const trustSignals = merchant?.user_id ? await trustSignalService.getActiveSignals(merchant.user_id as string) : [];

  return NextResponse.json({ data: { claim, verificationResult, brainEvents, trustSignals } });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = (await request.json()) as { action?: string; reason?: string; note?: string };

  if (!body.action || !REVIEW_ACTIONS.has(body.action)) {
    return NextResponse.json({ error: `Ação inválida. Esperado uma de: ${[...REVIEW_ACTIONS].join(", ")}` }, { status: 400 });
  }

  const { claimService } = createMerchantOwnershipServices(auth.serviceClient);

  switch (body.action) {
    case "approve": {
      const result = await claimService.approve(id, auth.userId);
      if (!result) return NextResponse.json({ error: "Claim não pode ser aprovada (status inválido ou não encontrada)" }, { status: 400 });
      return NextResponse.json({ data: result });
    }
    case "reject": {
      if (!body.reason) return NextResponse.json({ error: "Motivo da rejeição é obrigatório" }, { status: 400 });
      const result = await claimService.reject(id, auth.userId, body.reason);
      if (!result) return NextResponse.json({ error: "Claim não pode ser rejeitada (status inválido ou não encontrada)" }, { status: 400 });
      return NextResponse.json({ data: result });
    }
    case "request_info": {
      if (!body.note) return NextResponse.json({ error: "Nota é obrigatória" }, { status: 400 });
      const result = await claimService.requestInfo(id, body.note);
      if (!result) return NextResponse.json({ error: "Claim não encontrada" }, { status: 404 });
      return NextResponse.json({ data: result });
    }
    case "revoke": {
      if (!body.reason) return NextResponse.json({ error: "Motivo da revogação é obrigatório" }, { status: 400 });
      const result = await claimService.revoke(id, auth.userId, body.reason);
      if (!result) return NextResponse.json({ error: "Claim não pode ser revogada (status inválido ou não encontrada)" }, { status: 400 });
      return NextResponse.json({ data: result });
    }
    default:
      return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 });
  }
}
