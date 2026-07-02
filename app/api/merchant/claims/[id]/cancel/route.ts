import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { id } = await params;
  const { claimService } = createMerchantOwnershipServices(auth.serviceClient);
  await claimService.cancel(id, auth.merchant.id);

  return NextResponse.json({ message: "Solicitação cancelada" });
}
