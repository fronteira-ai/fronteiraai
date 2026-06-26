"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, AdminInput, AdminSelect } from "@/components/admin/ui/AdminFormField";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useToast } from "@/contexts/admin/ToastContext";

interface Product { id: string; name: string }
interface Store { id: string; name: string }
interface OfferData {
  product_id?: string; store_id?: string; currency?: string;
  price_usd?: number; price_brl?: number | null; old_price?: number | null;
  in_stock?: boolean; stock_quantity?: number | null; condition?: string | null;
  warranty?: string | null; cashback?: number | null; product_url?: string | null;
}
interface OfferFormProps { offerId?: string; initialData?: OfferData }

export function OfferForm({ offerId, initialData }: OfferFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [f, setF] = useState({
    product_id: initialData?.product_id ?? "",
    store_id: initialData?.store_id ?? "",
    currency: initialData?.currency ?? "USD",
    price_usd: String(initialData?.price_usd ?? ""),
    price_brl: String(initialData?.price_brl ?? ""),
    old_price: String(initialData?.old_price ?? ""),
    in_stock: initialData?.in_stock ?? true,
    stock_quantity: String(initialData?.stock_quantity ?? ""),
    condition: initialData?.condition ?? "",
    warranty: initialData?.warranty ?? "",
    cashback: String(initialData?.cashback ?? ""),
    product_url: initialData?.product_url ?? "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/products?perPage=100").then((r) => r.json() as Promise<{ data: Product[] }>),
      fetch("/api/admin/stores?perPage=100").then((r) => r.json() as Promise<{ data: Store[] }>),
    ]).then(([p, s]) => { setProducts(p.data ?? []); setStores(s.data ?? []); }).catch(() => {});
  }, []);

  function set(key: string, value: string | boolean) { setF((p) => ({ ...p, [key]: value })); }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!f.product_id) newErrors.product_id = "Produto é obrigatório";
    if (!f.store_id) newErrors.store_id = "Loja é obrigatória";
    if (!f.price_usd || Number(f.price_usd) <= 0) newErrors.price_usd = "Preço deve ser maior que 0";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    const url = offerId ? `/api/admin/offers/${offerId}` : "/api/admin/offers";
    const res = await fetch(url, {
      method: offerId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...f,
        price_usd: Number(f.price_usd),
        price_brl: f.price_brl ? Number(f.price_brl) : null,
        old_price: f.old_price ? Number(f.old_price) : null,
        stock_quantity: f.stock_quantity ? Number(f.stock_quantity) : null,
        cashback: f.cashback ? Number(f.cashback) : null,
        condition: f.condition || null,
        warranty: f.warranty || null,
        product_url: f.product_url || null,
      }),
    });
    const json = await res.json() as { message?: string; error?: string };
    setSaving(false);
    if (res.ok) { toast.success(json.message ?? "Salvo"); router.push("/admin/catalog/offers"); }
    else toast.error(json.error ?? "Erro ao salvar");
  }

  const currencyOptions = [{ value: "USD", label: "USD" }, { value: "BRL", label: "BRL" }, { value: "PYG", label: "PYG" }];
  const conditionOptions = [{ value: "new", label: "Novo" }, { value: "used", label: "Usado" }, { value: "refurbished", label: "Recondicionado" }];

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Produto" required error={errors.product_id}>
          <AdminSelect value={f.product_id} onChange={(e) => set("product_id", e.target.value)}
            options={products.map((p) => ({ value: p.id, label: p.name }))} placeholder="Selecionar produto" error={!!errors.product_id} />
        </AdminFormField>
        <AdminFormField label="Loja" required error={errors.store_id}>
          <AdminSelect value={f.store_id} onChange={(e) => set("store_id", e.target.value)}
            options={stores.map((s) => ({ value: s.id, label: s.name }))} placeholder="Selecionar loja" error={!!errors.store_id} />
        </AdminFormField>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <AdminFormField label="Moeda">
          <AdminSelect value={f.currency} onChange={(e) => set("currency", e.target.value)} options={currencyOptions} />
        </AdminFormField>
        <AdminFormField label="Preço USD" required error={errors.price_usd}>
          <AdminInput type="number" step="0.01" min="0" value={f.price_usd} onChange={(e) => set("price_usd", e.target.value)} error={!!errors.price_usd} placeholder="0.00" />
        </AdminFormField>
        <AdminFormField label="Preço BRL">
          <AdminInput type="number" step="0.01" min="0" value={f.price_brl} onChange={(e) => set("price_brl", e.target.value)} placeholder="0.00" />
        </AdminFormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Preço antigo (USD)">
          <AdminInput type="number" step="0.01" min="0" value={f.old_price} onChange={(e) => set("old_price", e.target.value)} />
        </AdminFormField>
        <AdminFormField label="Cashback (%)">
          <AdminInput type="number" step="0.1" min="0" max="100" value={f.cashback} onChange={(e) => set("cashback", e.target.value)} />
        </AdminFormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Condição">
          <AdminSelect value={f.condition} onChange={(e) => set("condition", e.target.value)} options={conditionOptions} placeholder="Selecionar" />
        </AdminFormField>
        <AdminFormField label="Garantia">
          <AdminInput value={f.warranty} onChange={(e) => set("warranty", e.target.value)} placeholder="ex: 12 meses" />
        </AdminFormField>
      </div>

      <AdminFormField label="URL do Produto">
        <AdminInput value={f.product_url} onChange={(e) => set("product_url", e.target.value)} placeholder="https://..." />
      </AdminFormField>

      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
        <input type="checkbox" checked={f.in_stock} onChange={(e) => set("in_stock", e.target.checked)} className="w-4 h-4 accent-indigo-600" />
        Em estoque
      </label>

      <div className="flex gap-3 pt-2">
        <AdminButton type="submit" loading={saving}>{offerId ? "Salvar" : "Criar Oferta"}</AdminButton>
        <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/catalog/offers")}>Cancelar</AdminButton>
      </div>
    </form>
  );
}
