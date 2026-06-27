import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SITE_URL } from "@/constants/routes";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import Reveal from "@/components/ui/Reveal";
import { getStoresRanking } from "@/services/stores-public.service";
import { Shield, Star, Package, RefreshCw, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Lojas do Paraguai — Ranking e Catálogo | ParaguAI",
  description:
    "Descubra as melhores lojas do Paraguai no ParaguAI. Veja ranking de lojas verificadas, Merchant Score, quantidade de produtos e avaliações.",
  keywords: ["lojas Paraguai", "Ciudad del Este lojas", "marketplace Paraguai", "ranking lojas", "lojas verificadas Paraguai"],
  alternates: { canonical: `${SITE_URL}/lojas` },
  openGraph: {
    title: "Ranking de Lojas do Paraguai | ParaguAI",
    description: "As melhores lojas de Ciudad del Este, rankeadas por qualidade, produtos e Merchant Score.",
    url: `${SITE_URL}/lojas`,
    siteName: "ParaguAI",
    type: "website",
    locale: "pt_BR",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ranking de Lojas do Paraguai | ParaguAI",
    description: "As melhores lojas de Ciudad del Este, rankeadas por qualidade e Merchant Score.",
  },
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const color =
    score >= 80 ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" :
    score >= 60 ? "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" :
    "text-slate-400 bg-slate-500/10 border-slate-500/30";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${color}`}>
      <TrendingUp size={10} />
      {score}
    </span>
  );
}

function VerifiedBadge({ level }: { level: string | null }) {
  if (!level || level === "none") return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400">
      <Shield size={10} />
      Verificada
    </span>
  );
}

export default async function LojasPage() {
  const stores = await getStoresRanking(30);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 pt-32 pb-24">
        {/* Header */}
        <Reveal direction="up">
          <div className="text-center mb-12">
            <span className="inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[2px] text-blue-400 mb-5">
              Marketplace
            </span>
            <h1 className="text-4xl font-black text-white sm:text-5xl">
              Lojas do Paraguai
            </h1>
            <p className="mt-4 text-slate-400 max-w-xl mx-auto">
              As melhores lojas de Ciudad del Este, rankeadas por Merchant Score, qualidade de catálogo e atualização de preços.
            </p>
          </div>
        </Reveal>

        {/* Store grid */}
        {stores.length === 0 ? (
          <div className="text-center py-20 text-slate-500">
            Nenhuma loja disponível no momento.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store, i) => (
              <Reveal key={store.id} direction="up" delay={i * 40}>
                <Link
                  href={`/lojas/${store.slug}`}
                  className="group block rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden transition-all duration-300 hover:border-slate-600 hover:bg-slate-900"
                >
                  {/* Cover */}
                  <div className="relative h-28 bg-slate-800 overflow-hidden">
                    {store.cover_image ? (
                      <Image
                        src={store.cover_image}
                        alt={store.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="text-4xl font-black text-slate-700 group-hover:text-slate-600 transition-colors">
                          {store.name.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Rank badge */}
                    <div className="absolute top-2 left-2">
                      <span className="rounded-full bg-black/60 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                        #{i + 1}
                      </span>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-white truncate group-hover:text-blue-300 transition-colors">
                          {store.name}
                        </h2>
                        {store.city && (
                          <p className="text-xs text-slate-500 mt-0.5">{store.city}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <ScoreBadge score={store.merchantScore} />
                        <VerifiedBadge level={store.verifiedLevel} />
                      </div>
                    </div>

                    {store.description && (
                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {store.description}
                      </p>
                    )}

                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {store.offerCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Package size={11} />
                          {store.offerCount.toLocaleString("pt-BR")} ofertas
                        </span>
                      )}
                      {store.rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star size={11} />
                          {store.rating.toFixed(1)}
                        </span>
                      )}
                      {store.is_verified && (
                        <span className="flex items-center gap-1">
                          <Shield size={11} className="text-blue-500" />
                          <span className="text-blue-500">Verificada</span>
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        )}

        {/* CTA for merchants */}
        <Reveal direction="up">
          <div className="mt-16 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-slate-900 p-8 text-center">
            <p className="text-lg font-bold text-white mb-2">Tem uma loja no Paraguai?</p>
            <p className="text-slate-400 text-sm mb-5 max-w-md mx-auto">
              Cadastre-se gratuitamente e apareça neste ranking para milhares de compradores.
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Link
                href="/merchant/register"
                className="rounded-full bg-emerald-600 px-7 py-3 text-sm font-bold text-white hover:bg-emerald-500 transition-colors"
              >
                Cadastrar minha loja
              </Link>
              <Link
                href="/para-lojistas"
                className="rounded-full border border-slate-600 px-7 py-3 text-sm font-semibold text-slate-300 hover:border-slate-400 hover:text-white transition-colors"
              >
                Saiba mais
              </Link>
            </div>
          </div>
        </Reveal>

        {/* Update notice */}
        <Reveal direction="up">
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <RefreshCw size={12} />
            Ranking atualizado em tempo real com base no Merchant Score
          </div>
        </Reveal>
      </div>

      <Footer />
    </main>
  );
}
