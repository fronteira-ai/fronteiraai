import { notFound } from "next/navigation";
import Image from "next/image";
import { Star } from "lucide-react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import StoreDetails from "@/components/store/StoreDetails";
import StoreOffers from "@/components/store/StoreOffers";
import StoreGrid from "@/components/store/StoreGrid";
import ClaimStoreButton from "@/components/store/ClaimStoreButton";
import EmptyState from "@/components/ui/EmptyState";
import Breadcrumb from "@/components/ui/Breadcrumb";
import { isStoreUnclaimed } from "@/services/stores-public.service";
import { getCachedStore, getCachedStoreOffers, getCachedRelatedStores } from "./_cache";

type Params = Promise<{ slug: string }>;

export default async function StorePage({ params }: { params: Params }) {
  const { slug } = await params;

  const store = await getCachedStore(slug);

  if (!store) {
    notFound();
  }

  const [offers, relatedStores, unclaimed] = await Promise.all([
    getCachedStoreOffers(store.id),
    getCachedRelatedStores(store.id),
    isStoreUnclaimed(store.id),
  ]);

  return (
    <main className="min-h-screen bg-[#050816] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-6 pt-32 pb-24">
        <Breadcrumb items={[{ label: store.name }]} />

        <div className="relative mt-10 aspect-[3/1] w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-950">
          {store.cover_image ? (
            <Image
              src={store.cover_image}
              alt={store.name}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-6xl font-black text-slate-700">
                {store.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        <div className="mt-10">
          <StoreDetails store={store} />
        </div>

        {unclaimed && (
          <div className="mt-6">
            <ClaimStoreButton storeSlug={store.slug} />
          </div>
        )}

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
