// Produtos de demonstração — nomes/specs realistas, mas tratados como dado
// de exemplo (não inventário real de nenhuma loja). brand_slug/category_slug
// referenciam brands/data.js e categories/data.js; resolvidos para id pelo
// orquestrador (database/seed/index.js) em tempo de execução.
module.exports = [
  {
    name: "iPhone 16 Pro 256GB Titânio Preto",
    slug: "iphone-16-pro-256gb-titanio-preto",
    brand_slug: "apple",
    category_slug: "celulares",
    description: "iPhone 16 Pro com chip A18 Pro, tela Super Retina XDR de 6.3\" e câmera de 48MP.",
    image_url: null,
    specifications: { tela: "6.3\"", armazenamento: "256GB", cor: "Titânio Preto", chip: "A18 Pro" },
  },
  {
    name: "MacBook Air M3 13\" 256GB",
    slug: "macbook-air-m3-13-256gb",
    brand_slug: "apple",
    category_slug: "notebooks",
    description: "MacBook Air com chip M3, tela de 13.6\" e até 18h de bateria.",
    image_url: null,
    specifications: { tela: "13.6\"", armazenamento: "256GB", chip: "Apple M3", ram: "8GB" },
  },
  {
    name: "Galaxy S25 Ultra 256GB",
    slug: "galaxy-s25-ultra-256gb",
    brand_slug: "samsung",
    category_slug: "celulares",
    description: "Galaxy S25 Ultra com S Pen integrada, câmera de 200MP e tela Dynamic AMOLED 2X.",
    image_url: null,
    specifications: { tela: "6.8\"", armazenamento: "256GB", cor: "Titânio Preto" },
  },
  {
    name: "Smart TV Samsung 55\" 4K QLED",
    slug: "smart-tv-samsung-55-4k-qled",
    brand_slug: "samsung",
    category_slug: "tvs",
    description: "Smart TV QLED 55 polegadas, 4K, com Tizen OS.",
    image_url: null,
    specifications: { tamanho: "55\"", resolucao: "4K", tecnologia: "QLED" },
  },
  {
    name: "DJI Mini 4 Pro",
    slug: "dji-mini-4-pro",
    brand_slug: "dji",
    category_slug: "drones",
    description: "Drone compacto com câmera 4K/60fps, sensores de detecção em todas as direções.",
    image_url: null,
    specifications: { peso: "249g", camera: "4K/60fps", alcance: "20km" },
  },
  {
    name: "PlayStation 5 Slim",
    slug: "playstation-5-slim",
    brand_slug: "sony",
    category_slug: "videogames",
    description: "Console PlayStation 5 Slim, 1TB, com leitor de discos.",
    image_url: null,
    specifications: { armazenamento: "1TB", modelo: "Slim" },
  },
];
