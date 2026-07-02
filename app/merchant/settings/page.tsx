"use client";
import { useState, useEffect } from "react";
import { MerchantSidebar } from "@/components/merchant/layout/MerchantSidebar";
import DelegatesSection from "@/components/merchant/settings/DelegatesSection";
import { useToast } from "@/contexts/admin/ToastContext";
import { Save, Loader2 } from "lucide-react";
import type { Merchant, MerchantPlanFeatures } from "@/types/merchant";

interface SettingsData { merchant: Merchant; plan: MerchantPlanFeatures | null }

export default function MerchantSettingsPage() {
  const { toast } = useToast();
  const [data, setData] = useState<SettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [upgradeInterestSent, setUpgradeInterestSent] = useState(false);
  const [form, setForm] = useState({
    company_name: "", company_doc: "", company_website: "",
    contact_phone: "", contact_whatsapp: "", contact_email: "",
  });

  useEffect(() => {
    fetch("/api/merchant/settings")
      .then((r) => r.json() as Promise<{ data: SettingsData }>)
      .then((json) => {
        setData(json.data);
        const m = json.data.merchant;
        setForm({
          company_name: m.company_name ?? "",
          company_doc: m.company_doc ?? "",
          company_website: m.company_website ?? "",
          contact_phone: m.contact_phone ?? "",
          contact_whatsapp: m.contact_whatsapp ?? "",
          contact_email: m.contact_email ?? "",
        });
        setLoading(false);
      }).catch(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    const res = await fetch("/api/merchant/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) toast.success("Configurações salvas");
    else toast.error("Erro ao salvar");
  }

  // Epic H — Premium Upgrade Journey. Lead-capture only (ADR-035, no
  // payment gateway) — replaces the previous static "disponível em breve" line.
  async function handleUpgradeInterest() {
    const res = await fetch("/api/merchant/upgrade-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ triggerContext: "settings_plan_card" }),
    });
    if (res.ok) {
      setUpgradeInterestSent(true);
      toast.success("Recebemos seu interesse — nossa equipe vai entrar em contato.");
    } else {
      toast.error("Não foi possível registrar seu interesse agora.");
    }
  }

  const field = (label: string, key: keyof typeof form, type = "text") => (
    <div>
      <label className="block text-xs text-slate-400 mb-1.5">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
      />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-950 text-white">
      <MerchantSidebar companyName={data?.merchant.company_name} plan={data?.merchant.plan} />
      <main className="flex-1 p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold text-white mb-6">Configurações</h1>

          {loading ? (
            <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-12 bg-slate-800 rounded-lg animate-pulse" />)}</div>
          ) : (
            <div className="space-y-6">
              {/* Company info */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white">Dados da empresa</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">{field("Nome da empresa", "company_name")}</div>
                  {field("CNPJ/RUC", "company_doc")}
                  {field("Site", "company_website", "url")}
                </div>
              </div>

              {/* Contact */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                <h2 className="text-sm font-semibold text-white">Contato</h2>
                <div className="grid grid-cols-2 gap-4">
                  {field("E-mail", "contact_email", "email")}
                  {field("Telefone", "contact_phone")}
                  {field("WhatsApp", "contact_whatsapp")}
                </div>
              </div>

              {/* Plan */}
              {data?.plan && (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                  <h2 className="text-sm font-semibold text-white mb-3">Plano atual</h2>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white font-medium">{data.plan.display_name}</p>
                      <p className="text-slate-500 text-xs mt-0.5">
                        Até {data.plan.max_products.toLocaleString("pt-BR")} produtos · {data.plan.max_imports_month} importações/mês
                      </p>
                    </div>
                    <span className="text-lg font-bold text-white">
                      {data.plan.price_monthly === 0 ? "Grátis" : `$${data.plan.price_monthly}/mês`}
                    </span>
                  </div>
                  {data.plan.plan !== "enterprise" && (
                    <button
                      onClick={handleUpgradeInterest}
                      disabled={upgradeInterestSent}
                      className="mt-3 text-xs font-medium text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 disabled:cursor-default"
                    >
                      {upgradeInterestSent ? "Interesse registrado — entraremos em contato." : "Quero fazer upgrade →"}
                    </button>
                  )}
                </div>
              )}

              <DelegatesSection />

              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {saving ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
