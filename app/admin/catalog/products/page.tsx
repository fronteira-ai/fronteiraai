"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/contexts/admin/ToastContext";

interface Product {
  id: string;
  name: string;
  slug: string;
  brand?: { name: string } | null;
  category?: { name: string } | null;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams({ page: String(page), perPage: "20" });
    if (search) params.set("search", search);
    fetch(`/api/admin/products?${params}`)
      .then((r) => r.json() as Promise<{ data: Product[]; totalPages: number }>)
      .then((json) => {
        setData(json.data ?? []);
        setTotalPages(json.totalPages ?? 1);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [page, search, reloadKey]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/products/${deleteId}`, { method: "DELETE" });
    const json = await res.json() as { message?: string; error?: string };
    setDeleteId(null);
    if (res.ok) {
      toast.success(json.message ?? "Produto removido");
      setLoading(true);
      setReloadKey((k) => k + 1);
    } else {
      toast.error(json.error ?? "Erro ao remover produto");
    }
  }

  const cols: Column<Product>[] = [
    { key: "name", header: "Nome", render: (r) => (
      <Link href={`/admin/catalog/products/${r.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">
        {r.name}
      </Link>
    )},
    { key: "slug", header: "Slug", render: (r) => <span className="text-slate-500 text-xs font-mono">{r.slug}</span> },
    { key: "brand", header: "Marca", render: (r) => r.brand?.name ?? "—" },
    { key: "category", header: "Categoria", render: (r) => r.category?.name ?? "—" },
    { key: "actions", header: "", className: "text-right w-24", render: (r) => (
      <AdminButton variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>Excluir</AdminButton>
    )},
  ];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Produtos</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie o catálogo de produtos</p>
        </div>
        <Link href="/admin/catalog/products/new">
          <AdminButton icon={<Plus className="w-4 h-4" />}>Novo Produto</AdminButton>
        </Link>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
          />
        </div>

        <AdminDataTable
          columns={cols}
          data={data}
          keyField="id"
          loading={loading}
          emptyMessage="Nenhum produto encontrado."
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      <ConfirmDialog
        open={!!deleteId}
        title="Excluir produto?"
        message="Esta ação não pode ser desfeita. Ofertas vinculadas também serão afetadas."
        confirmLabel="Excluir"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        danger
      />
    </div>
  );
}
