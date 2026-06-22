export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  country: string;
  rating: number;
  logo_url: string | null;
  banner_url: string | null;
  verified: boolean;
  created_at: string;
}