import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createRealtimeCommerceServices } from "@/lib/realtime-commerce-factory";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const days = Number(request.nextUrl.searchParams.get("days") ?? "7");
  const { pulseSnapshotRepo } = createRealtimeCommerceServices(auth.serviceClient);

  const [latest, history] = await Promise.all([pulseSnapshotRepo.getLatest(), pulseSnapshotRepo.getHistory(days)]);

  return NextResponse.json({ data: { latest, history } });
}
