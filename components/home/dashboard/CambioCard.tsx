import { ArrowLeftRight, ArrowDown, ArrowUp } from "lucide-react";
import DashboardCardShell from "./DashboardCardShell";
import Sparkline from "@/components/ui/Sparkline";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { getExchangeSnapshot, type ExchangeRatePoint } from "@/lib/home-premium-service";
import { formatTimestamp } from "@/src/domains/exchange";

// ─────────────────────────────────────────────────────────────────────────────
// Mission 05.31B — "Câmbio ao vivo" (home). EXCEÇÃO PONTUAL AO ADR-050,
// autorizada expressamente pelo CEO **apenas para este componente**
// (components/home/dashboard/CambioCard.tsx). Nenhum outro arquivo de
// components/home/** ou app/page.tsx foi tocado.
//
// Três defeitos corrigidos, todos apontados pelo CEO:
//
// (1) `0,00% ↑` verde: o cálculo antigo comparava primeiro×último ponto da
//     janela inteira e `up = (pct ?? 0) >= 0`. Como as observações persistidas
//     eram IDÊNTICAS (mesma taxa reescrita a cada execução do cron), o
//     percentual dava 0,00% e AINDA ASSIM exibia seta verde para cima. Agora só
//     há indicador com **variação histórica validada**: ≥ 2 observações com
//     TIMESTAMPS DISTINTOS, janela mínima de MIN_WINDOW_HOURS, taxas > 0 e
//     delta ESTRITAMENTE diferente de zero. Fora disso: nada é exibido.
//
// (2) Alinhamento/tipografia/responsividade: grade de 2 colunas fixas
//     (`grid-cols-2`) com número `text-3xl` e um selo `text-xs` alinhado por
//     `items-end` — quebrava em telas estreitas. Agora: 1 coluna no mobile,
//     2 a partir de `sm`, `items-baseline` com o selo em linha própria,
//     `tabular-nums` para alinhar dígitos e espaçamento consistente.
//
// (3) Procedência e honestidade comercial: a taxa internacional NÃO é mais
//     apresentada como câmbio comercial de Ciudad del Este. O bloco comercial
//     vem de `commercialQuote` (prop opcional) e, enquanto não houver cotação
//     comercial CONFIRMADA, exibe **"Cotação comercial indisponível"** — sem
//     inventar valor. As taxas internacionais ficam num bloco SEPARADO e
//     rotulado "Referência de mercado (internacional)".
//
// `commercialQuote` é opcional e o default é `null`, então `app/page.tsx`
// (congelado) continua funcionando sem alteração — o chamador passa a cotação
// quando a coleta existir (store_exchange_quotes, Mission 05.31, não aplicada).
// ─────────────────────────────────────────────────────────────────────────────

/** Janela mínima para que uma variação seja considerada validada. */
export const MIN_WINDOW_HOURS = 6;

/** Cotação comercial confirmada de uma loja (Cellshop/Shopping China). */
export interface CommercialQuote {
  /** Nome comercial exibido, ex.: "Cellshop". */
  storeName: string;
  rate: number;
  pairLabel: string;
  /** "cash" | "pix" | "card" | "unspecified" */
  paymentMethod: string;
  /** Canal oficial de origem, ex.: "site", "whatsapp", "telefone". */
  source: string;
  /** ISO — quando alguém confirmou a cotação. */
  confirmedAt: string;
}

const PAYMENT_LABEL: Record<string, string> = {
  cash: "dinheiro",
  pix: "Pix",
  card: "cartão",
  unspecified: "forma de pagamento não informada",
};

/**
 * Variação validada: `null` quando NÃO há base histórica real para afirmar
 * variação. Nunca devolve 0 — zero é ausência de variação, não uma tendência.
 */
export function validatedChange(history: ExchangeRatePoint[]): number | null {
  if (!Array.isArray(history) || history.length < 2) return null;
  const valued = history.filter((h) => h && Number.isFinite(h.rate) && h.rate > 0);
  if (valued.length < 2) return null;

  const stamps = new Set(valued.map((h) => h.capturedAt));
  if (stamps.size < 2) return null; // observações idênticas não são histórico

  const first = valued[0];
  const last = valued[valued.length - 1];
  const spanMs = new Date(last.capturedAt).getTime() - new Date(first.capturedAt).getTime();
  if (!Number.isFinite(spanMs) || spanMs < MIN_WINDOW_HOURS * 3_600_000) return null;

  const pct = ((last.rate - first.rate) / first.rate) * 100;
  if (!Number.isFinite(pct) || pct === 0) return null;
  return pct;
}

