"use client";

import { memo, useState } from "react";

type Props = {
  images: string[];
  alt: string;
};

function ProductGallery({ images, alt }: Props) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-3xl border border-slate-800 bg-slate-900/60 text-slate-500">
        Sem imagem disponível
      </div>
    );
  }

  return (
    <div className="w-full">

      <div className="aspect-square w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/60">
        <img
          src={images[active]}
          alt={alt}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="h-full w-full object-cover"
        />
      </div>

      {images.length > 1 ? (
        <div className="mt-4 flex gap-3">
          {images.map((image, index) => (
            <button
              key={image}
              onClick={() => setActive(index)}
              className={`h-20 w-20 overflow-hidden rounded-2xl border transition ${
                index === active
                  ? "border-blue-500"
                  : "border-slate-800 hover:border-slate-600"
              }`}
            >
              <img
                src={image}
                alt={`${alt} - ${index + 1}`}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : null}

    </div>
  );
}

export default memo(ProductGallery);
