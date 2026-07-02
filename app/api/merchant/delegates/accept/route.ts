import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";

// The invitee doesn't have a `merchants` row of their own — requireAuth()
// (session only) is the right guard here, not requireMerchant().
export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (isMerchantAuthError(auth)) return auth;

  const { userId, email, serviceClient } = auth;
  const body = (await request.json()) as { token?: string };

  if (!body.token) return NextResponse.json({ error: "Token de convite ausente." }, { status: 400 });

  const { delegationService } = createMerchantOwnershipServices(serviceClient);
  const delegate = await delegationService.accept(body.token, userId, email);

  if (!delegate) return NextResponse.json({ error: "Convite inválido, expirado ou já utilizado." }, { status: 404 });

  return NextResponse.json({ data: delegate });
}
