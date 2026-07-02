// The permanent product identity (mission: "Product passa a representar a
// origem/importação. Canonical Product representa a identidade
// permanente."). canonical_slug is immutable once set — never regenerated
// for an existing row, since it's the basis of a future permanent public
// URL (/produto/<canonical_slug>, not wired live this Wave).
export interface CanonicalProduct {
  id: string;
  canonicalSlug: string;
  name: string;
  brandId: string | null;
  categoryId: string | null;
  imageUrl: string | null;
  specifications: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}