function Rate({
  label,
  current,
  history,
}: {
  label: string;
  current: { rate: number; capturedAt: string } | null;
  history: ExchangeRatePoint[];
}) {
  const pct = validatedChange(history);
  const up = pct !== null && pct > 0;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-2 flex flex-col gap-1">
        <p className="font-home-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
          {current ? current.rate.toFixed(2) : "—"}
        </p>
        {pct !== null ? (
          <span
            className={`inline-flex items-center gap-0.5 self-start text-xs font-semibold tabular-nums ${
              up ? "text-positive" : "text-negative"
            }`}
          >
            {up ? "+" : ""}
            {pct.toFixed(2)}%
            {up ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
          </span>
        ) : null}
      </div>
      <div className="mt-3 min-h-[28px]">
        <Sparkline
          values={history.map((h) => h.rate)}
          color={up ? "var(--color-positive)" : "var(--color-negative)"}
        />
      </div>
    </div>
  );
}

function CommercialBlock({ quote }: { quote: CommercialQuote | null }) {
  if (!quote) {
    return (
      <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] p-3 sm:p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Cotação comercial · Ciudad del Este
        </p>
        <p className="mt-2 text-sm font-semibold text-slate-300">Cotação comercial indisponível</p>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Aguardando confirmação oficial de Cellshop ou Shopping China. Nenhum valor é exibido no
          lugar da cotação real das lojas.
        </p>
      </div>
    );
  }

  const payment = PAYMENT_LABEL[quote.paymentMethod] ?? quote.paymentMethod;
  return (
    <div className="rounded-2xl border border-positive/30 bg-positive/5 p-3 sm:p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        Cotação comercial · {quote.storeName}
      </p>
      <div className="mt-2 flex flex-col gap-1">
        <p className="font-home-display text-2xl font-bold tabular-nums text-white sm:text-3xl">
          {quote.rate.toFixed(2)}
        </p>
        <p className="text-xs text-slate-400">{quote.pairLabel}</p>
      </div>
      <p className="mt-2 text-[11px] leading-relaxed text-slate-400">
        Fonte: {quote.source} · {payment} · confirmado em {formatTimestamp(quote.confirmedAt, false)}
      </p>
    </div>
  );
}

// Release 1.9 — Program F — Wave 2 (v0 realignment). The v0 ExchangeCard
// shows two rate columns; the real domain has exactly two currency pairs
// (UsdBrl, UsdPyg). Mission 05.31B separates the confirmed commercial rate
// (own block, "indisponível" until collected) from the international market
// reference, which is now explicitly labelled as such.
export default async function CambioCard({ commercialQuote = null }: { commercialQuote?: CommercialQuote | null }) {
  const client = getSupabaseServiceClient();
  const { usdBrl, usdPyg, history, usdPygHistory, usingFallback } = await getExchangeSnapshot(client);

  return (
    <DashboardCardShell icon={<ArrowLeftRight size={16} />} title="Câmbio ao vivo">
      <div className="flex flex-col gap-4">
        <CommercialBlock quote={commercialQuote} />

        {!usdBrl && !usdPyg ? (
          <p className="text-sm text-slate-500">Referência de mercado em sincronização.</p>
        ) : (
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Referência de mercado (internacional) — não é o câmbio praticado nas lojas
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <Rate label="USD → BRL" current={usdBrl} history={history} />
              <Rate label="USD → PYG" current={usdPyg} history={usdPygHistory} />
            </div>
            <div
              className={`mt-3 flex items-center gap-2 text-xs ${usingFallback ? "text-amber-400" : "text-slate-500"}`}
            >
              {!usingFallback ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-positive opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-positive" />
                </span>
              ) : null}
              {formatTimestamp((usdBrl ?? usdPyg)!.capturedAt, usingFallback)}
            </div>
          </div>
        )}
      </div>
    </DashboardCardShell>
  );
}
