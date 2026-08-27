import {
  buildGoogleMapsDirectionsUrl,
  canBuildRoute,
  FRIENDSHIP_BRIDGE_PLACE_QUERY,
} from "../maps";

type GeoTarget = {
  name: string;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

const base: GeoTarget = { name: "Shopping China", city: "Ciudad del Este", country: "Paraguay", address: null, latitude: null, longitude: null };

describe("buildGoogleMapsDirectionsUrl — PR-005 (Ponte da Amizade → loja)", () => {
  it("usa a Ponte Internacional da Amizade como origem canônica", () => {
    const url = buildGoogleMapsDirectionsUrl(base);
    expect(url).not.toBeNull();
    expect(url).toContain("google.com/maps/dir/");
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("api")).toBe("1");
    expect(params.get("origin")).toBe(FRIENDSHIP_BRIDGE_PLACE_QUERY);
  });

  it("prioriza latitude/longitude quando disponíveis (número formata sem vírgula — coord numérica)", () => {
    const url = buildGoogleMapsDirectionsUrl({ ...base, latitude: -25.519, longitude: -54.605 });
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("destination")).toBe("-25.519,-54.605");
  });

  it("usa o endereço completo quando presente e não-trivial", () => {
    const store: GeoTarget = { ...base, address: "Av. Monseñor Rodríguez, 123", latitude: null, longitude: null };
    const url = buildGoogleMapsDirectionsUrl(store);
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("destination")).toBe("Av. Monseñor Rodríguez, 123, Ciudad del Este, Paraguay");
  });

  it("coding encoda caracteres paraguaios/portugueses", () => {
    const store: GeoTarget = { ...base, name: "Perfumaria & Cia", address: "Rua Grande Solução, 42", latitude: null, longitude: null };
    const url = buildGoogleMapsDirectionsUrl(store);
    expect(url).not.toBeNull();
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("destination")).toBe("Rua Grande Solução, 42, Ciudad del Este, Paraguay");
    // & e espaços foram encodados (não deixam a URL quebrada)
    expect(url).not.toContain("destination= Rua");
  });

  it("sem endereço/coordenadas, usa nome + cidade + país como destino (loja resolvível)", () => {
    const url = buildGoogleMapsDirectionsUrl(base);
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("destination")).toBe("Shopping China, Ciudad del Este, Paraguay");
  });

  it("trata \"Centro\" como endereço ambíguo (usa nome+cidade em vez de rota para bairro vago)", () => {
    const store: GeoTarget = { ...base, address: "Centro", latitude: null, longitude: null };
    const url = buildGoogleMapsDirectionsUrl(store);
    const params = new URLSearchParams(new URL(url!).search);
    expect(params.get("destination")).toBe("Shopping China, Ciudad del Este, Paraguay");
  });

  it("retorna null quando a loja não tem nome (sem identificador utilizável)", () => {
    expect(buildGoogleMapsDirectionsUrl({ name: "", city: "Ciudad del Este" })).toBeNull();
  });
});

describe("canBuildRoute — nega rota sempre que possível, sem inventar coordenadas", () => {
  it("true com coordenadas, endereço aproveitável ou nome+cidade", () => {
    expect(canBuildRoute({ ...base, latitude: -25.5, longitude: -54.6 })).toBe(true);
    expect(canBuildRoute({ ...base, address: "Rua X, 10", latitude: null, longitude: null })).toBe(true);
    expect(canBuildRoute(base)).toBe(true); // nome+cidade
  });

  it("trata laje null/coords null como ausente sem quebrar", () => {
    expect(canBuildRoute({ name: "X", city: "CdE", address: null, latitude: null, longitude: null })).toBe(true);
  });

  it("endereço \"Centro\" sozinho não gera rota precisa mas nome+cidade cobre", () => {
    expect(canBuildRoute({ ...base, address: "Centro", latitude: null, longitude: null })).toBe(true);
  });
});
