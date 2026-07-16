import type { UniversalCategoryNode } from "../types/taxonomy.types";

// Program Κ — Mission Κ-2, Objetivo 2. The official ParaguAI taxonomy —
// designed top-down (per the mandate: "nunca depender das categorias dos
// lojistas"), then grounded bottom-up wherever a real, already-validated
// category cluster exists (`realCategorySlugs`, sourced from the exact 66
// clusters CATEGORY_CLUSTER_MATRIX.md / kappa1-impact-simulation.ts's
// VALIDATED_CLUSTERS already validated by manual PT/ES review — no new
// synonym judgment invented here). Departments/nodes with an empty
// `realCategorySlugs` are honest placeholders — the tree names a concept
// the marketplace should eventually cover, not a claim that data exists
// today (Games/Automotivo/Esportes match the zero-coverage gaps
// docs/marketplace/CATEGORY_GAP_REPORT.md already measured).
export const UNIVERSAL_TAXONOMY: UniversalCategoryNode[] = [
  {
    slug: "eletronicos",
    name: "Eletrônicos",
    level: 0,
    realCategorySlugs: [],
    children: [
      { slug: "smartphones", name: "Smartphones", level: 1, realCategorySlugs: ["celulares", "smartphones", "celular", "celulares-e-smartphones"] },
      {
        slug: "acessorios-para-celular",
        name: "Acessórios para Celular",
        level: 2,
        realCategorySlugs: ["accesorios-para-celulares", "accesorio-para-celulares"],
      },
      { slug: "tablets", name: "Tablets", level: 1, realCategorySlugs: ["tablet", "tablets"] },
      { slug: "smartwatch", name: "Smartwatch", level: 1, realCategorySlugs: ["smartwatch", "smartwatches"] },
      { slug: "notebook", name: "Notebook", level: 1, realCategorySlugs: ["notebooks"] },
      {
        slug: "acessorios-para-notebook",
        name: "Acessórios para Notebook",
        level: 2,
        realCategorySlugs: ["accesorios-para-notebook", "accesorios-p-notebook"],
      },
      { slug: "desktop", name: "Desktop", level: 1, realCategorySlugs: [] },
      { slug: "monitor", name: "Monitor", level: 1, realCategorySlugs: ["monitor", "monitores"] },
      { slug: "tv", name: "TV", level: 1, realCategorySlugs: ["tvs", "televisor", "televisores"] },
      { slug: "drone", name: "Drone", level: 1, realCategorySlugs: [] },
      {
        slug: "camera",
        name: "Câmera",
        level: 1,
        realCategorySlugs: ["cameras-fotograficas", "camaras-fotograficas", "cameras", "camaras"],
      },
      { slug: "camera-de-acao", name: "Câmera de Ação", level: 2, realCategorySlugs: [] },
      {
        slug: "fones-de-ouvido",
        name: "Fones de Ouvido",
        level: 1,
        realCategorySlugs: ["fone-de-ouvido-sem-fio", "fone-de-ouvido-com-fio", "fones-de-ouvido", "auriculares", "headsets", "headset"],
      },
      { slug: "caixa-de-som", name: "Caixa de Som", level: 1, realCategorySlugs: ["caixa-de-som", "caixas-de-som", "speaker", "speakers", "parlantes"] },
      {
        slug: "informatica",
        name: "Informática",
        level: 1,
        realCategorySlugs: [],
        children: [
          { slug: "processador", name: "Processador", level: 2, realCategorySlugs: ["processador", "processadores", "procesadores"] },
          { slug: "placa-de-video", name: "Placa de Vídeo", level: 2, realCategorySlugs: ["placas-de-video", "placa-de-video"] },
          { slug: "memoria-ram", name: "Memória RAM", level: 2, realCategorySlugs: ["memoria-ram", "memoria-ram-para-notebook", "memoria-ram-para-pc"] },
          { slug: "gabinete", name: "Gabinete", level: 2, realCategorySlugs: ["gabinetes", "gabinete"] },
          { slug: "teclado", name: "Teclado", level: 2, realCategorySlugs: ["teclado", "teclados"] },
          { slug: "mouse", name: "Mouse", level: 2, realCategorySlugs: ["mouses", "mouse"] },
          { slug: "kit-mouse-teclado", name: "Kit Mouse e Teclado", level: 2, realCategorySlugs: ["kit-mouse-y-teclado", "teclados-mouses"] },
          { slug: "impressora", name: "Impressora", level: 2, realCategorySlugs: ["impressoras", "impresoras"] },
          { slug: "roteador", name: "Roteador", level: 2, realCategorySlugs: ["roteador", "router"] },
          { slug: "webcam", name: "Webcam", level: 2, realCategorySlugs: ["webcams", "webcam"] },
          { slug: "pendrive", name: "Pendrive", level: 2, realCategorySlugs: ["pendrive", "pendrives"] },
          { slug: "cartao-de-memoria", name: "Cartão de Memória", level: 2, realCategorySlugs: ["cartao-de-memoria-e-sd", "cartoes-de-memoria", "tarjeta-de-memoria"] },
        ],
      },
      { slug: "cabos-e-adaptadores", name: "Cabos & Adaptadores", level: 1, realCategorySlugs: ["cabos-adaptadores-para-tv", "cabos-adaptadores-e-hubs", "cabos-e-adaptadores", "cabos-adaptadores-para-audio", "cabos-adaptadores-automotivos", "adaptadores-carregadores-e-cabos"] },
      { slug: "carregador", name: "Carregador", level: 1, realCategorySlugs: ["carregadores", "cargadores"] },
    ],
  },
  {
    slug: "games",
    name: "Games",
    level: 0,
    realCategorySlugs: ["jogos", "juegos", "games"],
    children: [
      { slug: "nintendo-switch", name: "Nintendo Switch", level: 1, realCategorySlugs: ["nintendo-switch"] },
      { slug: "jogo-para-nintendo-switch", name: "Jogo para Nintendo Switch", level: 2, realCategorySlugs: ["jogo-para-nintendo-switch"] },
      { slug: "video-game-retro", name: "Video Game Retrô", level: 1, realCategorySlugs: ["video-game-retro", "video-games"] },
      { slug: "controle", name: "Controle", level: 2, realCategorySlugs: ["controles", "controle"] },
    ],
  },
  {
    slug: "perfumes",
    name: "Perfumes",
    level: 0,
    realCategorySlugs: ["perfumes", "perfume"],
    children: [
      { slug: "perfume-masculino", name: "Perfume Masculino", level: 1, realCategorySlugs: ["perfume-masculino"] },
      { slug: "perfume-feminino", name: "Perfume Feminino", level: 1, realCategorySlugs: ["perfume-feminino", "perfume-femenino"] },
      { slug: "perfume-unissex", name: "Perfume Unissex", level: 1, realCategorySlugs: ["perfume-unissex"] },
      { slug: "colonia-body-splash", name: "Colônia & Body Splash", level: 1, realCategorySlugs: ["colonia-body-splash", "body-splash"] },
    ],
  },
  {
    slug: "beleza-e-cuidados-pessoais",
    name: "Beleza e Cuidados Pessoais",
    level: 0,
    realCategorySlugs: [],
    children: [
      { slug: "cuidado-pessoal", name: "Cuidado Pessoal", level: 1, realCategorySlugs: ["cuidado-personal", "cuidados-personales"] },
      { slug: "cosmeticos", name: "Cosméticos", level: 1, realCategorySlugs: ["cosmetico", "cosmeticos"] },
      { slug: "condicionador", name: "Condicionador", level: 2, realCategorySlugs: ["condicionador", "condicionadores"] },
      { slug: "desodorante", name: "Desodorante", level: 2, realCategorySlugs: ["desodorante", "desodorantes"] },
    ],
  },
  {
    slug: "relogios",
    name: "Relógios",
    level: 0,
    realCategorySlugs: [],
    children: [
      { slug: "reloj-masculino", name: "Relógio Masculino", level: 1, realCategorySlugs: ["reloj-masculino", "relojes-masculinos"] },
      { slug: "reloj-femenino", name: "Relógio Feminino", level: 1, realCategorySlugs: ["reloj-femenino", "relojes-femeninos"] },
    ],
  },
  {
    slug: "casa",
    name: "Casa",
    level: 0,
    realCategorySlugs: [],
    children: [
      {
        slug: "eletrodomesticos",
        name: "Eletrodomésticos",
        level: 1,
        realCategorySlugs: [],
        children: [
          { slug: "cafeteira", name: "Cafeteira", level: 2, realCategorySlugs: ["cafeteira", "cafetera"] },
          { slug: "aspirador", name: "Aspirador", level: 2, realCategorySlugs: ["aspiradores", "aspirador", "aspiradora"] },
          { slug: "sanduicheira", name: "Sanduicheira", level: 2, realCategorySlugs: ["sanduicheira", "sandwichera"] },
          { slug: "panela", name: "Panela", level: 2, realCategorySlugs: ["panelas", "panela"] },
          { slug: "espremedor", name: "Espremedor / Extrator de Suco", level: 2, realCategorySlugs: ["espremedor-e-extrator-de-suco", "extrator-de-suco"] },
          { slug: "nobreak-estabilizador", name: "Nobreak / Estabilizador", level: 2, realCategorySlugs: ["nobreaks-e-estabilizadores", "nobreak-estabilizador", "upsnobreak", "ups-nobreaks"] },
        ],
      },
      { slug: "iluminacao", name: "Iluminação", level: 1, realCategorySlugs: ["lampara", "lampada"] },
    ],
  },
  {
    slug: "automotivo",
    name: "Automotivo",
    level: 0,
    realCategorySlugs: [],
    children: [{ slug: "carregador-veicular", name: "Carregador Veicular", level: 1, realCategorySlugs: ["carregador-veicular", "carregador-veicular-usb"] }],
  },
  { slug: "esportes", name: "Esportes", level: 0, realCategorySlugs: [], children: [{ slug: "patinete", name: "Patinete / Scooter", level: 1, realCategorySlugs: ["patinetes", "patineta", "patinete", "scooters", "scooter"] }] },
  { slug: "instrumentos", name: "Instrumentos", level: 0, realCategorySlugs: [], children: [{ slug: "instrumentos-musicais", name: "Instrumentos Musicais", level: 1, realCategorySlugs: ["instrumentos-musicales"] }] },
  {
    slug: "moda-e-acessorios",
    name: "Moda e Acessórios",
    level: 0,
    realCategorySlugs: [],
    children: [{ slug: "bolsas-e-mochilas", name: "Bolsas e Mochilas", level: 1, realCategorySlugs: ["bolsas-y-mochilas", "mochilas-y-bolsas", "mochilas-maletas-e-capas", "maletasmochilascapas"] }],
  },
  { slug: "ferramentas", name: "Ferramentas", level: 0, realCategorySlugs: ["ferramentas", "herramientas", "ferramenta"] },
];

// Flat lookup helpers — pure functions, no I/O.
export function flattenTree(nodes: UniversalCategoryNode[] = UNIVERSAL_TAXONOMY): UniversalCategoryNode[] {
  const out: UniversalCategoryNode[] = [];
  for (const node of nodes) {
    out.push(node);
    if (node.children) out.push(...flattenTree(node.children));
  }
  return out;
}

export function findNodeByRealCategorySlug(realSlug: string): UniversalCategoryNode | null {
  for (const node of flattenTree()) {
    if (node.realCategorySlugs.includes(realSlug)) return node;
  }
  return null;
}
