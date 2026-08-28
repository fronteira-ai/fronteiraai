/**
 * Merchant Feed Platform — secure feed fetcher.
 *
 * A URL do feed é INSUMO EXTERNO → proteção contra SSRF:
 *   - apenas HTTP/HTTPS públicos (bloqueia localhost/redes privadas/metadata);
 *   - response com tamanho limitado (bounded body, corta em MAX_BODY_BYTES);
 *   - redirects limitados e revalidados;
 *   - timeouts;
 *   - conditional fetch (If-None-Match / If-Modified-Since) → retorna 304 como
 *     "no change" sem transferência desnecessária.
 */

export interface FeedFetchOptions {
  url: string;
  /** Etag/Last-Modified do fetch anterior para conditional request. */
  etag?: string | null;
  lastModified?: string | null;
  /** Máx. bytes do body (corta além disso — proteção contra bombs). */
  maxBytes?: number;
  timeoutMs?: number;
  /** Sinal externo para abortar. */
  signal?: AbortSignal;
}

export interface FeedFetchResult {
  ok: boolean;
  status: number;
  bytes: number;
  body: string;
  etag?: string | null;
  lastModified?: string | null;
  /** true quando o servidor retornou 304 (sem mudança — observação válida). */
  notModified: boolean;
  finalUrl: string;
  error?: string;
}

export const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20 MiB
export const DEFAULT_TIMEOUT_MS = 20_000;

const REDIRECT_STATUS = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 3;

// Endereços IPv4/6 de loopback/privação/metadata que NÃO podem ser alvo.
const BLOCKED_HOSTNAMES = ["localhost", "127.0.0.1", "::1", "0.0.0.0", "169.254.169.254"];
const PRIVATE_IP_PREFIXES = ["10.", "192.168.", "172.16.", "172.17.", "172.18.", "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.", "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.", "172.31.", "169.254."];

export function assertSafeFeedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("FEED_URL_INVALID");
  }
  if (!/^https?:$/.test(url.protocol)) {
    throw new Error("FEED_URL_PROTOCOL_NOT_HTTP");
  }
  const host = url.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(host)) throw new Error("FEED_URL_BLOCKED_HOST");
  if (PRIVATE_IP_PREFIXES.some((p) => host.startsWith(p))) throw new Error("FEED_URL_PRIVATE_IP");
  return url;
}

export class SecureFeedFetcher {
  async fetch(options: FeedFetchOptions): Promise<FeedFetchResult> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

    let current = assertSafeFeedUrl(options.url);
    let etag = options.etag ?? undefined;
    let lastModified = options.lastModified ?? undefined;
    let redirects = 0;
    let finalUrl = current.toString();
    let status = 0;
    let bytes = 0;
    let body = "";
    let notModified = false;
    let error: string | undefined;

    try {
      while (true) {
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), timeoutMs);
        // Une um signal externo, se dado.
        const signal = options.signal ? anyAbort([controller.signal, options.signal]) : controller.signal;

        let response: Response;
        try {
          response = await fetch(current.toString(), {
            method: "GET",
            headers: {
              "User-Agent": "ParaguAI-MerchantFeed/1.0",
              Accept: "application/rss+xml,application/xml,text/xml,*/*;q=0.8",
              ...(etag ? { "If-None-Match": etag } : {}),
              ...(lastModified ? { "If-Modified-Since": lastModified } : {}),
            },
            signal,
            redirect: "manual",
          });
        } finally {
          clearTimeout(t);
        }

        // Redirect manual (revalidado contra SSRF a cada hop).
        if (REDIRECT_STATUS.has(response.status)) {
          const loc = response.headers.get("location");
          if (!loc) { error = `REDIRECT_NO_LOCATION (${response.status})`; status = response.status; break; }
          if (++redirects > MAX_REDIRECTS) { error = "REDIRECT_MAX"; status = response.status; break; }
          current = assertSafeFeedUrl(new URL(loc, current).toString());
          finalUrl = current.toString();
          continue;
        }

        status = response.status;
        if (response.status === 304) {
          notModified = true;
          // reutiliza etag existente
          break;
        }

        // Cap de tamanho: lê o body em chunk até MAX.
        if (!response.ok) { error = `HTTP_${response.status}`; break; }
        const buf = await readBounded(response, maxBytes);
        bytes = buf.byteLength;
        body = new TextDecoder("utf-8").decode(buf);

        const newEtag = response.headers.get("etag") || undefined;
        const newLm = response.headers.get("last-modified") || undefined;
        if (newEtag) etag = newEtag;
        if (newLm) lastModified = newLm;
        break;
      }

      if (body.length === 0 && !notModified && !error && status === 200) {
        error = "EMPTY_BODY";
      }

      return {
        ok: !error && !notModified && status === 200,
        status,
        bytes,
        body,
        etag: etag ?? null,
        lastModified: lastModified ?? null,
        notModified,
        finalUrl,
        error,
      };
    } catch (e) {
      const msg = (e as Error).message || String(e);
      const reason = msg.includes("abort") ? "TIMEOUT" : `FETCH_ERROR:${msg.slice(0, 80)}`;
      return {
        ok: false,
        status: 0,
        bytes,
        body: "",
        notModified: false,
        finalUrl,
        error: reason,
      };
    }
  }
}

function anyAbort(signals: AbortSignal[]): AbortSignal {
  // Se ao menos um abortar, aborta o combinado. Implementação mínima sem helper.
  const ctrl = new AbortController();
  for (const s of signals) {
    if (s.aborted) { ctrl.abort(); break; }
    s.addEventListener("abort", () => ctrl.abort(), { once: true });
  }
  return ctrl.signal;
}

async function readBounded(response: Response, maxBytes: number): Promise<Uint8Array> {
  if (!response.body) return new Uint8Array(0);
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      // trunca no limite
      const overflow = total - maxBytes;
      const keep = value.subarray(0, Math.max(0, value.byteLength - overflow));
      chunks.push(keep);
      break;
    }
    chunks.push(value);
  }
  const merged = new Uint8Array(chunks.reduce((a, b) => a + b.byteLength, 0));
  let off = 0;
  for (const c of chunks) { merged.set(c, off); off += c.byteLength; }
  return merged;
}
