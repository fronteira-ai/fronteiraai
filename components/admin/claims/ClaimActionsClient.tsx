"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  claimId: string;
  status: string;
};

export default function ClaimActionsClient({ claimId, status }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [showRequestInfo, setShowRequestInfo] = useState(false);
  const [loading, setLoading] = useState(false);

  async function patch(action: string, extra?: { reason?: string; note?: string }) {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      if (res.ok) {
        router.refresh();
        setShowReject(false);
        setShowRevoke(false);
        setShowRequestInfo(false);
        setReason("");
        setNote("");
      } else {
        const err = await res.json();
        alert(err.error ?? "Erro desconhecido");
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "awaiting_review") {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => patch("approve")}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-green-600 hover:bg-green-500 text-white text-xs font-medium disabled:opacity-50"
        >
          Aprovar
        </button>
        <button
          onClick={() => setShowReject(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white text-xs font-medium disabled:opacity-50"
        >
          Rejeitar
        </button>
        <button
          onClick={() => setShowRequestInfo(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium disabled:opacity-50"
        >
          Solicitar informação
        </button>

        {showReject && (
          <div className="flex items-center gap-2 w-full mt-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da rejeição"
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-xs w-64"
            />
            <button onClick={() => patch("reject", { reason })} disabled={!reason || loading} className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50">
              Confirmar
            </button>
            <button onClick={() => setShowReject(false)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs">
              Cancelar
            </button>
          </div>
        )}

        {showRequestInfo && (
          <div className="flex items-center gap-2 w-full mt-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="O que precisa ser esclarecido"
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-xs w-64"
            />
            <button onClick={() => patch("request_info", { note })} disabled={!note || loading} className="px-2 py-1 rounded bg-slate-600 hover:bg-slate-500 text-white text-xs disabled:opacity-50">
              Enviar
            </button>
            <button onClick={() => setShowRequestInfo(false)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs">
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  if (status === "approved") {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowRevoke(true)}
          disabled={loading}
          className="px-3 py-1.5 rounded bg-orange-700 hover:bg-orange-600 text-white text-xs font-medium disabled:opacity-50"
        >
          Revogar
        </button>
        {showRevoke && (
          <div className="flex items-center gap-2 ml-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da revogação"
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-xs w-48"
            />
            <button onClick={() => patch("revoke", { reason })} disabled={!reason || loading} className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs disabled:opacity-50">
              Confirmar
            </button>
            <button onClick={() => setShowRevoke(false)} className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs">
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
