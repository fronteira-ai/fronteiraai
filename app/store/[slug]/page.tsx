"use client";

import { notFound, useParams } from "next/navigation";
import Link from "next/link";
import { Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StoreDetails from "@/components/store/StoreDetails";
import StoreOffers from "@/components/store/StoreOffers";
import StoreGrid from "@/components/store/StoreGrid";
import EmptyState from "@/components/ui/EmptyState";
import { useStore } from "@/hooks/useStore";
import Loading from "./loading";

export default function StorePage() {
  const params = useParams<{ slug: string }>();
  const {
    store,
    offers,
    relatedStores,
    loading,
    notFound: storeNotFound,
  } = useStore(params.slug);

  // Renderizado durante o fluxo de render (não em efeito), para que o
  // notFound() seja capturado corretamente pelo not-found.tsx da rota
  // (mesmo padrão de app/product/[slug]/page.tsx).
  if (!loading && (storeNotFound || !store)) {
    notFound();
  }

  if (loading || !store) {
    return <Loading />;
  }

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
        <nav className="flex items-center gap-2 text-sm text-slate-400">
          <Link href="/" className="transition hover:text-white">
            Início
          </Link>
          <span>/</span>
          <span className="text-white">{store.name}</span>
        </nav>

        <div className="mt-10 flex aspect-[3/1] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
          {store.banner_url ? (
            <img
              src={store.banner_url}
              alt={store.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="text-6xl font-black text-slate-700">
              {store.name.charAt(0)}
            </span>
          )}
        </div>

        <div className="mt-10">
          <StoreDetails store={store} />
        </div>

        <div className="mt-12 flex flex-col gap-8">
          <StoreOffers offers={offers} />

          <EmptyState
            icon={Star}
            title="Avaliações em breve"
            description="Estamos preparando o sistema de avaliações de lojas. Volte em breve para ver o que os usuários acharam desta loja."
          />

          <StoreGrid stores={relatedStores} />
        </div>
      </div>

      <Footer />
    </main>
  );
}
