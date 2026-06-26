"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AdminFormField, AdminInput, AdminTextarea, AdminSelect } from "@/components/admin/ui/AdminFormField";
import { AdminButton } from "@/components/admin/ui/AdminButton";
import { useToast } from "@/contexts/admin/ToastContext";
import { slugify } from "@/utils/slug";

interface Brand { id: string; name: string }
interface Category { id: string; name: string }

interface ProductFormProps {
  productId?: string;
  initialData?: {
    name?: string;
    slug?: string;
    description?: string;
    brand_id?: string;
    category_id?: string;
    image_url?: string;
  };
}

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [brandId, setBrandId] = useState(initialData?.brand_id ?? "");
  const [categoryId, setCategoryId] = useState(initialData?.category_id ?? "");
  const [imageUrl, setImageUrl] = useState(initialData?.image_url ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/brands").then((r) => r.json() as Promise<{ data: Brand[] }>),
      fetch("/api/admin/categories").then((r) => r.json() as Promise<{ data: Category[] }>),
    ]).then(([b, c]) => {
      setBrands(b.data ?? []);
      setCategories(c.data ?? []);
    }).catch(() => {});
  }, []);

  function handleNameChange(v: string) {
    setName(v);
    if (!productId) setSlug(slugify(v));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Nome é obrigatório";
    if (!slug.trim()) newErrors.slug = "Slug é obrigatório";
    if (Object.keys(newErrors).length > 0) { setErrors(newErrors); return; }

    setSaving(true);
    const url = productId ? `/api/admin/products/${productId}` : "/api/admin/products";
    const res = await fetch(url, {
      method: productId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, description, brand_id: brandId || null, category_id: categoryId || null, image_url: imageUrl || null }),
    });
    const json = await res.json() as { message?: string; error?: string };
    setSaving(false);

    if (res.ok) {
      toast.success(json.message ?? "Salvo com sucesso");
      router.push("/admin/catalog/products");
    } else {
      toast.error(json.error ?? "Erro ao salvar");
    }
  }

  const brandOptions = brands.map((b) => ({ value: b.id, label: b.name }));
  const categoryOptions = categories.map((c) => ({ value: c.id, label: c.name }));

  return (
    <form onSubmit={handleSubmit} className="space-y-5 max-w-2xl">
      <AdminFormField label="Nome" required error={errors.name}>
        <AdminInput value={name} onChange={(e) => handleNameChange(e.target.value)} error={!!errors.name} placeholder="ex: iPhone 16 Pro" />
      </AdminFormField>

      <AdminFormField label="Slug" required error={errors.slug} hint="Gerado automaticamente. Edite apenas se necessário.">
        <AdminInput value={slug} onChange={(e) => setSlug(e.target.value)} error={!!errors.slug} placeholder="ex: iphone-16-pro" className="font-mono" />
      </AdminFormField>

      <AdminFormField label="Descrição">
        <AdminTextarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Descrição do produto" />
      </AdminFormField>

      <div className="grid grid-cols-2 gap-4">
        <AdminFormField label="Marca">
          <AdminSelect value={brandId} onChange={(e) => setBrandId(e.target.value)} options={brandOptions} placeholder="Selecionar marca" />
        </AdminFormField>
        <AdminFormField label="Categoria">
          <AdminSelect value={categoryId} onChange={(e) => setCategoryId(e.target.value)} options={categoryOptions} placeholder="Selecionar categoria" />
        </AdminFormField>
      </div>

      <AdminFormField label="URL da Imagem" hint="Use o Gerenciador de Mídia para upload.">
        <AdminInput value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
      </AdminFormField>

      <div className="flex items-center gap-3 pt-2">
        <AdminButton type="submit" loading={saving}>{productId ? "Salvar Alterações" : "Criar Produto"}</AdminButton>
        <AdminButton type="button" variant="secondary" onClick={() => router.push("/admin/catalog/products")}>Cancelar</AdminButton>
      </div>
    </form>
  );
}
