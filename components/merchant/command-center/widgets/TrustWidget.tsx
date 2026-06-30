import Link from "next/link";
import type { ExecutiveSummary } from "@/src/domains/merchant-intelligence/types";
import { Shield, CheckCircle, Star, Award, ChevronRight } from "lucide-react";

interface Props {
  data: ExecutiveSummary;
}

function TrustBar({ score }: { score: number }) {
  const color =
    score >= 70 ? "bg-emerald-500" : score >= 40 ? "bg-blue-500" : score >= 20 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-400">Trust Score</span>
        <span className="text-sm font-bold text-white">{score}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-700">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function SignalRow({ icon: Icon, label, value, active }: { icon: typeof Shield; label: string; value: string | number; active: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <Icon size={13} className={active ? "text-emerald-400" : "text-slate-500"} />
        <span className="text-xs text-slate-300">{label}</span>
      </div>
      <span className={`text-xs font-medium ${active ? "text-emerald-400" : "text-slate-500"}`}>
        {value}
      </span>
    </div>
  );
}

export function TrustWidget({ data }: Props) {
  const verifiedLabel =
    data.verifiedLevel === "none"
      ? "Não verificada"
      : data.verifiedLevel === "verified"
      ? "Verificada"
      : data.verifiedLevel === "premium"
      ? "Premium"
      : "Oficial";

  const needsAttention =
    data.trustScore < 40 || data.verificationCount === 0 || data.activeSignalCount === 0;

  return (
    <section
      aria-label="Central de Trust"
      className="rounded-2xl border border-slate-700/50 bg-slate-900/60 p-5 backdrop-blur-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-400">
          <Shield size={14} />
          Trust
        </h2>
        {needsAttention && (
          <span className="rounded-full bg-amber-900/50 px-2 py-0.5 text-xs font-medium text-amber-400">
            Atenção necessária
          </span>
        )}
      </div>

      <div className="mb-4">
        <TrustBar score={data.trustScore} />
      </div>

      <div className="divide-y divide-slate-700/30">
        <SignalRow
          icon={CheckCircle}
          label="Verificações aprovadas"
          value={data.verificationCount}
          active={data.verificationCount > 0}
        />
        <SignalRow
          icon={Shield}
          label="Sinais ativos"
          value={data.activeSignalCount}
          active={data.activeSignalCount > 0}
        />
        <SignalRow
          icon={Star}
          label="Avaliações de compradores"
          value={data.totalReviews}
          active={data.totalReviews > 0}
        />
        <SignalRow
          icon={Award}
          label="Nível de verificação"
          value={verifiedLabel}
          active={data.verifiedLevel !== "none"}
        />
      </div>

      <Link
        href="/merchant/trust"
        className="mt-4 flex items-center justify-center gap-1.5 rounded-xl border border-slate-700/50 py-2 text-xs font-medium text-slate-300 hover:border-slate-600 hover:bg-slate-800/50 transition-colors"
      >
        Central de Trust
        <ChevronRight size={12} />
      </Link>
    </section>
  );
}
