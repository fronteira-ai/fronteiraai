import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createExchangeServices } from "@/lib/exchange-factory";

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const providerId = request.nextUrl.searchParams.get("providerId") ?? "exchangerate-api";
  const { runRepo } = createExchangeServices(auth.serviceClient);
  const data = await runRepo.findByProvider(providerId, 50);

  return NextResponse.json({ data });
}
