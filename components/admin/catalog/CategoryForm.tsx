"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, AdminInput } from "@/components/admin/ui/AdminFormField";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useToast } from "@/contexts/admin/ToastContext";
import { slugify } from "@/utils/slug";

interface CategoryFormProps {
  categoryId?: string;
  initialData?: { name?: string; slug?: string; icon?: string };
}

export function CategoryForm({ categoryId, initialData }: CategoryFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }
    setSaving(true);
    const url = categoryId ? `/api/admin/categories/${categoryId}` : "/api/admin/categories";
    const res = await fetch(url, {
      method: categoryId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug: slug || slugify(name), icon: icon || null }),
    });
    const json = await res.json() as { message?: string; error?: string };
    setSaving(false);
    if (res.ok) { toast.success(json.message ?? "Salvo"); router.push("/admin/catalog/categories"); }
    else toast.error(json.error ?? "Erro ao salvar");
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-lg">
      <AdminFormField label="Nome" required error={errors.name}>
        <AdminInput value={name} onChange={(e) => { setName(e.target.value); if (!categoryId) setSlug(slugify(e.target.value)); }} error={!!errors.name} />
      </AdminFormField>
      <AdminFormField label="Slug" hint="Gerado automaticamente.">
        <AdminInput value={slug} onChange={(e) => setSlug(e.target.value)} className="font-mono" />
      </AdminFormField>
      <AdminFormField label="Ícone" hint="Nome do ícone Lucide ou emoji.">
        <AdminInput value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="Smartphone" />
      </AdminFormField>
      <div className="flex gap-3 pt-2">
        <AdminButton type="submit" loading={saving}>{categoryId ? "Salvar" : "Criar Categoria"}</AdminButton>
        <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/catalog/categories")}>Cancelar</AdminButton>
      </div>
    </form>
  );
}
