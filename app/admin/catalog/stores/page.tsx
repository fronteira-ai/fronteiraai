"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, CheckCircle2 } from "lucide-react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/contexts/admin/ToastContext";

interface Store { id: string; name: string; slug: string; city: string; country: string; is_verified: boolean; active: boolean }

export default function StoresPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/stores?page=${page}&perPage=20`)
      .then((r) => r.json() as Promise<{ data: Store[]; totalPages: number }>)
      .then((json) => { setData(json.data ?? []); setTotalPages(json.totalPages ?? 1); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, reloadKey]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/stores/${deleteId}`, { method: "DELETE" });
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

  const cols: Column<Store>[] = [
    { key: "name", header: "Nome", render: (r) => (
      <Link href={`/admin/catalog/stores/${r.id}`} className="text-indigo-400 hover:text-indigo-300 font-medium">{r.name}</Link>
    )},
    { key: "slug", header: "Slug", render: (r) => <span className="text-slate-500 text-xs font-mono">{r.slug}</span> },
    { key: "city", header: "Cidade", render: (r) => `${r.city}, ${r.country}` },
    { key: "is_verified", header: "Verificada", render: (r) => r.is_verified
      ? <CheckCircle2 className="w-4 h-4 text-green-400" />
      : <span className="text-slate-600">—</span>
    },
    { key: "active", header: "Ativa", render: (r) => (
      <span className={`px-2 py-0.5 text-xs rounded-full ${r.active ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}>
        {r.active ? "Ativa" : "Inativa"}
      </span>
    )},
    { key: "actions", header: "", className: "text-right w-24", render: (r) => (
      <AdminButton variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>Excluir</AdminButton>
    )},
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Lojas</h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerencie as lojas parceiras</p>
        </div>
        <Link href="/admin/catalog/stores/new">
          <AdminButton icon={<Plus className="w-4 h-4" />}>Nova Loja</AdminButton>
        </Link>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AdminDataTable columns={cols} data={data} keyField="id" loading={loading} emptyMessage="Nenhuma loja."
          page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
      <ConfirmDialog open={!!deleteId} title="Excluir loja?" message="Todas as ofertas desta loja serão removidas junto."
        confirmLabel="Excluir" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </div>
  );
}
