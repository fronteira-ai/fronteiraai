import { NextRequest, NextResponse } from "next/server";
import { requireMerchant, isMerchantAuthError } from "@/lib/merchant-auth";
import { createDecisionServices } from "@/lib/decision-factory";
import type { ActionStatus, RecommendationCategory, RecommendationPriority } from "@/src/domains/merchant-decision/types/enums";

export async function GET(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  const statusParam = req.nextUrl.searchParams.get("status") as ActionStatus | null;
  const { actionService } = createDecisionServices(auth.serviceClient);

  const actions = await actionService.getActions(auth.merchant.id, statusParam ?? undefined);
  return NextResponse.json({ actions, total: actions.length });
}

export async function POST(req: NextRequest) {
  const auth = await requireMerchant();
  if (isMerchantAuthError(auth)) return auth;

  let body: {
    rule_id: string;
    recommendation_id: string;
    title: string;
    category: RecommendationCategory;
    priority: RecommendationPriority;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!body.rule_id || !body.recommendation_id || !body.title) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const { actionService } = createDecisionServices(auth.serviceClient);
  const action = await actionService.getActions(auth.merchant.id);
  const existing = action.find((a) => a.rule_id === body.rule_id && (a.status === "pending" || a.status === "postponed"));

  if (existing) {
    return NextResponse.json({ action: existing });
  }

  const created = await auth.serviceClient
    .from("merchant_decision_actions")
    .insert({
      merchant_id: auth.merchant.id,
      rule_id: body.rule_id,
      recommendation_id: body.recommendation_id,
      title: body.title,
      category: body.category,
      priority: body.priority,
      status: "pending",
    })
    .select("*")
    .single();

  if (created.error) {
    return NextResponse.json({ error: created.error.message }, { status: 500 });
  }

  return NextResponse.json({ action: created.data }, { status: 201 });
}
