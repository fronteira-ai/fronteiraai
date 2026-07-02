import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";

// Epic H — Premium Upgrade Journey. Lead-capture only (confirmed with the
// CTO) — no payment gateway (ADR-035). Records interest for an admin to
// follow up on manually; does not change merchant.plan.
export async function POST(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const body = (await request.json()) as { triggerContext?: string };

  const { premiumUpgradeService } = createMerchantOwnershipServices(serviceClient);
  const lead = await premiumUpgradeService.recordInterest(merchant.id, body.triggerContext ?? "unknown");

  return NextResponse.json({ data: lead, message: "Recebemos seu interesse — nossa equipe vai entrar em contato." });
}
