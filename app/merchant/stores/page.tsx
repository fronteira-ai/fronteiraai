"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import { Store, Globe, CheckCircle2 } from "lucide-react";

interface LinkedStore {
  id: string;
  is_primary: boolean;
  stores: { id: string; name: string; slug: string; city: string; website: string | null; active: boolean };
}

export default function MerchantStoresPage() {
  const [stores, setStores] = useState<LinkedStore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/merchant/stores")
      .then((r) => r.json() as Promise<{ data: LinkedStore[] }>)
      .then((json) => { setStores(json.data ?? []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar />
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h1 className="text-xl font-bold text-white">Minhas Lojas</h1>
            <p className="text-slate-400 text-sm mt-0.5">Lojas vinculadas à sua conta</p>
          </div>

          {loading ? (
            <div className="space-y-3">{[...Array(2)].map((_, i) => <div key={i} className="h-20 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />)}</div>
          ) : stores.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
              <Store className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nenhuma loja vinculada. Complete o onboarding para vincular.</p>
              <a href="/merchant/onboarding" className="mt-3 inline-block text-emerald-400 hover:text-emerald-300 text-sm">Vincular loja →</a>
            </div>
          ) : (
            <div className="space-y-3">
              {stores.map((link) => (
                <div key={link.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-emerald-600/20 rounded-lg flex items-center justify-center shrink-0">
                    <Store className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white font-medium">{link.stores.name}</p>
                      {link.is_primary && (
                        <span className="text-xs bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 px-2 py-0.5 rounded-full">Principal</span>
                      )}
                      {link.stores.active && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <p className="text-slate-500 text-sm">{link.stores.city}</p>
                  </div>
                  {link.stores.website && (
                    <a href={link.stores.website} target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 shrink-0">
                      <Globe className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
