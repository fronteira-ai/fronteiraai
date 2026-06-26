import { ProductForm } from "@/components/admin/catalog/ProductForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { notFound, redirect } from "next/navigation";

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: "Editar Produto" };

export default async function EditProductPage({ params }: Props) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");
  const { id } = await params;

  const { data, error } = await auth.serviceClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) notFound();

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/catalog/products" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6">
        <ChevronLeft className="w-4 h-4" /> Voltar aos Produtos
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Editar Produto</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <ProductForm
          productId={id}
          initialData={{
            name: data.name,
            slug: data.slug,
            description: data.description ?? "",
            brand_id: data.brand_id ?? "",
            category_id: data.category_id ?? "",
            image_url: data.image_url ?? "",
          }}
        />
      </div>
    </div>
  );
}
