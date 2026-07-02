"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/contexts/admin/ToastContext";
import { UserPlus, Trash2 } from "lucide-react";

interface Delegate {
  id: string;
  invitedEmail: string;
  role: string;
  status: string;
  invitedAt: string;
}

const ROLE_LABELS: Record<string, string> = {
  manager: "Gerente",
  marketing: "Marketing",
  agency: "Agência",
  administrator: "Administrador",
  operator: "Operador",
};

const STATUS_LABELS: Record<string, string> = {
  invited: "Convite pendente",
  active: "Ativo",
  revoked: "Revogado",
};

// Epic E — Delegated Management. Minimal UI (confirmed scope): invite/list/
// revoke here, no dedicated permissions-management page this Wave.
export default function DelegatesSection() {
  const { toast } = useToast();
  const [delegates, setDelegates] = useState<Delegate[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("operator");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    fetch("/api/merchant/delegates")
      .then((r) => r.json() as Promise<{ data: Delegate[] }>)
      .then((json) => setDelegates(json.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  async function handleInvite() {
    if (!email) return;
    setInviting(true);
    try {
      const res = await fetch("/api/merchant/delegates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role }),
      });
      if (res.ok) {
        const { data } = (await res.json()) as { data: Delegate };
        setDelegates((prev) => [data, ...prev]);
        setEmail("");
        toast.success("Convite enviado");
      } else {
        const err = await res.json();
        toast.error(err.error ?? "Erro ao convidar");
      }
    } finally {
      setInviting(false);
    }
  }

  async function handleRevoke(id: string) {
    const res = await fetch(`/api/merchant/delegates/${id}`, { method: "DELETE" });
    if (res.ok) {
      setDelegates((prev) => prev.map((d) => (d.id === id ? { ...d, status: "revoked" } : d)));
      toast.success("Delegado revogado");
    } else {
      toast.error("Erro ao revogar");
    }
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-white">Equipe</h2>
        <p className="text-xs text-slate-500 mt-1">
          Convide gerentes, marketing, agências ou operadores para ajudar a administrar sua loja — sem compartilhar sua conta.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com"
          className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
        >
          {Object.entries(ROLE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button
          onClick={handleInvite}
          disabled={inviting || !email}
          className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Convidar
        </button>
      </div>

      {!loading && delegates.length > 0 && (
        <ul className="space-y-2">
          {delegates.map((d) => (
            <li key={d.id} className="flex items-center justify-between text-sm bg-slate-800/50 rounded-lg px-3 py-2">
              <div>
                <p className="text-white">{d.invitedEmail}</p>
                <p className="text-xs text-slate-500">
                  {ROLE_LABELS[d.role] ?? d.role} · {STATUS_LABELS[d.status] ?? d.status}
                </p>
              </div>
              {d.status !== "revoked" && (
                <button onClick={() => handleRevoke(d.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
