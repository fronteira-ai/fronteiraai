import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ParaguAI — Compare preços no Paraguai",
    short_name: "ParaguAI",
    description:
      "Pesquise produtos, compare preços entre lojas e descubra as melhores ofertas em Ciudad del Este.",
    start_url: "/",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#3b82f6",
    orientation: "portrait",
    categories: ["shopping", "business"],
    lang: "pt-BR",
    icons: [
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
