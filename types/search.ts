import { ProductCatalogItem } from "@/types/product";
import { Store } from "@/types/store";
import { Brand } from "@/types/brand";
import { Category } from "@/types/category";

export interface SearchResponse {
  query: string;
  products: ProductCatalogItem[];
  stores: Store[];
  brands: Brand[];
  categories: Category[];
  total: number;
  durationMs: number;
}
