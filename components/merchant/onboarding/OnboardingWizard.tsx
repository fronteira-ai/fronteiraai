"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Store, CreditCard, Plug, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import type { MerchantPlanFeatures } from "@/types/merchant";

const STEPS = [
  { id: 1, label: "Empresa", icon: Building2 },
  { id: 2, label: "Loja", icon: Store },
  { id: 3, label: "Plano", icon: CreditCard },
  { id: 4, label: "Integração", icon: Plug },
  { id: 5, label: "Pronto!", icon: CheckCircle2 },
];

interface StoreOption { id: string; name: string; city: string; slug: string }

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);

  // Form state
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [companyDoc, setCompanyDoc] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<"free" | "pro" | "business" | "enterprise">("free");
  const [plans, setPlans] = useState<MerchantPlanFeatures[]>([]);
  const [integration, setIntegration] = useState("connector");

  useEffect(() => {
    // Load available stores and plans
    Promise.all([
      fetch("/api/merchant/stores", { method: "POST" }).then((r) => r.json() as Promise<{ data: StoreOption[] }>),
      fetch("/api/merchant/plans").then((r) => r.json() as Promise<{ data: MerchantPlanFeatures[] }>),
    ]).then(([storeRes, planRes]) => {
      setStores(storeRes.data ?? []);
      setPlans(planRes.data ?? []);
    }).catch(() => {});
  }, []);

  async function saveStep(payload: Record<string, unknown>, done = false) {
    setSaving(true);
    try {
      await fetch("/api/merchant/onboarding", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step, done, ...payload }),
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleNext() {
    if (step === 1) {
      if (!companyName.trim()) return;
      await saveStep({ company_name: companyName, company_website: companyWebsite, company_doc: companyDoc, contact_phone: contactPhone, contact_whatsapp: contactWhatsapp });
    } else if (step === 2) {
      if (selectedStore) await saveStep({ store_id: selectedStore });
    } else if (step === 3) {
      await saveStep({ plan: selectedPlan });
    } else if (step === 4) {
      await saveStep({ integration_type: integration });
    } else if (step === 5) {
      await saveStep({}, true);
      router.push("/merchant/dashboard");
      return;
    }
    setStep((s) => s + 1);
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">P</div>
          <h1 className="text-xl font-bold text-white">Configuração da sua conta</h1>
          <p className="text-slate-400 text-sm mt-1">Leva menos de 3 minutos para começar</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step > s.id ? "bg-emerald-600 text-white"
                  : step === s.id ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600"
                  : "bg-slate-800 text-slate-500"
                }`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-xs mt-1 ${step === s.id ? "text-emerald-400" : "text-slate-500"}`}>{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-4 ${step > s.id + 1 ? "bg-emerald-600" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold">Dados da empresa</h2>
              <p className="text-sm text-slate-400">Essas informações aparecem para os compradores.</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs text-slate-400 mb-1.5">Nome da empresa *</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Shopping China Ltda." />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">CNPJ/RUC</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" value={companyDoc} onChange={(e) => setCompanyDoc(e.target.value)} placeholder="80.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Site</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://minha-loja.com.py" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">Telefone</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+595 21 000-0000" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1.5">WhatsApp</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-emerald-500" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+595 991 000-000" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold">Vincule sua loja</h2>
              <p className="text-sm text-slate-400">Selecione a loja que você representa no ParaguAI.</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {stores.length === 0 && <p className="text-sm text-slate-500">Carregando lojas...</p>}
                {stores.map((store) => (
                  <label key={store.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedStore === store.id ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                    <input type="radio" name="store" value={store.id} checked={selectedStore === store.id} onChange={() => setSelectedStore(store.id)} className="accent-emerald-500" />
                    <div>
                      <p className="text-sm font-medium text-white">{store.name}</p>
                      <p className="text-xs text-slate-500">{store.city}</p>
                    </div>
                  </label>
                ))}
              </div>
              <p className="text-xs text-slate-500">Não encontrou sua loja? Entre em contato com nossa equipe.</p>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold">Escolha seu plano</h2>
              <p className="text-sm text-slate-400">Você pode fazer upgrade a qualquer momento.</p>
              <div className="grid grid-cols-2 gap-3">
                {plans.length === 0 && (
                  [{ plan: "free", display_name: "Grátis", price_monthly: 0, max_products: 100 },
                   { plan: "pro", display_name: "Pro", price_monthly: 49, max_products: 1000 }].map((p) => (
                    <PlanCard key={p.plan} plan={p.plan} displayName={p.display_name} price={p.price_monthly} maxProducts={p.max_products} selected={selectedPlan === p.plan} onSelect={() => setSelectedPlan(p.plan as typeof selectedPlan)} />
                  ))
                )}
                {plans.map((p) => (
                  <PlanCard key={p.plan} plan={p.plan} displayName={p.display_name} price={p.price_monthly} maxProducts={p.max_products} selected={selectedPlan === p.plan} onSelect={() => setSelectedPlan(p.plan as typeof selectedPlan)} />
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-white font-semibold">Como deseja integrar?</h2>
              <p className="text-sm text-slate-400">Você pode mudar isso depois nas configurações.</p>
              <div className="space-y-2">
                {[
                  { id: "connector", label: "Conector automático", desc: "Sincronização automática direto do seu site" },
                  { id: "csv", label: "Arquivo CSV/Excel", desc: "Upload manual de planilha de produtos" },
                  { id: "api", label: "API REST", desc: "Integração programática via API (plano Pro+)" },
                  { id: "erp", label: "ERP", desc: "Integração com sistema de gestão (plano Business+)" },
                ].map((opt) => (
                  <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${integration === opt.id ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                    <input type="radio" name="integration" value={opt.id} checked={integration === opt.id} onChange={() => setIntegration(opt.id)} className="accent-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      <p className="text-xs text-slate-500">{opt.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-lg font-bold text-white mb-2">Tudo pronto!</h2>
              <p className="text-sm text-slate-400">
                Sua conta foi configurada. Vá para o dashboard para fazer sua primeira importação.
              </p>
            </div>
          )}

          <div className="flex justify-between mt-6 pt-4 border-t border-slate-800">
            <button
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1 || saving}
              className="px-4 py-2 text-sm text-slate-400 hover:text-white disabled:opacity-30 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={handleNext}
              disabled={saving || (step === 1 && !companyName.trim())}
              className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {step === 5 ? "Ir para o Dashboard" : "Continuar"}
              {!saving && step !== 5 && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, displayName, price, maxProducts, selected, onSelect }: {
  plan: string; displayName: string; price: number; maxProducts: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <label className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-colors ${selected ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{displayName}</span>
        <input type="radio" name="plan" checked={selected} onChange={onSelect} className="accent-emerald-500" />
      </div>
      <p className="text-lg font-bold text-white">
        {price === 0 ? "Grátis" : `$${price}/mês`}
      </p>
      <p className="text-xs text-slate-500 mt-1">até {maxProducts.toLocaleString("pt-BR")} produtos</p>
    </label>
  );
}
