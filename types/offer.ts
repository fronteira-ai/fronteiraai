import { Store } from "@/types/store";
import { Product } from "@/types/product";

// Campos confirmados via auditoria direta do Supabase (Sprint 3.4.1, ADR-008).
// Não existem `price`/`stock`/`installments`/`url` no banco real — ver
// docs/DOMAIN_MODEL.md e docs/DECISIONS.md (ADR-008/ADR-009).
export interface Offer {
  id: string;
  product_id: string;
  store_id: string;
  currency: string;
  price_usd: number;
  price_brl: number;
  old_price: number | null;
  in_stock: boolean;
  available: boolean;
  stock_quantity: number | null;
  condition: string | null;
  warranty: string | null;
  cashback: number | null;
  product_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferWithStore extends Offer {
  store: Store | null;
}

export interface OfferWithProduct extends Offer {
  product: Product | null;
}
