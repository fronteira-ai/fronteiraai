import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { EventService } from "@/src/domains/trust/services/EventService";
import { validateEventInput } from "@/src/domains/trust/validators/trust.validators";
import { getBrainImpact } from "@/src/domains/trust/events/event-registry";
import type { TrustEventType, TrustSource, TrustReason } from "@/src/domains/trust/types/enums";

/**
 * GET /api/trust/events
 * Admin only — recent trust events across all merchants.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { searchParams } = new URL(req.url);
  const merchantId = searchParams.get("merchantId");
  const limit = Math.min(100, Number(searchParams.get("limit") ?? 50));

  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const service = new EventService(eventRepo);

  if (merchantId) {
    const events = await service.getMerchantEvents(merchantId, limit);
    return NextResponse.json({ data: events });
  }

  const events = await eventRepo.findByMerchantId("", limit);
  return NextResponse.json({ data: events });
}

/**
 * POST /api/trust/events
 * Admin only — manually record a trust event.
 * Body: { merchant_id, event_type, source, reason?, delta?, metadata? }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const validation = validateEventInput(body as Record<string, unknown>);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join("; ") }, { status: 422 });
  }

  const {
    merchant_id,
    event_type,
    source,
    reason,
    delta,
    metadata,
  } = body as {
    merchant_id: string;
    event_type: TrustEventType;
    source: TrustSource;
    reason?: TrustReason;
    delta?: number;
    metadata?: Record<string, unknown>;
  };

  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const service = new EventService(eventRepo);

  const event = await service.recordEvent({
    merchant_id,
    event_type,
    source,
    reason,
    delta,
    metadata,
    created_by: auth.userId,
  });

  if (!event) {
    return NextResponse.json({ error: "Falha ao registrar evento" }, { status: 500 });
  }

  const brainAssets = getBrainImpact(event_type);

  return NextResponse.json(
    { data: event, brain: { assets_fed: brainAssets } },
    { status: 201 }
  );
}
