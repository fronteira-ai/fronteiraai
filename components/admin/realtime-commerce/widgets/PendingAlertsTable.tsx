import type { BuyerAlertCandidate } from "@/src/domains/realtime-commerce";

const ALERT_LABELS: Record<string, string> = {
  price_drop: "Queda de preço",
  stock_returned: "Voltou ao estoque",
  new_promotion: "Nova promoção",
  new_product: "Novo produto",
  relevant_change: "Mudança relevante",
};

export function PendingAlertsTable({ alerts }: { alerts: BuyerAlertCandidate[] | null }) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-sm text-slate-500">
        Nenhum candidato a alerta pendente.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-amber-400 bg-amber-500/5 border border-amber-500/20 rounded-lg p-3">
        Fundação do Buyer Alert Engine (Epic 8) — apenas modelo e priorização. Nenhum alerta é enviado ao comprador
        nesta Wave.
      </p>
      <div className="rounded-xl border border-slate-800 bg-slate-900 divide-y divide-slate-800">
        {alerts.map((a) => (
          <div key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="text-white text-sm font-medium">{ALERT_LABELS[a.alertType] ?? a.alertType}</p>
              <p className="text-slate-500 text-xs mt-0.5">{new Date(a.createdAt).toLocaleString("pt-BR")}</p>
            </div>
            <span className="text-slate-400 text-xs font-medium rounded-full border border-slate-700 px-2 py-1">
              prioridade {a.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
