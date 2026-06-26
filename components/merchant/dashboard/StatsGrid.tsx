import { Package, CheckCircle2, ImageOff, Tag, DollarSign, Store } from "lucide-react";
import type { MerchantDashboardStats } from "@/types/merchant";

interface Props {
  stats: MerchantDashboardStats;
}

export function StatsGrid({ stats }: Props) {
  const cards = [
    { label: "Total de Produtos", value: stats.totalProducts, icon: Package, color: "text-blue-400", bg: "bg-blue-500/10" },
    { label: "Produtos Ativos", value: stats.activeProducts, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10" },
    { label: "Sem Imagem", value: stats.productsNoImage, icon: ImageOff, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Sem Categoria", value: stats.productsNoCategory, icon: Tag, color: "text-orange-400", bg: "bg-orange-500/10" },
    { label: "Sem Preço", value: stats.productsNoPrice, icon: DollarSign, color: "text-red-400", bg: "bg-red-500/10" },
    { label: "Lojas Vinculadas", value: stats.totalStores, icon: Store, color: "text-purple-400", bg: "bg-purple-500/10" },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-slate-500 font-medium">{card.label}</span>
            <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          <p className="text-2xl font-bold text-white">{card.value.toLocaleString("pt-BR")}</p>
        </div>
      ))}
    </div>
  );
}
