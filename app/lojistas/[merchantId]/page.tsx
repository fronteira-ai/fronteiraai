import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { merchantPassportUrl } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
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
import {
  MerchantHeader,
  MerchantSidebar,
  MerchantOverview,
  MerchantTrustSection,
  MerchantHistorySection,
  MerchantFacts,
  MerchantIdentityCard,
  ProfileTabNav,
  ReviewList,
  ReviewComposer,
} from "@/src/domains/trust/components";
import type { MerchantBasicData, MerchantPassport } from "@/src/domains/trust/types/trust.types";

type Params = Promise<{ merchantId: string }>;
type SearchParams = Promise<{ tab?: string }>;

const VALID_TABS = ["overview", "trust", "timeline", "reviews", "info"] as const;
type Tab = (typeof VALID_TABS)[number];

function resolveTab(raw: string | undefined): Tab {
  return VALID_TABS.includes(raw as Tab) ? (raw as Tab) : "overview";
}

async function getMerchantPassport(merchantId: string): Promise<{ passport: MerchantPassport; userId: string } | null> {
  const client = getSupabaseServiceClient();

  const { data: merchant } = await client
    .from("merchants")
    .select("id, user_id, company_name, company_doc, company_website, contact_phone, contact_whatsapp, contact_email, verified_level, plan, created_at, updated_at, status")
    .eq("id", merchantId)
    .eq("status", "active")
    .single();

  if (!merchant) return null;

  const userId = merchant.user_id as string;

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

  const svc = new MerchantPassportService(
    new SupabaseTrustRepository(client),
    new SupabaseVerificationRepository(client),
    new SupabaseBadgeRepository(client),
    new SupabaseTrustSignalRepository(client),
    new SupabaseMerchantReviewRepository(client),
    new SupabaseMerchantTimelineRepository(client)
  );

  const passport = await svc.getPassport(userId, basic);
  if (!passport) return null;

  return { passport, userId };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { merchantId } = await params;
  const result = await getMerchantPassport(merchantId);
  if (!result) return { title: "Lojista não encontrado | ParaguAI" };
  const name = result.passport.basic.companyName;
  const title = `${name} — Identidade Digital | ParaguAI`;
  const description = `Perfil completo de ${name}: verificações, sinais de confiança, avaliações e histórico público no ParaguAI.`;
  const url = merchantPassportUrl(merchantId);

  return {
    title,
    description,
    alternates: {
      canonical: url,
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "ParaguAI",
      type: "profile",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

export default async function MerchantIdentityPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const [{ merchantId }, { tab: rawTab }] = await Promise.all([params, searchParams]);
  const activeTab = resolveTab(rawTab);

  const result = await getMerchantPassport(merchantId);
  if (!result) notFound();

  const { passport, userId } = result;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-[#050816] pt-24 pb-16" id="main-content">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 space-y-6">
          {/* Header */}
          <MerchantHeader basic={passport.basic} channels={passport.channels} />

          {/* Tab navigation */}
          <ProfileTabNav activeTab={activeTab} merchantId={merchantId} />

          {/* Content grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sidebar — always visible */}
            <aside className="lg:col-span-1">
              <MerchantSidebar passport={passport} showTrustPanel={activeTab !== "trust"} />
            </aside>

            {/* Main area — tab-driven */}
            <div className="lg:col-span-2">
              {activeTab === "overview" && (
                <MerchantOverview passport={passport} />
              )}

              {activeTab === "trust" && (
                <MerchantTrustSection
                  signals={passport.activeSignals}
                />
              )}

              {activeTab === "timeline" && (
                <MerchantHistorySection timeline={passport.timeline} />
              )}

              {activeTab === "reviews" && (
                <section className="space-y-8" aria-label="Avaliações">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1">Avaliações</h2>
                    <p className="text-sm text-slate-400">
                      Avaliações verificadas de compradores reais.
                    </p>
                  </div>
                  <ReviewList
                    reviews={passport.reviews}
                    stats={passport.reviewStats}
                  />
                  <section aria-labelledby="write-review-heading">
                    <h2 id="write-review-heading" className="text-lg font-semibold text-white mb-4">
                      Avaliar lojista
                    </h2>
                    <ReviewComposer merchantId={userId} />
                  </section>
                </section>
              )}

              {activeTab === "info" && (
                <section className="space-y-6" aria-label="Informações">
                  <div>
                    <h2 className="text-lg font-semibold text-white mb-1">Informações</h2>
                    <p className="text-sm text-slate-400">
                      Dados objetivos e canais de contato verificados.
                    </p>
                  </div>
                  <MerchantFacts insights={passport.insights} />
                  <MerchantIdentityCard basic={passport.basic} channels={passport.channels} />
                </section>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
