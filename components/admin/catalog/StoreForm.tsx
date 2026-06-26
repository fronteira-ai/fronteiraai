"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, AdminInput, AdminTextarea } from "@/components/admin/ui/AdminFormField";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useToast } from "@/contexts/admin/ToastContext";
import { slugify } from "@/utils/slug";

interface StoreData {
  name?: string; slug?: string; description?: string; city?: string; country?: string;
  phone?: string; whatsapp?: string; email?: string; website?: string; address?: string;
  logo_url?: string; is_verified?: boolean; active?: boolean;
}

interface StoreFormProps { storeId?: string; initialData?: StoreData }

export function StoreForm({ storeId, initialData }: StoreFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [f, setF] = useState({
    name: initialData?.name ?? "",
    slug: initialData?.slug ?? "",
    description: initialData?.description ?? "",
    city: initialData?.city ?? "Ciudad del Este",
    country: initialData?.country ?? "PY",
    phone: initialData?.phone ?? "",
    whatsapp: initialData?.whatsapp ?? "",
    email: initialData?.email ?? "",
    website: initialData?.website ?? "",
    address: initialData?.address ?? "",
    logo_url: initialData?.logo_url ?? "",
    is_verified: initialData?.is_verified ?? false,
    active: initialData?.active ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function set(key: string, value: string | boolean) {
    setF((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.name.trim()) { setErrors({ name: "Nome é obrigatório" }); return; }
    setSaving(true);
    const url = storeId ? `/api/admin/stores/${storeId}` : "/api/admin/stores";
    const res = await fetch(url, {
      method: storeId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, slug: f.slug || slugify(f.name) }),
    });
    const json = await res.json() as { message?: string; error?: string };
    setSaving(false);
    if (res.ok) { toast.success(json.message ?? "Salvo"); router.push("/admin/catalog/stores"); }
    else toast.error(json.error ?? "Erro ao salvar");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Nome" required error={errors.name}>
          <AdminInput value={f.name} onChange={(e) => { set("name", e.target.value); if (!storeId) set("slug", slugify(e.target.value)); }} error={!!errors.name} />
        </AdminFormField>
        <AdminFormField label="Slug">
          <AdminInput value={f.slug} onChange={(e) => set("slug", e.target.value)} className="font-mono" />
        </AdminFormField>
      </div>

      <AdminFormField label="Descrição">
        <AdminTextarea value={f.description} onChange={(e) => set("description", e.target.value)} rows={3} />
      </AdminFormField>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Cidade">
          <AdminInput value={f.city} onChange={(e) => set("city", e.target.value)} />
        </AdminFormField>
        <AdminFormField label="País" hint="ISO 3166-1 alpha-2 (PY, BR...)">
          <AdminInput value={f.country} onChange={(e) => set("country", e.target.value)} maxLength={2} />
        </AdminFormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Telefone"><AdminInput value={f.phone} onChange={(e) => set("phone", e.target.value)} /></AdminFormField>
        <AdminFormField label="WhatsApp"><AdminInput value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} /></AdminFormField>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="E-mail"><AdminInput type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></AdminFormField>
        <AdminFormField label="Website"><AdminInput value={f.website} onChange={(e) => set("website", e.target.value)} placeholder="https://..." /></AdminFormField>
      </div>

      <AdminFormField label="Endereço"><AdminInput value={f.address} onChange={(e) => set("address", e.target.value)} /></AdminFormField>
      <AdminFormField label="Logo URL"><AdminInput value={f.logo_url} onChange={(e) => set("logo_url", e.target.value)} placeholder="https://..." /></AdminFormField>

      <div className="flex gap-6">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={f.is_verified} onChange={(e) => set("is_verified", e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          Loja verificada
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} className="w-4 h-4 accent-indigo-600" />
          Ativa
        </label>
      </div>

      <div className="flex gap-3 pt-2">
        <AdminButton type="submit" loading={saving}>{storeId ? "Salvar" : "Criar Loja"}</AdminButton>
        <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/catalog/stores")}>Cancelar</AdminButton>
      </div>
    </form>
  );
}
