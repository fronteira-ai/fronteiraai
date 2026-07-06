import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

// Epic 2 — Marketplace Health Engine.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { healthEngine } = createMarketplaceOperationsServices(auth.serviceClient);
  const data = await healthEngine.compute();

  return NextResponse.json({ data });
}
