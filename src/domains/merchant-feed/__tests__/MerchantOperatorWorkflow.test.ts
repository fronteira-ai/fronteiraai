import { MerchantOperatorWorkflow } from "../onboarding/MerchantOperatorWorkflow";
import { canOnboardMerchant, isValidSourceUrl, type MerchantAuthorizationRecord } from "../auth/MerchantAuthorization";
import type { MerchantSourceConfig } from "../config/MerchantSourceConfig";

const GOOD_JSON = JSON.stringify({ products: [
  { codigo: "1", title: "Smartphone A", preco: "199.50", marca: "L", estoque: "8", link_imagem: "https://x/1.jpg" },
  { codigo: "2", title: "Smartphone B", preco: "299.00", marca: "L", estoque: "0" },
] });

const JSON_CFG: MerchantSourceConfig = {
  sourceType: "JSON_FEED", feedUrl: "https://x/f.json", rootPath: "products",
  fieldMapping: { external_id: "codigo", title: "title", price: "preco", stock: "estoque", brand: "marca", image: "link_imagem" },
};

function fullAuth(over: Partial<MerchantAuthorizationRecord> = {}): MerchantAuthorizationRecord {
  return { merchantSlug: "shopping-china", authorizedBy: "Ops Maria", authorizationDate: new Date().toISOString(), sourceUrl: "https://x/f.json", allowedUsage: ["display_offers"], status: "ACTIVE", ...over };
}

describe("MerchantOperatorWorkflow — ACTIVATION GATE + AUTHORIZATION", () => {
  it("validate/preview é autônomo e reporta métricas (§17) sem escrita", async () => {
    const wf = new MerchantOperatorWorkflow();
    const report = await wf.validateAndPreview({ storeSlug: "loja", feedUrl: "https://x/f.json", sourceConfig: JSON_CFG, sourceType: "JSON_FEED" }, GOOD_JSON);
    expect(report.step).toBe("VALIDATE_PREVIEW");
    expect(report.validation?.totalItems).toBe(2);
    expect(report.validation?.valid).toBe(2);
    expect(report.validation?.invalid).toBe(0);
    expect(report.validation?.imageCoverage).toBe(0.5);
    expect(report.activation.canActivate).toBe(false); // validação NÃO ativa
  });

  it("validate ⇏ activate: requer autorização real do lojista", async () => {
    const wf = new MerchantOperatorWorkflow();
    const preview = await wf.validateAndPreview({ storeSlug: "loja", feedUrl: "https://x/f.json", sourceConfig: JSON_CFG, sourceType: "JSON_FEED" }, GOOD_JSON);
    // sem autorização → BLOCKED
    const blocked = wf.activate({ storeSlug: "loja", feedUrl: "https://x/f.json", sourceConfig: JSON_CFG, sourceType: "JSON_FEED" }, preview.validation!);
    expect(blocked.activation.canActivate).toBe(false);
    // com autorização real + validação OK → ativa
    const ok = wf.activate({ storeSlug: "loja", feedUrl: "https://x/f.json", sourceConfig: JSON_CFG, sourceType: "JSON_FEED", authorization: fullAuth() }, preview.validation!);
    expect(ok.activation.authorized).toBe(true);
    expect(ok.activation.canActivate).toBe(true);
    expect(ok.step).toBe("ACTIVATED");
    expect(ok.config?.sourceType).toBe("JSON_FEED");
  });

  it("autorização não é inventada: sem authorized_by/status/sourceUrl → não onboard", () => {
    expect(canOnboardMerchant(undefined)).toBe(false);
    expect(canOnboardMerchant(fullAuth({ authorizedBy: "" }))).toBe(false);
    expect(canOnboardMerchant(fullAuth({ status: "PENDING_LEGAL" }))).toBe(false);
    expect(canOnboardMerchant(fullAuth({ sourceUrl: "ftp://x" }))).toBe(false);
    expect(canOnboardMerchant(fullAuth())).toBe(true);
    expect(isValidSourceUrl("https://x/f.json")).toBe(true);
    expect(isValidSourceUrl("file:///etc/passwd")).toBe(false);
  });
});
