/**
 * Merchant Feed Platform — JSON/API pagination (bounded, declarative).
 *
 * Nem todo feed é uma única resposta. Para APIs de lojista com paginação,
 * este paginator itera páginas de forma **declarativa** (caminho do cursor na
 * config) e **limitada** (MAX_PAGES — nunca loop infinito), reutilizando o
 * fetch seguro (SSRF/bounded/timeout). Não assume que tudo vem numa resposta.
 *
 * Segurança: o cursor só é lido de um path (sem eval) e a próxima URL é um
 * href resolvível, validado por SecureFeedFetcher.
 */

import { SecureFeedFetcher } from "../fetcher/SecureFeedFetcher";
import type { MerchantPaginationConfig } from "../config/MerchantSourceConfig";
import { resolvePath } from "../config/MerchantSourceConfig";

const MAX_PAGES = 50;

export interface MerchantPageResult {
  bodies: string[];
  pages: number;
  lastError?: string;
}

export class MerchantJsonPaginator {
  constructor(
    private readonly deps: {
      fetchPage?: (url: string, etag?: string | null, lastModified?: string | null) => Promise<{ body: string; ok: boolean; error?: string; nextUrl?: string }>;
      fetcher?: SecureFeedFetcher;
    } = {},
  ) {}

  /**
   * Percorre páginas enquanto `pagination.nextPageField` existir na raiz e
   * for diferente do valor anterior. Se `nextPageField` ausente → 1 página.
   * @param baseUrl URL inicial (página 1 / todas se sem paginação).
   */
  async collect(baseUrl: string, pagination?: MerchantPaginationConfig): Promise<MerchantPageResult> {
    if (!pagination?.nextPageField) {
      const one = await this.fetchOnce(baseUrl);
      return { bodies: one.ok && one.body ? [one.body] : [], pages: 0, lastError: one.error };
    }

    const seen = new Set<string>();
    const cursorValues = new Set<string>();
    const bodies: string[] = [];
    let url = baseUrl;
    let pages = 0;
    let lastError: string | undefined;

    for (let i = 0; i < MAX_PAGES; i++) {
      if (seen.has(url)) break;
      seen.add(url);

      const page = await this.fetchOnce(url);
      if (!page.ok || !page.body) {
        lastError = page.error ?? "PAGE_FETCH_FAILED";
        break;
      }
      bodies.push(page.body);
      pages++;

      // Le o cursor da próxima página na raiz do JSON da página atual.
      let next: unknown;
      try {
        next = resolvePath(JSON.parse(page.body), pagination.nextPageField);
      } catch {
        break;
      }
      const nextStr = typeof next === "string" ? next.trim() : "";
      if (!nextStr || nextStr === url || cursorValues.has(nextStr)) break;
      cursorValues.add(nextStr);
      try {
        url = new URL(nextStr, url).toString();
      } catch {
        lastError = "NEXT_PAGE_NOT_URL";
        break;
      }
    }

    return { bodies, pages, lastError };
  }

  private async fetchOnce(url: string): Promise<{ body: string; ok: boolean; error?: string }> {
    if (this.deps.fetchPage) {
      const r = await this.deps.fetchPage(url);
      return { body: r.body ?? "", ok: r.ok, error: r.error };
    }
    const fetcher = this.deps.fetcher ?? new SecureFeedFetcher();
    const res = await fetcher.fetch({ url });
    if (!res.ok || res.notModified) {
      return { body: "", ok: false, error: res.error ?? `HTTP_${res.status}` };
    }
    return { body: res.body, ok: true };
  }
}
