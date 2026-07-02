import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createCanonicalCatalogServices } from "@/lib/canonical-catalog-factory";
import { MergeCandidateStatus } from "@/src/domains/canonical-catalog";

type Params = { params: Promise<{ id: string }> };

const REVIEW_STATUSES = new Set([MergeCandidateStatus.Approved, MergeCandidateStatus.Rejected, MergeCandidateStatus.Ignored]);

// Records a human decision only (CTO mission: "Toda união deverá ser apenas
// sugerida"). This never reassigns offers or deprecates a canonical
// product, even when status is "approved" — executing an approved merge is
// out of scope for this Wave, by construction (IMergeCandidateRepository
// has no such method).
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = (await request.json()) as { status?: string };

  if (!body.status || !REVIEW_STATUSES.has(body.status as MergeCandidateStatus)) {
    return NextResponse.json(
      { error: `Invalid status. Expected one of: ${[...REVIEW_STATUSES].join(", ")}` },
      { status: 400 }
    );
  }

  const { mergeCandidateRepo } = createCanonicalCatalogServices(auth.serviceClient);

  const candidate = await mergeCandidateRepo.findById(id);
  if (!candidate) return NextResponse.json({ error: "Merge candidate not found" }, { status: 404 });

  await mergeCandidateRepo.updateStatus(id, body.status as MergeCandidateStatus, auth.email);

  return NextResponse.json({ message: "Merge candidate reviewed" });
}
