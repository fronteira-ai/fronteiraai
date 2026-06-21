"use client";

import { useState } from "react";
import { Share2 } from "lucide-react";
import { productUrl } from "@/constants/routes";

type Props = {
  slug: string;
  title: string;
};

export default function ShareButton({ slug, title }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = productUrl(slug);

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // usuário cancelou o compartilhamento nativo, sem ação necessária
      }
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-2 rounded-full border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-blue-500 hover:text-white"
    >
      <Share2 size={16} />
      {copied ? "Link copiado!" : "Compartilhar"}
    </button>
  );
}
