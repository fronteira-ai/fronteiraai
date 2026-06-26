"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Store, CreditCard, Plug, CheckCircle2, ChevronRight, Loader2, Clock } from "lucide-react";
import type { MerchantPlanFeatures } from "@/types/merchant";

const STEPS = [
  { id: 1, label: "Empresa",     icon: Building2,    minutes: 2, hint: "Nome, site e contatos" },
  { id: 2, label: "Loja",        icon: Store,         minutes: 1, hint: "Vincule sua loja" },
  { id: 3, label: "Plano",       icon: CreditCard,    minutes: 1, hint: "Comece grátis" },
  { id: 4, label: "Integração",  icon: Plug,          minutes: 1, hint: "Como importar" },
  { id: 5, label: "Pronto!",     icon: CheckCircle2,  minutes: 0, hint: "" },
];

const STEP_CONTENT = {
  1: {
    title: "Conte sobre sua empresa",
    subtitle: "Essas informações aparecem para os compradores e aumentam a confiança na sua loja.",
  },
  2: {
    title: "Qual é a sua loja no ParaguAI?",
    subtitle: "Vincule sua loja para que seus produtos apareçam para os compradores certos.",
  },
  3: {
    title: "Comece grátis, cresça no seu ritmo",
    subtitle: "Você pode fazer upgrade a qualquer momento. Sem cartão de crédito para começar.",
  },
  4: {
    title: "Como você quer enviar seus produtos?",
    subtitle: "Escolha a forma mais fácil para você. Pode mudar depois nas configurações.",
  },
  5: {
    title: "Sua loja está pronta! 🎉",
    subtitle: "Agora é hora de importar seus primeiros produtos e começar a aparecer para os compradores.",
  },
};

