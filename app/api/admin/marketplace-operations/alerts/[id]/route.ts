import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { createMarketplaceOperationsServices } from "@/lib/marketplace-operations-factory";

interface UpdateAlertBody {
  action: "acknowledge" | "resolve" | "ignore";
}

// Epic 8 — Marketplace Alert Engine lifecycle (mirrors merchant-decision's
// PATCH /api/merchant/actions/[id]).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { id } = await params;
  const body = (await request.json()) as UpdateAlertBody;
  const { alertService } = createMarketplaceOperationsServices(auth.serviceClient);

  const updated =
    body.action === "acknowledge"
      ? await alertService.acknowledge(id)
      : body.action === "resolve"
        ? await alertService.resolve(id)
        : body.action === "ignore"
          ? await alertService.ignore(id)
          : null;

  if (!updated) {
    return NextResponse.json({ error: "Alerta não encontrado ou ação inválida" }, { status: 404 });
  }

  return NextResponse.json({ data: updated });
}
