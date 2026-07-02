import { Package, Store, Tag, Layers, DollarSign, Clock } from "lucide-react";
import type { DashboardStats } from "@/types/admin";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { toImportLogShape } from "@/lib/sync-run-mapper";

async function getStats(): Promise<DashboardStats | null> {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return null;
  const db = auth.serviceClient;

  const [products, offers, stores, brands, categories, priceHistory, lastRun] =
    await Promise.all([
      db.from("products").select("id", { count: "exact", head: true }),
      db.from("offers").select("id", { count: "exact", head: true }),
      db.from("stores").select("id", { count: "exact", head: true }),
      db.from("brands").select("id", { count: "exact", head: true }),
      db.from("categories").select("id", { count: "exact", head: true }),
      db.from("price_history").select("id", { count: "exact", head: true }),
      db.from("connector_sync_runs").select("*").order("started_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

  return {
    products: products.count ?? 0,
    offers: offers.count ?? 0,
    stores: stores.count ?? 0,
    brands: brands.count ?? 0,
    categories: categories.count ?? 0,
    priceHistoryEntries: priceHistory.count ?? 0,
    lastImport: lastRun.data ? toImportLogShape(lastRun.data) : null,
  };
}

export default async function AdminDashboard() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");

  const stats = await getStats();

  const cards = [
    { label: "Produtos", value: stats?.products ?? 0, icon: Package, color: "text-blue-400" },
    { label: "Ofertas", value: stats?.offers ?? 0, icon: DollarSign, color: "text-green-400" },
    { label: "Lojas", value: stats?.stores ?? 0, icon: Store, color: "text-purple-400" },
    { label: "Marcas", value: stats?.brands ?? 0, icon: Tag, color: "text-yellow-400" },
    { label: "Categorias", value: stats?.categories ?? 0, icon: Layers, color: "text-pink-400" },
    { label: "Histórico de Preços", value: stats?.priceHistoryEntries ?? 0, icon: Clock, color: "text-cyan-400" },
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral do catálogo ParaguAI</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">{card.label}</span>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <p className="text-3xl font-bold text-white">{card.value.toLocaleString("pt-BR")}</p>
          </div>
        ))}
      </div>

      {stats?.lastImport && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Última Importação</h2>
          <div className="flex flex-wrap gap-6 text-sm">
            <div>
              <span className="text-slate-500">Connector</span>
              <p className="text-white font-medium">{stats.lastImport.connector_id}</p>
            </div>
            <div>
              <span className="text-slate-500">Registros</span>
              <p className="text-white font-medium">{stats.lastImport.total_persisted}</p>
            </div>
            <div>
              <span className="text-slate-500">Erros</span>
              <p className={`font-medium ${stats.lastImport.total_errors > 0 ? "text-red-400" : "text-green-400"}`}>
                {stats.lastImport.total_errors}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Status</span>
              <p className={`font-medium ${stats.lastImport.success ? "text-green-400" : "text-red-400"}`}>
                {stats.lastImport.success ? "Sucesso" : "Falha"}
              </p>
            </div>
            <div>
              <span className="text-slate-500">Data</span>
              <p className="text-white font-medium">
                {new Date(stats.lastImport.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
