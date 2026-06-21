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