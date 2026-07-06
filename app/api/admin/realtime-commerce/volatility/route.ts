import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const productId = request.nextUrl.searchParams.get("productId");
  if (!productId) {
    return NextResponse.json({ error: "productId query param is required" }, { status: 400 });
  }

  const windowDays = Number(request.nextUrl.searchParams.get("windowDays") ?? "30");
  const { volatilityService } = createRealtimeCommerceServices(auth.serviceClient);
  const data = await volatilityService.computeForProduct(productId, windowDays);

  return NextResponse.json({ data });
}
