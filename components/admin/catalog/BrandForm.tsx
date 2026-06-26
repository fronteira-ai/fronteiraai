"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, AdminInput } from "@/components/admin/ui/AdminFormField";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useToast } from "@/contexts/admin/ToastContext";
import { slugify } from "@/utils/slug";

interface BrandFormProps {
  brandId?: string;
  initialData?: { name?: string; slug?: string; logo_url?: string };
}

export function BrandForm({ brandId, initialData }: BrandFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setErrors({ name: "Nome é obrigatório" }); return; }
    setSaving(true);
    const url = brandId ? `/api/admin/brands/${brandId}` : "/api/admin/brands";
    const res = await fetch(url, {
      method: brandId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || slugify(name), logo_url: logoUrl || null }),
    });
    const json = await res.json() as { message?: string; error?: string };
    setSaving(false);
    if (res.ok) { toast.success(json.message ?? "Salvo"); router.push("/admin/catalog/brands"); }
    else toast.error(json.error ?? "Erro ao salvar");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <AdminFormField label="Nome" required error={errors.name}>
        <AdminInput value={name} onChange={(e) => { setName(e.target.value); if (!brandId) setSlug(slugify(e.target.value)); }} error={!!errors.name} />
      </AdminFormField>
      <AdminFormField label="Slug">
        <AdminInput value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
      </AdminFormField>
      <AdminFormField label="URL do Logo">
        <AdminInput value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </AdminFormField>
      <div className="flex gap-3 pt-2">
        <AdminButton type="submit" loading={saving}>{brandId ? "Salvar" : "Criar Marca"}</AdminButton>
        <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/catalog/brands")}>Cancelar</AdminButton>
      </div>
    </form>
  );
}
