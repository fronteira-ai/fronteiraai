import { Store } from "@/types/store";
import { Product } from "@/types/product";

export interface Offer {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  currency: string;
  stock: boolean;
  installments: number | null;
  warranty: string | null;
  cashback: number | null;
  url: string | null;
  created_at: string;
  updated_at: string;
}

export interface OfferWithStore extends Offer {
  store: Store | null;
}

export interface OfferWithProduct extends Offer {
  product: Product | null;
}