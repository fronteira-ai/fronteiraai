"use client";

import { Heart } from "lucide-react";
import { useFavorites } from "@/hooks/useFavorites";
import { ProductWithRelations } from "@/types/product";

type Props = {
  product: ProductWithRelations;
};

export default function FavoriteButton({ product }: Props) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const active = isFavorite(product.id);

  function handleClick() {
    toggleFavorite({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      imageUrl: product.image_url,
      addedAt: new Date().toISOString(),
    });
  }

  return (
    <button
      onClick={handleClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-red-500 bg-red-500/10 text-red-400"
          : "border-slate-700 text-slate-300 hover:border-red-500 hover:text-red-400"
      }`}
    >
      <Heart size={16} fill={active ? "currentColor" : "none"} />
      {active ? "Favoritado" : "Favoritar"}
    </button>
  );
}
