import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createDecisionServices } from "@/lib/decision-factory";
import { ActionStatus } from "@/src/domains/merchant-decision/types/enums";
import type { UpdateActionInput } from "@/src/domains/merchant-decision/repositories/IActionRepository";

const VALID_STATUSES = new Set<string>([
  ActionStatus.Completed,
  ActionStatus.Ignored,
  ActionStatus.Postponed,
]);

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { id } = await params;
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  let body: { status: string; notes?: string; scheduled_for?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json(
      { error: "invalid_status", valid: Array.from(VALID_STATUSES) },
      { status: 400 }
    );
  }

  const { actionService } = createDecisionServices(auth.serviceClient);

  const input: UpdateActionInput = {
    status: body.status as ActionStatus,
    notes: body.notes,
    acted_at:
      body.status === ActionStatus.Completed || body.status === ActionStatus.Ignored
        ? new Date().toISOString()
        : undefined,
    scheduled_for: body.status === ActionStatus.Postponed ? body.scheduled_for : undefined,
  };

  const updated = await actionService.updateAction(id, auth.merchant.id, input);
  if (!updated) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ action: updated });
}
