"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/contexts/admin/ToastContext";

interface Category { id: string; name: string; slug: string; icon: string | null }

export default function CategoriesPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json() as Promise<{ data: Category[] }>)
      .then((json) => { setData(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [reloadKey]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/categories/${deleteId}`, { method: "DELETE" });
    const json = await res.json() as { message?: string; error?: string };
    setDeleteId(null);
    if (res.ok) {
      toast.success(json.message ?? "Removida");
      setLoading(true);
      setReloadKey((k) => k + 1);
    } else {
      toast.error(json.error ?? "Erro ao remover");
    }
  }

  const cols: Column<Category>[] = [
    { key: "name", header: "Nome", render: (r) => (
      <Link href={`/admin/catalog/categories/${r.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">{r.name}</Link>
    )},
    { key: "slug", header: "Slug", render: (r) => <span className="text-slate-500 text-xs font-mono">{r.slug}</span> },
    { key: "icon", header: "Ícone", render: (r) => r.icon ?? "—" },
    { key: "actions", header: "", className: "text-right w-24", render: (r) => (
      <AdminButton variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>Excluir</AdminButton>
    )},
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Categorias</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie as categorias do catálogo</p>
        </div>
        <Link href="/admin/catalog/categories/new">
          <AdminButton icon={<Plus className="w-4 h-4" />}>Nova Categoria</AdminButton>
        </Link>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AdminDataTable columns={cols} data={data} keyField="id" loading={loading} emptyMessage="Nenhuma categoria." />
      </div>
      <ConfirmDialog open={!!deleteId} title="Excluir categoria?" message="Produtos desta categoria perderão o vínculo."
        confirmLabel="Excluir" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </div>
  );
}
