// NÃO cria lojas novas — só faz backfill de `slug`/`active` nas 5 lojas
// reais já cadastradas no Supabase (confirmadas ao vivo na Sprint 3.6:
// todas com slug/active nulos hoje). O seed localiza cada loja pelo `name`
// exato e atualiza apenas os dois campos abaixo, sem tocar em nenhum outro
// dado já preenchido (website, opening_hours, address, rating etc.).
module.exports = [
  { name: "Cellshop", slug: "cellshop", active: true },
  { name: "Nissei", slug: "nissei", active: true },
  { name: "Shopping China", slug: "shopping-china", active: true },
  { name: "Mega Eletrônicos", slug: "mega-eletronicos", active: true },
  { name: "Atacado Games", slug: "atacado-games", active: true },
];
