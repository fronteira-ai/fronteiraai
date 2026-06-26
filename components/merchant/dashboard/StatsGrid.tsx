import { Package, CheckCircle2, ImageOff, Tag, DollarSign, Store } from "lucide-react";
import type { MerchantDashboardStats } from "@/types/merchant";

interface Props {
  stats: MerchantDashboardStats;
}

function healthIndicator(value: number, inverted = false) {
  if (inverted) {
    if (value === 0) return "text-emerald-400";
    if (value <= 3) return "text-yellow-400";
    return "text-red-400";
  }
  if (value > 0) return "text-emerald-400";
  return "text-slate-500";
}

export function StatsGrid({ stats }: Props) {
  const imageHealth = stats.totalProducts > 0
    ? Math.round(((stats.totalProducts - stats.productsNoImage) / stats.totalProducts) * 100)
    : 0;

  const cards = [
    {
      label: "Produtos publicados",
      value: stats.totalProducts.toLocaleString("pt-BR"),
      context: stats.totalProducts === 0 ? "Faça sua primeira importação" : stats.totalProducts < 10 ? "Adicione mais para aumentar visibilidade" : "Catálogo ativo",
      icon: Package,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Produtos em estoque",
      value: stats.activeProducts.toLocaleString("pt-BR"),
      context: stats.totalProducts > 0
        ? `${Math.round((stats.activeProducts / stats.totalProducts) * 100)}% do catálogo disponível`
        : "—",
      icon: CheckCircle2,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Cobertura de imagens",
      value: `${imageHealth}%`,
      context: imageHealth === 100 ? "Todos os produtos têm foto" : `${stats.productsNoImage} produtos sem imagem`,
      icon: ImageOff,
      color: imageHealth >= 80 ? "text-emerald-400" : imageHealth >= 50 ? "text-yellow-400" : "text-red-400",
      bg: imageHealth >= 80 ? "bg-emerald-500/10" : imageHealth >= 50 ? "bg-yellow-500/10" : "bg-red-500/10",
    },
    {
      label: "Sem categoria",
      value: stats.productsNoCategory.toLocaleString("pt-BR"),
      context: stats.productsNoCategory === 0 ? "Categorias completas" : "Reduz descobribilidade",
      icon: Tag,
      color: healthIndicator(stats.productsNoCategory, true),
      bg: stats.productsNoCategory === 0 ? "bg-emerald-500/10" : "bg-orange-500/10",
    },
    {
      label: "Sem preço",
      value: stats.productsNoPrice.toLocaleString("pt-BR"),
      context: stats.productsNoPrice === 0 ? "Todos os preços OK" : "Não aparecem nas buscas",
      icon: DollarSign,
      color: healthIndicator(stats.productsNoPrice, true),
      bg: stats.productsNoPrice === 0 ? "bg-emerald-500/10" : "bg-red-500/10",
    },
    {
      label: "Lojas vinculadas",
      value: stats.totalStores.toLocaleString("pt-BR"),
      context: stats.totalStores === 0 ? "Vincule sua loja" : stats.totalStores === 1 ? "Loja ativa" : `${stats.totalStores} lojas gerenciadas`,
      icon: Store,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
      {cards.map((card) => (
        <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500 font-medium leading-tight">{card.label}</span>
            <div className={`w-7 h-7 rounded-lg ${card.bg} flex items-center justify-center shrink-0`}>
              <card.icon className={`w-3.5 h-3.5 ${card.color}`} />
            </div>
          </div>
          <p className={`text-2xl font-bold ${card.color} mb-1`}>{card.value}</p>
          <p className="text-xs text-slate-600 leading-tight">{card.context}</p>
        </div>
      ))}
    </div>
  );
}
