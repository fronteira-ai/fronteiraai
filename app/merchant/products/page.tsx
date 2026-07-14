"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { Package, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import Image from "next/image";
// Program ΔR — Mission ΔR-1.2A. Direct leaf import (not the domain barrel)
// — this is a Client Component; the barrel also re-exports server-only
// repository/service classes that have no reason to enter the client bundle.
import { formatUSD } from "@/src/domains/exchange/presentation/formatters";

interface ProductRow {
  id: string;
  price_usd: number;
  in_stock: boolean;
  product_url: string | null;
  products: {
    id: string; name: string; slug: string; image_url: string | null;
    brands: { name: string } | null;
    categories: { name: string } | null;
  };
}

export default function MerchantProductsPage() {
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetch(`/api/merchant/products?page=${page}`)
      .then((r) => r.json() as Promise<{ data: ProductRow[]; total: number; totalPages: number }>)
      .then((json) => {
        setProducts(json.data ?? []);
        setTotal(json.total ?? 0);
        setTotalPages(json.totalPages ?? 1);
        setLoading(false);
      }).catch(() => setLoading(false));
  }, [page]);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-white">Produtos</h1>
              <p className="text-slate-400 text-sm mt-0.5">{total} produtos no catálogo</p>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-800">
                {[...Array(5)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-slate-800/30" />)}
              </div>
            ) : products.length === 0 ? (
              <div className="p-12 text-center">
                <Package className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Nenhum produto ainda. Faça uma importação para começar.</p>
                <a href="/merchant/imports/new" className="mt-3 inline-block text-emerald-400 hover:text-emerald-300 text-sm">
                  Importar agora →
                </a>
              </div>
            ) : (
              <>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800 text-xs text-slate-500">
                      <th className="text-left px-4 py-3">Produto</th>
                      <th className="text-left px-4 py-3">Marca</th>
                      <th className="text-left px-4 py-3">Categoria</th>
                      <th className="text-right px-4 py-3">Preço</th>
                      <th className="text-center px-4 py-3">Estoque</th>
                      <th className="text-center px-4 py-3">Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((row) => (
                      <tr key={row.id} className="border-b border-slate-800/50 hover:bg-slate-800/20">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            {row.products.image_url ? (
                              <Image src={row.products.image_url} alt={row.products.name} width={36} height={36} className="rounded object-cover bg-slate-800" />
                            ) : (
                              <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center">
                                <Package className="w-4 h-4 text-slate-600" />
                              </div>
                            )}
                            <span className="text-slate-200 text-xs font-medium truncate max-w-[220px]">{row.products.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.products.brands?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-slate-400 text-xs">{row.products.categories?.name ?? "—"}</td>
                        <td className="px-4 py-3 text-right text-white font-medium">{formatUSD(row.price_usd)}</td>
                        <td className="px-4 py-3 text-center">
                          {row.in_stock
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-400 mx-auto" />
                            : <XCircle className="w-4 h-4 text-slate-600 mx-auto" />}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.product_url && (
                            <a href={row.product_url} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300">
                              <ExternalLink className="w-3.5 h-3.5 mx-auto" />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-slate-800">
                    <button onClick={() => { setLoading(true); setPage((p) => Math.max(1, p - 1)); }} disabled={page === 1} className="text-xs text-slate-400 hover:text-white disabled:opacity-30">← Anterior</button>
                    <span className="text-xs text-slate-500">{page} / {totalPages}</span>
                    <button onClick={() => { setLoading(true); setPage((p) => Math.min(totalPages, p + 1)); }} disabled={page === totalPages} className="text-xs text-slate-400 hover:text-white disabled:opacity-30">Próxima →</button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