interface StoreOption { id: string; name: string; city: string; slug: string }

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [stores, setStores] = useState<StoreOption[]>([]);

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

  const content = STEP_CONTENT[step as keyof typeof STEP_CONTENT];
  const remainingMinutes = STEPS.filter((s) => s.id >= step).reduce((acc, s) => acc + s.minutes, 0);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">P</div>
          <h1 className="text-xl font-bold text-white">Bem-vindo ao ParaguAI para Lojistas</h1>
          <div className="flex items-center justify-center gap-1.5 mt-2 text-slate-500 text-sm">
            <Clock className="w-3.5 h-3.5" />
            <span>{remainingMinutes > 0 ? `${remainingMinutes} minutos para começar` : "Tudo pronto!"}</span>
          </div>
        </div>

        {/* Progress steps */}
        <div className="flex items-center mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex-1 flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200 ${
                  step > s.id ? "bg-emerald-600 text-white"
                  : step === s.id ? "bg-emerald-600/20 text-emerald-400 border-2 border-emerald-600"
                  : "bg-slate-800 text-slate-500"
                }`}>
                  {step > s.id ? <CheckCircle2 className="w-4 h-4" /> : s.id}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${step === s.id ? "text-emerald-400" : step > s.id ? "text-slate-400" : "text-slate-600"}`}>
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-2 mb-4 transition-colors ${step > s.id + 1 ? "bg-emerald-600" : step > s.id ? "bg-emerald-600/40" : "bg-slate-800"}`} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-white">{content.title}</h2>
            <p className="text-sm text-slate-400 mt-1 leading-relaxed">{content.subtitle}</p>
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Nome da empresa <span className="text-red-400">*</span>
                </label>
                <input
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Shopping China Ltda."
                />
                <p className="text-xs text-slate-600 mt-1">Aparece para os compradores ao lado dos seus produtos.</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">CNPJ / RUC</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors" value={companyDoc} onChange={(e) => setCompanyDoc(e.target.value)} placeholder="80.000.000/0001-00" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Site</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} placeholder="https://minha-loja.com.py" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Telefone</label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+595 21 000-0000" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    WhatsApp
                    <span className="ml-1.5 text-emerald-500 text-xs font-normal">+2× contatos</span>
                  </label>
                  <input className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500 transition-colors" value={contactWhatsapp} onChange={(e) => setContactWhatsapp(e.target.value)} placeholder="+595 991 000-000" />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              {stores.length === 0 ? (
                <div className="py-6 text-center">
                  <Loader2 className="w-5 h-5 text-slate-500 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-slate-500">Carregando lojas disponíveis...</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {stores.map((store) => (
                    <label key={store.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedStore === store.id ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                      <input type="radio" name="store" value={store.id} checked={selectedStore === store.id} onChange={() => setSelectedStore(store.id)} className="accent-emerald-500" />
                      <div>
                        <p className="text-sm font-medium text-white">{store.name}</p>
                        <p className="text-xs text-slate-500">{store.city}</p>
                      </div>
                      {selectedStore === store.id && <CheckCircle2 className="w-4 h-4 text-emerald-400 ml-auto shrink-0" />}
                    </label>
                  ))}
                </div>
              )}
              <p className="text-xs text-slate-600 pt-1">
                Não encontrou sua loja? Entre em contato: <span className="text-emerald-500">suporte@paraguai.com</span>
              </p>
            </div>
          )}

          {step === 3 && (
            <div className="grid grid-cols-2 gap-3">
              {(plans.length > 0 ? plans : [
                { plan: "free",     display_name: "Grátis",   price_monthly: 0,   max_products: 100  },
                { plan: "pro",      display_name: "Pro",       price_monthly: 49,  max_products: 1000 },
                { plan: "business", display_name: "Business",  price_monthly: 199, max_products: 10000},
                { plan: "enterprise",display_name:"Enterprise",price_monthly: 999, max_products: 999999},
              ]).map((p) => (
                <PlanCard
                  key={p.plan}
                  displayName={p.display_name}
                  price={p.price_monthly}
                  maxProducts={p.max_products}
                  selected={selectedPlan === p.plan}
                  onSelect={() => setSelectedPlan(p.plan as typeof selectedPlan)}
                />
              ))}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              {[
                { id: "connector", label: "Conector automático",  desc: "Sincronização direto do site da sua loja. Recomendado.", badge: "Recomendado" },
                { id: "csv",       label: "Arquivo CSV / Excel",  desc: "Faça upload de uma planilha com seus produtos.",         badge: null },
                { id: "api",       label: "API REST",             desc: "Integração programática para devs. Plano Pro+.",          badge: "Pro+" },
                { id: "erp",       label: "ERP / Sistema próprio",desc: "Conecte seu sistema de gestão. Plano Business+.",         badge: "Business+" },
              ].map((opt) => (
                <label key={opt.id} className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${integration === opt.id ? "border-emerald-500 bg-emerald-500/10" : "border-slate-700 hover:border-slate-600"}`}>
                  <input type="radio" name="integration" value={opt.id} checked={integration === opt.id} onChange={() => setIntegration(opt.id)} className="accent-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-white">{opt.label}</p>
                      {opt.badge && <span className="text-xs px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded font-medium">{opt.badge}</span>}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2 mb-4">
                {[
                  "Sua conta foi criada com sucesso",
                  "Seu Merchant Score começa a crescer agora",
                  "Importe seus primeiros produtos e apareça nas buscas",
                ].map((item) => (
                  <div key={item} className="flex items-center justify-center gap-2 text-sm text-slate-400">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
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
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
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

function PlanCard({ displayName, price, maxProducts, selected, onSelect }: {
  displayName: string; price: number; maxProducts: number; selected: boolean; onSelect: () => void;
}) {
  return (
    <label className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${selected ? "border-emerald-500 bg-emerald-500/10 ring-1 ring-emerald-500/30" : "border-slate-700 hover:border-slate-600"}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-semibold text-white">{displayName}</span>
        <input type="radio" name="plan" checked={selected} onChange={onSelect} className="accent-emerald-500" />
      </div>
      <p className="text-xl font-bold text-white">
        {price === 0 ? <span className="text-emerald-400">Grátis</span> : `$${price}/mês`}
      </p>
      <p className="text-xs text-slate-500 mt-1">
        até {maxProducts >= 999999 ? "ilimitados" : maxProducts.toLocaleString("pt-BR")} produtos
      </p>
    </label>
  );
}
