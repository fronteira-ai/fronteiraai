import { NextRequest, NextResponse } from "next/server";
import { requireMerchantContext, isMerchantAuthError } from "@/lib/merchant-auth";
import { createMerchantOwnershipServices } from "@/lib/merchant-ownership-factory";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const auth = await requireMerchantContext();
  if (isMerchantAuthError(auth)) return auth;

  const { id } = await params;
  const { merchant, role, serviceClient } = auth;
  const { delegationService } = createMerchantOwnershipServices(serviceClient);

  try {
    const revoked = await delegationService.revoke(id, merchant.id, role);
    if (!revoked) return NextResponse.json({ error: "Delegado não encontrado" }, { status: 404 });
    return NextResponse.json({ message: "Delegado revogado" });
  } catch (err) {
    return NextResponse.json({ error: String(err instanceof Error ? err.message : err) }, { status: 403 });
  }
}
