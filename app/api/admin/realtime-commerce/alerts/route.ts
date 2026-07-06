import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const { buyerAlertService } = createRealtimeCommerceServices(auth.serviceClient);
  const data = await buyerAlertService.listPending(limit);

  return NextResponse.json({ data });
}
