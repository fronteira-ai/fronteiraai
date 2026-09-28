"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { productUrl } from "@/constants/routes";

type Props = {
  slug: string;
  title: string;
  /** Mission 03B (PHASE 5) — URL a compartilhar. Aditivo e opcional: sem ele,
   * o comportamento da página de produto é EXATAMENTE o de antes
   * (`productUrl(slug)`). A página de loja passa `lojaUrl(store.slug)`. */
  url?: string;
  /** Mission 03B (PHASE 5) — classes do gatilho. Sem ele, as classes atuais
   * são usadas (página de produto inalterada). */
  className?: string;
};

const DEFAULT_CLASSES =
  "flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500 hover:text-white";

export default function ShareButton({ slug, title, url, className }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const shareUrl = url ?? productUrl(slug);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url: shareUrl });
      } catch {
        // usuário cancelou o compartilhamento nativo, sem ação necessária
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button onClick={handleShare} className={className ?? DEFAULT_CLASSES}>
      <Share2 size={16} />
      {copied ? "Link copiado!" : "Compartilhar"}
    </button>
  );
}
