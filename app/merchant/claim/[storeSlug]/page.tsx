"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Loader2, AlertCircle, CheckCircle2, Store } from "lucide-react";

type Props = { params: Promise<{ storeSlug: string }> };

interface ClaimResult {
  status: "pending" | "awaiting_review" | "approved" | "rejected" | "cancelled";
  id: string;
}

// Epic B — Smart Claim Flow. Mission: under 5 minutes, under 3 clicks to
// the dashboard for a legitimate owner. Only asks for name/role/phone
// (email comes from auth) — Progressive Verification does the rest.
export default function ClaimStorePage({ params }: Props) {
  const { storeSlug } = use(params);
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ClaimResult | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/merchant/login?redirectTo=/merchant/claim/${storeSlug}`);
        return;
      }

      setEmail(user.email ?? "");
      // Self-heal, same pattern as the dashboard/login flow — ensures a
      // `merchants` row exists before the claim form can submit.
      await fetch("/api/merchant/auth/register", { method: "POST" });
      setCheckingAuth(false);
    }
    checkAuth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeSlug]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/merchant/claims", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeSlug,
        claimantName: name,
        claimantRole: role,
        claimantPhone: phone,
        claimantWhatsapp: whatsapp || undefined,
        claimantWebsite: website || undefined,
        claimantInstagram: instagram || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "Erro ao enviar a reivindicação.");
      setSubmitting(false);
      return;
    }

    const { data } = (await res.json()) as { data: ClaimResult };

    if (data.status === "approved") {
      router.push("/merchant/dashboard");
      router.refresh();
      return;
    }

    setResult(data);
    setSubmitting(false);
  }

  async function handleCancel() {
    if (!result) return;
    await fetch(`/api/merchant/claims/${result.id}/cancel`, { method: "POST" });
    setResult(null);
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (result) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-xl p-6 text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h1 className="text-lg font-bold text-white">Reivindicação em análise</h1>
          <p className="text-slate-400 text-sm">
            Não conseguimos confirmar automaticamente todos os dados desta vez — nossa equipe vai revisar em breve.
          </p>
          <button
            onClick={handleCancel}
            className="text-xs text-slate-500 hover:text-slate-300 underline"
          >
            Cancelar solicitação
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mx-auto mb-4">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Esta loja é sua?</h1>
          <p className="text-slate-400 text-sm mt-1">Confirme que a empresa é sua — leva menos de 5 minutos.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Seu nome</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Cargo</label>
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              required
              placeholder="Proprietário, Gerente..."
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">Telefone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">E-mail</label>
            <input value={email} disabled className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-slate-400" />
          </div>

          <details className="text-sm">
            <summary className="text-slate-400 cursor-pointer">Acelerar a verificação (opcional)</summary>
            <div className="space-y-3 mt-3">
              <input
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="WhatsApp"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
              />
              <input
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="Website"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
              />
              <input
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="Instagram"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500"
              />
            </div>
          </details>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar que a loja é minha"}
          </button>
        </form>
      </div>
    </div>
  );
}
