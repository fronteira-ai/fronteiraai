import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";

// Program Ω — Mission Ω-1, Objetivo 4. Powers the operational panel's
// summary tiles: pending/approved/merged/rejected/rolled-back counts, total
// offers moved, success rate.
export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { mergeQueueDashboardService } = createCanonicalCatalogServices(auth.serviceClient);
  const stats = await mergeQueueDashboardService.getStats();

  return NextResponse.json(stats);
}
