// Campos confirmados via auditoria direta do Supabase (Sprint 3.4.1, ADR-008).
// `banner_url`/`verified` não existem no banco real (são `cover_image`/
// `is_verified`) — ver docs/DOMAIN_MODEL.md e docs/DECISIONS.md (ADR-009).
export interface Store {
  id: string;
  name: string;
  slug: string;
  description: string;
  city: string;
  country: string;
  rating: number;
  logo_url: string | null;
  cover_image: string | null;
  is_verified: boolean;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  opening_hours: string | null;
  instagram: string | null;
  latitude: number | null;
  longitude: number | null;
  delivery: boolean | null;
  pickup: boolean | null;
  pix_br: boolean | null;
  active: boolean | null;
  created_at: string;
}
