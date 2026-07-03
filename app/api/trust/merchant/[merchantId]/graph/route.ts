import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseTrustEventRepository } from "@/src/domains/trust/infrastructure/SupabaseTrustEventRepository";
import { KnowledgeGraphService } from "@/src/domains/trust/brain/KnowledgeGraphService";

type Params = Promise<{ merchantId: string }>;

// Release 1.8, Program 0 Wave 0 (Brain Analytics Integration). Read-only —
// the first API route to ever expose KnowledgeGraphService, which existed
// fully built and tested since Release 1.5 Epic 4 but had no consumer.
// Keyed on merchants.id (not user_id, unlike the sibling /insights route) —
// the actual join key merchant_trust_events.merchant_id and this bridge
// use throughout.
export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const client = getSupabaseServiceClient();

  const eventRepo = new SupabaseTrustEventRepository(client);
  const events = await eventRepo.findByMerchantId(merchantId, 200);

  const graph = new KnowledgeGraphService();
  const relations = graph.deriveRelations(events);
  const summary = graph.buildSummary(merchantId, events);

  return NextResponse.json({ summary, relations });
}
