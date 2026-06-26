"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, PackageCheck } from "lucide-react";
import { AdminDataTable, type Column } from "@/components/admin/ui/AdminDataTable";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { useToast } from "@/contexts/admin/ToastContext";

interface Offer {
  id: string;
  price_usd: number;
  price_brl: number | null;
  in_stock: boolean;
  currency: string;
  product?: { name: string; slug: string } | null;
  store?: { name: string; slug: string } | null;
}

export default function OffersPage() {
  const { toast } = useToast();
  const [data, setData] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    fetch(`/api/admin/offers?page=${page}&perPage=20`)
      .then((r) => r.json() as Promise<{ data: Offer[]; totalPages: number }>)
      .then((json) => { setData(json.data ?? []); setTotalPages(json.totalPages ?? 1); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, reloadKey]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/admin/offers/${deleteId}`, { method: "DELETE" });
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

  const cols: Column<Offer>[] = [
    { key: "product", header: "Produto", render: (r) => r.product?.name ?? "—" },
    { key: "store", header: "Loja", render: (r) => r.store?.name ?? "—" },
    { key: "price_usd", header: "Preço USD", render: (r) => `$ ${r.price_usd.toFixed(2)}` },
    { key: "price_brl", header: "Preço BRL", render: (r) => r.price_brl ? `R$ ${r.price_brl.toFixed(2)}` : "—" },
    { key: "in_stock", header: "Estoque", render: (r) => r.in_stock
      ? <PackageCheck className="w-4 h-4 text-green-400" />
      : <span className="text-slate-600">Sem estoque</span>
    },
    { key: "actions", header: "", className: "text-right w-24", render: (r) => (
      <AdminButton variant="danger" size="sm" onClick={() => setDeleteId(r.id)}>Excluir</AdminButton>
    )},
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-white">Ofertas</h1>
          <p className="text-slate-400 text-sm mt-0.5">Preços e disponibilidade por loja</p>
        </div>
        <Link href="/admin/catalog/offers/new">
          <AdminButton icon={<Plus className="w-4 h-4" />}>Nova Oferta</AdminButton>
        </Link>
      </div>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <AdminDataTable columns={cols} data={data} keyField="id" loading={loading}
          emptyMessage="Nenhuma oferta." page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
      <ConfirmDialog open={!!deleteId} title="Excluir oferta?" message="O histórico de preços vinculado será mantido."
        confirmLabel="Excluir" onConfirm={handleDelete} onCancel={() => setDeleteId(null)} danger />
    </div>
  );
}
