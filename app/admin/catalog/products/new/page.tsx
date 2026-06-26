import { ProductForm } from "@/components/admin/catalog/ProductForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Novo Produto" };

export default function NewProductPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/catalog/products" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6">
        <ChevronLeft className="w-4 h-4" /> Voltar aos Produtos
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Novo Produto</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <ProductForm />
      </div>
    </div>
  );
}
