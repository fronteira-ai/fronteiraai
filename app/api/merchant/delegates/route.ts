import { NextRequest, NextResponse } from "next/server";
import { requireMerchantContext, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";
import { DelegateRole } from "@/src/domains/merchant-ownership";

const VALID_ROLES = new Set(Object.values(DelegateRole));

// Epic E — Delegated Management. Minimal UI (settings page section), full
// backend + invite/accept flow (confirmed scope with the CTO).
export async function POST(request: NextRequest) {
  const auth = await requireMerchantContext();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, role, userId, serviceClient } = auth;
  const body = (await request.json()) as { email?: string; role?: string };

  if (!body.email || !body.role || !VALID_ROLES.has(body.role as DelegateRole)) {
    return NextResponse.json({ error: `E-mail e papel são obrigatórios. Papéis válidos: ${[...VALID_ROLES].join(", ")}` }, { status: 400 });
  }

  const { delegationService } = createMerchantOwnershipServices(serviceClient);

  try {
    const delegate = await delegationService.invite(merchant.id, role, body.email, body.role as DelegateRole, userId);
    return NextResponse.json({ data: delegate });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 403 });
  }
}

export async function GET() {
  const auth = await requireMerchantContext();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const { delegationService } = createMerchantOwnershipServices(serviceClient);
  const delegates = await delegationService.listForMerchant(merchant.id);

  return NextResponse.json({ data: delegates });
}
