import type { VerificationEvidenceRecord } from "../types/trust.types";

const TYPE_LABEL: Record<string, string> = {
  document: "Documento",
  image: "Imagem",
  url: "URL",
  text: "Texto",
  json: "Dados JSON",
};

type Props = {
  evidence: VerificationEvidenceRecord[];
};

export function EvidenceViewer({ evidence }: Props) {
  const active = evidence.filter((e) => !e.deleted_at);

  if (active.length === 0) {
    return <p className="text-slate-500 text-sm">Nenhuma evidência anexada.</p>;
  }

  return (
    <ul className="space-y-2">
      {active.map((ev) => (
        <li key={ev.id} className="rounded border border-slate-700 bg-slate-800/30 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{ev.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">{TYPE_LABEL[ev.evidence_type] ?? ev.evidence_type}</p>
            </div>
            {ev.is_valid !== null && (
              <span
                className={`shrink-0 text-xs px-1.5 py-0.5 rounded-full ${
                  ev.is_valid ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"
                }`}
              >
                {ev.is_valid ? "Válida" : "Inválida"}
              </span>
            )}
          </div>

          {ev.content && ev.evidence_type === "url" && (
            <a
              href={ev.content}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:underline mt-1 block truncate"
            >
              {ev.content}
            </a>
          )}
          {ev.content && ev.evidence_type === "text" && (
            <p className="text-xs text-slate-300 mt-1 whitespace-pre-wrap">{ev.content}</p>
          )}
          {ev.file_path && (
            <p className="text-xs text-slate-400 mt-1 font-mono truncate">{ev.file_path}</p>
          )}
          {ev.review_note && (
            <p className="text-xs text-slate-400 italic mt-1">{ev.review_note}</p>
          )}
          <p className="text-xs text-slate-500 mt-1.5">
            {new Date(ev.created_at).toLocaleDateString("pt-BR")}
          </p>
        </li>
      ))}
    </ul>
  );
}
