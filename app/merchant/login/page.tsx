"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2, LogIn, AlertCircle, CheckCircle2 } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  email_confirmation_failed: "Link de confirmação inválido ou expirado. Solicite um novo cadastro.",
  auth_callback_error: "Erro ao confirmar o e-mail. Tente fazer login diretamente.",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowserClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const urlError = searchParams.get("error");
  const [error, setError] = useState<string | null>(
    urlError ? (ERROR_MESSAGES[urlError] ?? urlError) : null
  );
  const confirmed = searchParams.get("confirmed") === "true";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      const msg = authError.message.includes("Email not confirmed")
        ? "Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada."
        : "E-mail ou senha incorretos.";
      setError(msg);
      setLoading(false);
      return;
    }

    // Idempotent — ensures merchant record exists regardless of registration path
    await fetch("/api/merchant/auth/register", { method: "POST" });

    const redirectTo = searchParams.get("redirectTo") ?? "/merchant/dashboard";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <>
      {confirmed && (
        <div className="flex items-center gap-2 text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2.5 mb-4">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          E-mail confirmado com sucesso! Faça login para continuar.
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="lojista@empresa.com"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-slate-500 mt-4">
        Não tem conta?{" "}
        <Link href="/merchant/register" className="text-emerald-400 hover:text-emerald-300">
          Cadastre-se grátis
        </Link>
      </p>
    </>
  );
}

export default function MerchantLoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">P</div>
          <h1 className="text-xl font-bold text-white">ParaguAI para Lojistas</h1>
          <p className="text-slate-400 text-sm mt-1">Acesse seu painel de vendas</p>
        </div>
        <Suspense fallback={<div className="h-48 bg-slate-900 border border-slate-800 rounded-xl animate-pulse" />}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
