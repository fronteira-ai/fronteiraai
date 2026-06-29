"use client";

import { useState } from "react";
import { Star, Loader2, CheckCircle2 } from "lucide-react";

interface Props {
  merchantId: string;
  onSuccess?: () => void;
}

export function ReviewComposer({ merchantId, onSuccess }: Props) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (rating === 0) { setError("Selecione uma nota"); return; }
    if (body.trim().length < 10) { setError("A avaliação deve ter no mínimo 10 caracteres"); return; }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/trust/merchant/${merchantId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating, title: title.trim() || undefined, body: body.trim() }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? "Erro ao enviar avaliação"); return; }
      setSuccess(true);
      onSuccess?.();
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400" role="status">
        <CheckCircle2 className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
        <p className="text-sm font-medium">Avaliação enviada! Será publicada após revisão.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl border border-slate-700/50 bg-slate-800/30">
      <h3 className="text-sm font-semibold text-white">Escrever avaliação</h3>

      {/* Star rating */}
      <fieldset>
        <legend className="text-xs text-slate-400 mb-2">Nota *</legend>
        <div className="flex gap-1" role="radiogroup" aria-label="Nota">
          {[1, 2, 3, 4, 5].map((i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i} estrela${i > 1 ? "s" : ""}`}
              aria-pressed={rating === i}
              onClick={() => setRating(i)}
              onMouseEnter={() => setHoverRating(i)}
              onMouseLeave={() => setHoverRating(0)}
              className="focus:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400 rounded"
            >
              <Star
                className={`w-6 h-6 transition-colors ${
                  i <= (hoverRating || rating) ? "fill-yellow-400 text-yellow-400" : "text-slate-600"
                }`}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-title" className="block text-xs text-slate-400 mb-1">Título (opcional)</label>
        <input
          id="review-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder="Resumo da sua experiência"
          className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
        />
      </div>

      <div>
        <label htmlFor="review-body" className="block text-xs text-slate-400 mb-1">Avaliação *</label>
        <textarea
          id="review-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="Conte sobre sua experiência com este lojista..."
          required
          className="w-full px-3 py-2 rounded-lg bg-slate-900/50 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
          aria-describedby="review-body-hint"
        />
        <p id="review-body-hint" className="text-xs text-slate-500 mt-1">{body.length}/2000 caracteres</p>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">{error}</p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-semibold text-slate-900 transition-colors"
        aria-busy={loading}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
        {loading ? "Enviando..." : "Publicar avaliação"}
      </button>
    </form>
  );
}
