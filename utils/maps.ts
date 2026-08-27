// Google Maps Directions — Ponte Internacional da Amizade → loja (PR-005).
//
// Origem canônica única da navegação: a Ponte Internacional da Amizade
// (brasileiro, direção Brasil → Paraguai). Não inventamos coordenadas: o Maps
// URL oficial resolve tanto origem quanto destino por texto/lat-lng.
//
// Destino priorizado (nunca coordenadas inventadas):
//   1. latitude/longitude verificadas (quando houver, com formato otimizado);
//   2. endereço completo (address + city + country) quando não-trivial;
//   3. nome da loja + cidade + país (o Maps resolve o estabelecimento real).
// Retorna `null` apenas quando não há identificador utilizável (não ocorre
// para lojas válidas — sempre há nome/cidade).

/** Rótulo da origem canônica (exibido ao usuário, se necessário). */
export const FRIENDSHIP_BRIDGE_LABEL = "Ponte Internacional da Amizade";

/** Place query estável/Maps URL para a Ponte — central aqui, não espalhado. */
export const FRIENDSHIP_BRIDGE_PLACE_QUERY = "Puente de la Amistad, Ciudad del Este";

type GeoTarget = {
  name: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

/** Addresses like a bare "Centro" are too vague to route to confidently —
 * treat them as missing (a full `name + city` Maps query beats "Centro"). */
function isUsableAddress(address: string | null | undefined): boolean {
  if (!address) return false;
  const t = address.trim();
  return t.length > 3 && !/^centro\.?$/i.test(t);
}

/** `true` quando a loja tem geodata/utilizável para gerar rota. Conservador:
 * nunca inventa coordenadas; se só tiver nome+cidade, ainda é navegável. */
export function canBuildRoute(store: GeoTarget): boolean {
  const hasCoords = typeof store.latitude === "number" && typeof store.longitude === "number";
  const hasUsableAddress = isUsableAddress(store.address);
  return hasCoords || hasUsableAddress || Boolean(store.name && store.city);
}

/**
 * Constroi um Google Maps Directions URL:
 *   origem = Ponte Internacional da Amizade
 *   destino = loja (lat/lng → address → name+city).
 * Retorna `null` se não há identificador utilizável (store sem nome/cidade).
 */
export function buildGoogleMapsDirectionsUrl(store: GeoTarget): string | null {
  if (!store?.name) return null;

  const hasCoords = typeof store.latitude === "number" && typeof store.longitude === "number";
  const hasUsableAddress = isUsableAddress(store.address);

  // Destino por prioridade.
  let destination: string;
  if (hasCoords) {
    destination = `${store.latitude},${store.longitude}`;
  } else if (hasUsableAddress) {
    destination = [(store.address ?? "").trim(), store.city ?? "", store.country ?? ""].filter(Boolean).join(", ");
  } else if (store.city) {
    destination = [store.name, store.city, store.country ?? "Paraguay"].filter(Boolean).join(", ");
  } else {
    // Último recurso honesto: nome da loja (o Maps resolve por nome).
    destination = store.name;
  }

  const params = new URLSearchParams({
    api: "1",
    origin: FRIENDSHIP_BRIDGE_PLACE_QUERY,
    destination,
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** CTA label estável (Design System pode ter string própria; esta é a default). */
export const DIRECTIONS_CTA_LABEL = "Como chegar";
