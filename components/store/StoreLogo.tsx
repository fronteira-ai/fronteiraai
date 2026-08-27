"use client";

import { useState } from "react";
import Image from "next/image";

type Props = {
  /** URL oficial da logomarca da loja (PR-004) — quando presente e carregável. */
  logoUrl?: string | null;
  /** Nome da loja — usado no fallback (monograma) e no alt. */
  name: string;
  /** Tamanho do quadrado exibido (px). Default 64. */
  size?: number;
  /** Raio do contêiner (px). Default 16. */
  radius?: number;
  /** Classes adicionais para o contêiner. */
  className?: string;
};

/**
 * Logo oficial da loja com fallback elegante (monograma) — nunca exibe imagem
 * quebrada. Dark/light agnóstico: contêiner com fundo escuro + padding, logo
 * em `object-contain`.
 */
export default function StoreLogo({ logoUrl, name, size = 64, radius = 16, className = "" }: Props) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(logoUrl) && !failed;
  const initial = name.trim().charAt(0)?.toUpperCase() ?? "?";

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden border border-slate-700 bg-slate-900 ${className}`}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      {showImage ? (
        <Image
          src={logoUrl as string}
          alt={`Logotipo ${name}`}
          fill
          sizes={`${size}px`}
          className="object-contain p-1"
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="font-black text-slate-600"
          style={{ fontSize: Math.round(size * 0.42) }}
          aria-hidden="true"
        >
          {initial}
        </span>
      )}
      {/* sr-only: texto da loja, para acessibilidade quando só monograma */}
      <span className="sr-only">{name}</span>
    </div>
  );
}
