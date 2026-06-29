"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  verificationId: string;
  merchantId: string;
  status: string;
};

export default function VerificationActionsClient({ verificationId, merchantId, status }: Props) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [showReject, setShowReject] = useState(false);
  const [showRevoke, setShowRevoke] = useState(false);
  const [loading, setLoading] = useState(false);

  async function patch(action: string, extraReason?: string) {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/trust/merchant/${merchantId}/verification/${verificationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, reason: extraReason }),
        }
      );
      if (res.ok) {
        router.refresh();
        setShowReject(false);
        setShowRevoke(false);
        setReason("");
      } else {
        const err = await res.json();
        alert(err.error ?? "Erro desconhecido");
      }
    } finally {
      setLoading(false);
    }
  }

  if (status === "pending") {
    return (
      <div className="flex items-center gap-2">
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
        {showReject && (
          <div className="flex items-center gap-2 ml-2">
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Motivo da rejeição"
              className="px-2 py-1 rounded bg-slate-800 border border-slate-600 text-white text-xs w-48"
            />
            <button
              onClick={() => patch("reject", reason)}
              disabled={!reason || loading}
              className="px-2 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowReject(false)}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
            >
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
            <button
              onClick={() => patch("revoke", reason)}
              disabled={!reason || loading}
              className="px-2 py-1 rounded bg-orange-600 hover:bg-orange-500 text-white text-xs disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              onClick={() => setShowRevoke(false)}
              className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white text-xs"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>
    );
  }

  return null;
}
