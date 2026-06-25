import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  brand_id: string;
  category_id: string;
  image_url: string | null;
  specifications: Record<string, string> | null;
  created_at: string;
}

export interface ProductWithRelations extends Product {
  brand: Brand | null;
  category: Category | null;
}

// Item do catálogo (/products): produto + relações, com o preço mais baixo
// entre suas ofertas já resolvido para exibição no grid (services/product
// .service.ts -> getProductsCatalog). lowestPriceUSD é null quando o produto
// não tem nenhuma oferta cadastrada ainda.
export interface ProductCatalogItem extends ProductWithRelations {
  lowestPriceUSD: number | null;
  inStock: boolean;
}

// Forma resumida de produto + melhor oferta, usada em vitrines (ex: Home).
// Mapeado a partir de ProductCatalogItem em app/page.tsx — priceUSD e
// storeName são opcionais porque um produto pode ainda não ter ofertas.
export interface ProductHighlight {
  id: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  storeName?: string;
  priceUSD?: number;
  originalPriceUSD?: number;
  inStock: boolean;
}