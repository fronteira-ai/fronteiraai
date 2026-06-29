import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseMerchantTimelineRepository } from "@/src/domains/trust/infrastructure";
import { MerchantTimelineService } from "@/src/domains/trust/services";

type Params = Promise<{ merchantId: string }>;

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");
  const category = searchParams.get("category") ?? undefined;

  const client = getSupabaseServiceClient();
  const svc = new MerchantTimelineService(new SupabaseMerchantTimelineRepository(client));

  const result = await svc.getFullTimeline(merchantId, {
    page,
    perPage,
    category: category as never,
  });

  return NextResponse.json({ data: result });
}
