import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createGrowthEngineServices } from "@/lib/growth-engine-factory";
import { GrowthEventType } from "@/src/domains/growth-engine/types/enums";

const VALID_EVENTS = new Set<string>(Object.values(GrowthEventType));

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const eventType = body?.event_type as string | undefined;

  if (!eventType || !VALID_EVENTS.has(eventType)) {
    return NextResponse.json(
      { ok: false, error: `event_type must be one of: ${[...VALID_EVENTS].join(", ")}` },
      { status: 400 }
    );
  }

  const { contextBuilder, recommendationEngine, priorityEngine, history } =
    createGrowthEngineServices(auth.serviceClient);

  const ctx = await contextBuilder.build(auth.merchant);
  const drafts = recommendationEngine.evaluate(ctx);
  const scored = priorityEngine.scoreAll(drafts, ctx);
  const rec = scored.find((r) => r.id === id);

  if (!rec) {
    return NextResponse.json({ ok: false, error: "Recommendation not found" }, { status: 404 });
  }

  await history.recordEvent(auth.merchant.id, rec, eventType as GrowthEventType);

  return NextResponse.json({ ok: true, recorded: eventType });
}
