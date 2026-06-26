import { BrandForm } from "@/components/admin/catalog/BrandForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export const metadata = { title: "Nova Marca" };

export default function NewBrandPage() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/admin/catalog/brands" className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6">
        <ChevronLeft className="w-4 h-4" /> Voltar
      </Link>
      <h1 className="text-xl font-bold text-white mb-6">Nova Marca</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <BrandForm />
      </div>
    </div>
  );
}
