import { Category } from "@/types/category";

// Dados de exemplo para a Home (ver relatório da Sprint 3.0): productCount
// não é uma coluna real de "categories", é um valor ilustrativo até existir
// uma consulta agregada real.
export const sampleCategories: (Category & { productCount: number })[] = [
  {
    id: "1",
    name: "Smartphones",
    slug: "smartphones",
    icon: "📱",
    created_at: new Date().toISOString(),
    productCount: 48200,
  },
  {
    id: "2",
    name: "Informática",
    slug: "informatica",
    icon: "💻",
    created_at: new Date().toISOString(),
    productCount: 32100,
  },
  {
    id: "3",
    name: "Games",
    slug: "games",
    icon: "🎮",
    created_at: new Date().toISOString(),
    productCount: 21800,
  },
  {
    id: "4",
    name: "Câmeras",
    slug: "cameras",
    icon: "📷",
    created_at: new Date().toISOString(),
    productCount: 9600,
  },
  {
    id: "5",
    name: "Wearables",
    slug: "wearables",
    icon: "⌚",
    created_at: new Date().toISOString(),
    productCount: 14300,
  },
  {
    id: "6",
    name: "Áudio",
    slug: "audio",
    icon: "🎧",
    created_at: new Date().toISOString(),
    productCount: 17900,
  },
];
