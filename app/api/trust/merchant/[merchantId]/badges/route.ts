import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { SupabaseBadgeRepository } from "@/src/domains/trust/infrastructure/SupabaseBadgeRepository";
import { SupabaseTrustRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustRepository";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { BadgeService } from "@/src/domains/trust/services/BadgeService";
import { getBadgeLabel } from "@/src/domains/trust/utils/trust.utils";
import { TrustBadge } from "@/src/domains/trust/types/enums";
import { validateBadgeForStatus } from "@/src/domains/trust/validators/trust.validators";
import { TrustService } from "@/src/domains/trust/services/TrustService";

type Params = { params: Promise<{ merchantId: string }> };

/**
 * GET /api/trust/merchant/[merchantId]/badges
 * Public — returns active badge and badge history.
 */
export async function GET(_req: NextRequest, { params }: Params) {
  const { merchantId } = await params;

  const client = getSupabaseServiceClient();
  const badgeRepo = new SupabaseBadgeRepository(client);
  const trustRepo = new SupabaseTrustRepository(client);
  const eventRepo = new SupabaseTrustEventRepository(client);
  const badgeService = new BadgeService(badgeRepo, trustRepo, eventRepo);

  const [badges, activeBadge] = await Promise.all([
    badgeService.getMerchantBadges(merchantId),
    badgeService.getActiveBadge(merchantId),
  ]);

  return NextResponse.json({
    data: {
      merchantId,
      activeBadge: activeBadge
        ? {
            type: activeBadge.badge_type,
            label: getBadgeLabel(activeBadge.badge_type as TrustBadge),
            grantedAt: activeBadge.granted_at,
            expiresAt: activeBadge.expires_at,
          }
        : null,
      history: badges.map((b) => ({
        type: b.badge_type,
        label: getBadgeLabel(b.badge_type as TrustBadge),
        grantedAt: b.granted_at,
        revokedAt: b.revoked_at,
        isActive: b.is_active,
      })),
    },
  });
}

/**
 * POST /api/trust/merchant/[merchantId]/badges
 * Admin only — grant a badge to a merchant.
 * Body: { badge_type: TrustBadge, expires_at?: string }
 */
export async function POST(req: NextRequest, { params }: Params) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { merchantId } = await params;

  let body: { badge_type?: string; expires_at?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const badgeValues = Object.values(TrustBadge) as string[];
  if (!body.badge_type || !badgeValues.includes(body.badge_type)) {
    return NextResponse.json(
      { error: `badge_type inválido. Válidos: ${badgeValues.join(", ")}` },
      { status: 422 }
    );
  }

  const trustRepo = new SupabaseTrustRepository(auth.serviceClient);
  const eventRepo = new SupabaseTrustEventRepository(auth.serviceClient);
  const badgeRepo = new SupabaseBadgeRepository(auth.serviceClient);
  const trustService = new TrustService(trustRepo, eventRepo);
  const badgeService = new BadgeService(badgeRepo, trustRepo, eventRepo);

  const trust = await trustService.getMerchantTrust(merchantId);
  if (!trust) {
    return NextResponse.json({ error: "Merchant sem registro de trust" }, { status: 404 });
  }

  const validation = validateBadgeForStatus(body.badge_type as TrustBadge, trust.status as never);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.errors.join("; ") }, { status: 422 });
  }

  const badge = await badgeService.grantBadge(
    merchantId,
    body.badge_type as TrustBadge,
    auth.userId,
    body.expires_at
  );

  if (!badge) {
    return NextResponse.json({ error: "Falha ao conceder badge" }, { status: 500 });
  }

  return NextResponse.json({ data: badge }, { status: 201 });
}
