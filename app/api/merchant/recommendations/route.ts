import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";

export async function GET() {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;

  const { data } = await serviceClient
    .from("merchant_recommendations")
    .select("*")
    .eq("merchant_id", merchant.id)
    .order("priority")
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ data: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { merchant, serviceClient } = auth;
  const { id } = await request.json() as { id: string };

  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const { error } = await serviceClient
    .from("merchant_recommendations")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("merchant_id", merchant.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: { ok: true } });
}
