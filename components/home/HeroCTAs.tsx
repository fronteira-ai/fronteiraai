"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Store, X } from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type AuthState = "loading" | "unauthenticated" | "merchant" | "buyer";

export default function HeroCTAs() {
  const [authState, setAuthState] = useState<AuthState>("loading");
  const [showConfirm, setShowConfirm] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setAuthState("unauthenticated"); return; }
      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();
      setAuthState(merchant ? "merchant" : "buyer");
    });
  }, []);

  function handleLojistaClick() {
    if (authState === "merchant") {
      router.push("/merchant/dashboard");
    } else if (authState === "buyer") {
      setShowConfirm(true);
    } else {
      router.push("/merchant/login");
    }
  }

  const lojistaLabel = authState === "merchant" ? "Minha Loja" : "Sou Lojista";

  return (
    <>
      <div className="flex w-full flex-wrap items-center justify-center gap-4">
        <Link
          href="/products"
          className="flex items-center gap-2.5 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple px-8 py-4 text-sm font-bold text-white shadow-[0_0_24px_-6px_var(--color-brand-blue)] transition-all duration-300 hover:scale-[1.03] active:scale-95"
        >
          <Search size={17} />
          Comparar preços
        </Link>

        <button
          onClick={handleLojistaClick}
          disabled={authState === "loading"}
          className="glass-card flex items-center gap-2.5 rounded-full px-8 py-4 text-sm font-semibold text-slate-200 transition-all duration-300 hover:text-white disabled:cursor-wait disabled:opacity-40 active:scale-95"
        >
          <Store size={17} />
          {authState === "loading" ? "..." : lojistaLabel}
        </button>
      </div>

      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="mx-4 mb-6 w-full max-w-sm rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl sm:mb-0"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="h-9 w-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                  <Store size={18} className="text-emerald-400" />
                </div>
                <h3 className="text-base font-bold text-white">Área do Lojista</h3>
              </div>
              <button onClick={() => setShowConfirm(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-5">
              Você está logado como comprador. Quer cadastrar sua loja no ParaguAI e começar a vender para milhares de compradores?
            </p>
            <div className="flex flex-col gap-2.5">
              <Link
                href="/merchant/register"
                className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Cadastrar minha loja
              </Link>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full rounded-xl border border-slate-700 px-4 py-2.5 text-sm text-slate-400 transition-colors hover:text-white"
              >
                Continuar navegando
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
