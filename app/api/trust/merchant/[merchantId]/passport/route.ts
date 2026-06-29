import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseTrustRepository,
  SupabaseVerificationRepository,
  SupabaseBadgeRepository,
  SupabaseTrustSignalRepository,
  SupabaseMerchantReviewRepository,
  SupabaseMerchantTimelineRepository,
} from "@/src/domains/trust/infrastructure";
import { MerchantPassportService } from "@/src/domains/trust/services";
import type { MerchantBasicData } from "@/src/domains/trust/types/trust.types";

type Params = Promise<{ merchantId: string }>;

function buildSvc() {
  const client = getSupabaseServiceClient();
  return {
    passportSvc: new MerchantPassportService(
      new SupabaseTrustRepository(client),
      new SupabaseVerificationRepository(client),
      new SupabaseBadgeRepository(client),
      new SupabaseTrustSignalRepository(client),
      new SupabaseMerchantReviewRepository(client),
      new SupabaseMerchantTimelineRepository(client)
    ),
    client,
  };
}

export async function GET(_req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const { passportSvc, client } = buildSvc();

  const { data: merchant, error } = await client
    .from("merchants")
    .select("id, user_id, company_name, company_doc, company_website, contact_phone, contact_whatsapp, contact_email, verified_level, plan, created_at, updated_at, status")
    .eq("user_id", merchantId)
    .eq("status", "active")
    .single();

  if (error || !merchant) {
    return NextResponse.json({ error: "Merchant não encontrado" }, { status: 404 });
  }

  const basic: MerchantBasicData = {
    companyName: (merchant.company_name as string) ?? "",
    companyDoc: (merchant.company_doc as string | null) ?? null,
    website: (merchant.company_website as string | null) ?? null,
    phone: (merchant.contact_phone as string | null) ?? null,
    whatsapp: (merchant.contact_whatsapp as string | null) ?? null,
    email: (merchant.contact_email as string | null) ?? null,
    verifiedLevel: (merchant.verified_level as string) ?? "none",
    plan: (merchant.plan as string) ?? "free",
    joinedAt: merchant.created_at as string,
    lastUpdatedAt: merchant.updated_at as string,
  };

  const passport = await passportSvc.getPassport(merchantId, basic);
  if (!passport) return NextResponse.json({ error: "Passport não disponível" }, { status: 404 });

  return NextResponse.json({ data: passport });
}
