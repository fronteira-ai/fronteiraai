import { Product } from "@/types/product";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

export interface SearchResponse {
  query: string;
  products: Product[];
  stores: Store[];
  brands: Brand[];
  categories: Category[];
  total: number;
  durationMs: number;
}
