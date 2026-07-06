import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const offerId = request.nextUrl.searchParams.get("offerId");
  if (!offerId) {
    return NextResponse.json({ error: "offerId query param is required" }, { status: 400 });
  }

  const { freshnessService } = createRealtimeCommerceServices(auth.serviceClient);
  const data = await freshnessService.computeForOffer(offerId);

  return NextResponse.json({ data });
}
