import { BrandForm } from "@/components/admin/catalog/BrandForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { notFound, redirect } from "next/navigation";

interface Props { params: Promise<{ id: string }> }

export const metadata = { title: "Editar Marca" };

export default async function EditBrandPage({ params }: Props) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) redirect("/admin/login");
  const { id } = await params;
  const { data, error } = await auth.serviceClient.from("brands").select("*").eq("id", id).single();
  if (error || !data) notFound();
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/catalog/brands" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Editar Marca</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <BrandForm brandId={id} initialData={{ name: data.name, slug: data.slug, logo_url: data.logo_url ?? "" }} />
      </div>
    </div>
  );
}
