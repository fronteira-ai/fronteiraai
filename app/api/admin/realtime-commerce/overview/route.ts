import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { dashboardService } = createRealtimeCommerceServices(auth.serviceClient);
  const data = await dashboardService.getOverview();

  return NextResponse.json({ data });
}
