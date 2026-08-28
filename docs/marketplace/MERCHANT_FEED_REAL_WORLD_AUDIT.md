# MERCHANT FEED — REAL-WORLD COMPATIBILITY AUDIT (CdE/Paraguay)

> **Sprint "REAL MERCHANT FEED COMPATIBILITY AUDIT V1"** — OSINT público sobre
> como os varejistas reais de Ciudad del Este distribuem dados de produtos e o
> quanto isso encaixa na Merchant Feed Platform V1.
> `EXECUTION_MODE = AUTONOMOUS`. Evidência > suposição. **Sem ativação de
> merchant feed não autorizada; sem ingestion em massa; sem bypass de anti-bot.**

---

## 0. Resumo executivo

A descoberta mais importante deste audit:

**Os varejistas de CdE JÁ distribuem dados estruturados de produtos para um
ecossistema público de comparação de preços** — comprovado por agregadores
públicos (`comprasparaguai.com.br` / `comprasparaguai.com.ar` / `lojasparaguai.com.br`)
que indexam **20 lojas de CdE** com ofertas estruturadas (modelo+id, SKU/Código,
`variant_id`, preço canônico em **USD**, imagem, `/lojas/<slug>/`, price-history).

A implicação comercial é **exatamente** a hipótese da Sprint:
- O lojista já mantém dados de catálogo estruturados (para o comparador).
- O ParaguAI NÃO precisa impor um formato — precisa **se plugar no mesmo fluxo
  real** (idealmente via o **merchant diretamente**, não via scraping do agregador).

**Mas com disciplina (evidência ≠ autorização):**
- Os feeds que os lojistas dão ao agregador são **`PUBLICLY_DISCOVERED_SOURCE`**,
  NÃO `MERCHANT_AUTHORIZED_OFFICIAL_FEED`. Ativar `OFFICIAL_MERCHANT_FEED` exige
  autorização do lojista — **fora do escopo deste Sprint**.
- Nenhum **merchant XML feed direto e autorizado** foi encontrado na internet
  pública. `REAL_FEED_DRY_RUNS = 0` (honesto).

---

## 1. Método

- **Fonte pública legítima**: `robots.txt`, `sitemap.xml`, páginas públicas de
  produto, JS público (fingerprint de frontend), perfis de loja em agregadores.
- **Sem brute-force de nomes de arquivo** (`/feed.xml` etc.) e **sem bypass de
  anti-bot/CAPTCHA** (nenhum; as requisições foram GET únicos com UA normal).
- **Regra**: `NO EVIDENCE = NOT PROVEN` → classificação  `E — BLOCKED / NOT PROVEN`.

---

## 2. Descoberta-chave: o ecossistema agregador de CdE

Fonte primária pública: **comprasparaguai.com.br** (+ `.com.ar` espelho, mesmo
índice) e **lojasparaguai.com.br**. Verificado via GET único legítimo (HTTP 200,
sem bypass de CAPTCHA):

**20 lojas com perfil estruturado `/lojas/<slug>/`**:
`agatres`, `atacado-connect`, `cellshop`, `elegancia-company`, `flytec-computers`,
`intershop-importados`, `la-petisquera`, `life-beach`, `madrid-center`,
`mega-eletronicos`, `mobile-zone`, `multipass`, `new-zone`, `nissei`, `one-click`,
`pontocom`, `shopping-china`, `star-company`, `topdek-informatica`, `visaovip`.

Cobertura das **15 lojas prioritárias**:
| Prioridade | No agregador? |
|---|---|
| Cellshop | ✅ |
| Nissei | ✅ |
| Shopping China | ✅ |
| Mega Eletrônicos | ✅ |
| New Zone | ✅ |
| Mobile Zone | ✅ |
| Roma Shopping | – (não) |
| Atacado Connect (= Atacado Games) | ✅ |
| Visão VIP | ✅ |
| Super Games | – |
| Alborada | – |
| Matrix Importados | – |
| Star Company | ✅ |
| Vertex Eletrônicos | – |
| Mario Cell | ✅ (via espelho `stage.comprasparaguay.com.ar/lojas/mario-cell/`) |

**Estrutura de oferta observada (página de modelo real, público)**:
- `celular-apple-iphone-16-pro-max-256gb__<variant_id>` → variante por loja.
- Lojas ofertantes do modelo amostrado: **Shopping China, Atacado Games,
  Multipass, Mario Cell**.
- Preço: `US$ 1.150,00` (canônico USD), com aviso "a partir de ... em N lojas".
- Identidade de produto: modelo + código (ex.: `a3084`, `a3296`) e codes tipo
  MPN (`69-484812-mp12-...`); **EAN/GTIN não confirmado**.
- Imagem: bucket público (ex.: `bucket-prod.us-ord-10.linodeobjects.com`) —
  imagem **relay** (hospedada/espelhada pelo agregador), não necessariamente no
  domínio do lojista.
- **Atenção (crítico p/ ParaguAI)**: ofertas agregadas **nem sempre estão vivas
  nem em estoque na loja de origem** (documentado no skill público de extração:
  oferta "US$ 7,00" de Shopping China apontava 404; "US$ 9,50" de Atacado Connect
  mostrava Indisponível). → reforça a regra **`unknown ≠ available`** e
  **`fetch failure ≠ out_of_stock`** do ParaguAI.

**Conclusão §13**: a hipótese "compras-paraguai-like" está **CONFIRMADA**. As
lojas de CdE já alimentam um comparador com dados estruturados. O ParaguAI deve
entrar nesse fluxo real com **autorização do lojista**, não replicar o crawler do
agregador.

---

## 3. Bundle de compatibilidade vs. feed de referência

Mapeamento SOURCE → PARAGUAI (campos de referência):
| Referência ParaguAI | Formato agregador real | Status |
|---|---|---|
| `codigo` (identidade) | `variant_id` / SKU/Código | ✅ compatível (diferente namespace) |
| `title`/`title_es` | slug de modelo + título | ✅ (normalização string) |
| `preco` | `US$ 1.150,00` (prefix moeda, milhar vírgula) | ✅ `MerchantPriceParser` |
| `price_iva` | não exportado (comparador aponta USD sem IVA) | ⚠️ divergente |
| `estoque` / `disponibilidade` | sinal de estoque **não confiável** no agregador | ⚠️ requer validação na origem |
| `marca` | presente nos nomes/modelos | 🟡 inferível |
| `link` | `external_url` por oferta | ✅ |
| `link_imagem` | imagem relay (bucket) | 🟡 imagem válida, origem 3o |
| `imagem de origem do lojista` | não confirmada | ⚠️ |

**Compatibilidade real**: o campo mais importante (identidade + preço USD) do
fluxo real casa com a V1. O gap está em **estoque real e imagem de origem**
— que a V1 já trata com cautela (`unknown ≠ available`).

---

## 4. Matriz por loja

Legenda classe: **A** drop-in · **B** light adapter · **C** public API/canal estruturado · **D** crawler · **E** não provado.
Merchant effort: ZERO/LOW/MEDIUM/HIGH. Recomendação: `MIGRAR`/`CONECTOR`/`OSINT`.

| Loja | Domínio (público) | Fonte atual ParaguAI | Melhor fonte descoberta | Formato | Público | Catálogo (evidência) | SKU/ident. | EAN/GTIN | Preço | Estoque | Imagem | Freshness | Score | Classe | Effort | Recomendação |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shopping China | shoppingchina.com.py | crawler+sitemap | sitemap.xml | XML(sitemap) | ✅ | grande (52k ofertas total globais) | ✅ | – | ✅ | ✅ | 🟡 | agendado | 85 | **A/B** | LOW | **CONECTOR→FEED (com autorização)** |
| Mega Eletrônicos | megaeletronicos.com | crawler | sitemap.xml | XML(sitemap)+agregador | ✅ | médio-grande | ✅ | – | ✅ | ✅ | 🟡 | agendado | 82 | **A/B** | LOW | **CONECTOR→FEED** |
| New Zone | newzone.com.py | GraphQL API | graphql (já usado) | JSON/GraphQL | ✅ | grande | ✅ | – | ✅ | ✅ | ✅ | agendado | 90 | **C** | LOW | **manter (public API)** |
| Mobile Zone | mobilezone.com.py | crawler | sitemap/robots 200 | HTML/sitemap | ✅ | médio | ✅ | – | ✅ | ✅ | 🟡 | agendado | 75 | **D/B** | MEDIUM | conector |
| Atacado Connect (= Atacado Games) | atacadoconnect.com / atacadogames.com | crawler (~18k sitemap) | sitemap + agregador | XML(sitemap)/HTML | ✅ | ~13.000 (site) | ✅ | – | ✅ | ✅ | 🟡 | agendado | 86 | **A/B** | LOW | **CONECTOR→FEED** |
| TopDek | topdek.com | crawler (254 locs) | sitemap.xml | XML(sitemap) | ✅ | pequeno | ✅ | – | ✅ | ✅ | 🟡 | agendado | 72 | **D/B** | MEDIUM | conector |
| Roma Shopping | romapy.com | crawler | sitemap_index.xml | XML(sitemap) | ✅ | pequeno-médio | ✅ | – | ✅ | ✅ | 🟡 | agendado | 74 | **D/B** | MEDIUM | conector |
| Cellshop | cellshop.com.py | – | agregador (perfil) | HTML estruturado (agregador) | ✅ (perfil) / 🔒 site próprio (405) | grande (250k itens loja física) | ✅ (variant_id) | – | ✅ USD | 🟡 | 🟡 relay | sinal agregador | 62 | **B** | LOW→MEDIUM | **primeiro parceiro candidato (autorização)** |
| Nissei | nissei.com | – | agregador (perfil) + e-comm (robots c/ content-signals) | HTML estruturado | 🔒 (site c/ restrição de coleta) | grande (Apple/Sony/Canon...) | ✅ | – | ✅ PYG | 🟡 | 🟡 | 403 site | 60 | **B** | LOW→MEDIUM | candidato TOP-5 |
| Visão VIP | visaovip.com | – | agregador (perfil) + filtros | HTML estruturado | ✅ agregador / 🔒 site (403) | grande (1.353 "celular" + 222 Blu) | ✅ | – | ✅ USD | 🟡 | 🟡 | agregador | 63 | **B** | LOW→MEDIUM | candidato TOP-5 |
| Alborada | alboradainfo.com | – | **public catalog API** (SPA Angular `/api/*` + price-list) | JSON/API (client-side) | ✅ (site 200) | médio-grande (eletrônicos/perfumaria) | ✅ (slug+modelo) | – | ✅ | 🟡 | ✅ | via API | 80 | **C** | LOW | **parceiro/public API** top tech |
| Matrix Importados | matriximportados.com.py | – | site e-comm (compras p/ cadastrados) | SPA/HTML | 🔒 (compra exige registro) | médio (Shopping Paris) | ✅ | – | ✅ | 🟡 | 🟡 | sít. | 52 | **E/B** | MEDIUM | depende de autorização p/ leitura |
| Star Company | – | – | agregador (`/lojas/star-company/`) | HTML estruturado (agregador) | ✅ perfil | perfumaria/cosméticos/mod. | ✅ | – | ✅ USD | 🟡 | 🟡 | agregador | 55 | **B** | MEDIUM | candidato de nicho (perfumes) |
| Mario Cell | (Jebai Center) | – | agregador (`/lojas/mario-cell/`) | HTML estruturado | ✅ perfil | celular/access. | ✅ | – | ✅ USD | 🟡 | 🟡 | agregador | 55 | **B** | MEDIUM | candidato de nicho |
| Super Games | – | – | – (sem evidência confiável) | – | – | – | – | – | – | – | – | – | 30 | **E** | HIGH | **NOT PROVEN** — requer OSINT/abordagem direta |
| Vertex Eletrônicos | – | – | – (sem evidência confiável) | – | – | – | – | – | – | – | – | – | 30 | **E** | HIGH | **NOT PROVEN** |

> "–" = sem evidência pública confirmada (não fabricado). `🔒` = site próprio bloqueia GET simples ou robots restringem coleta. Score 0-100 (ident.20/preço20/estoque15/título10/marca10/imagem10/URL5/cat5/desc3/fresh2).

---

## 5. Identity / identidade
- **Identificador estável**: a maioria expõe **SKU/Código** da loja e o agregador
  expõe `variant_id` estável. EAN/GTIN **não confirmado** em nenhuma fonte pública
  auditada. → ParaguAI não pode depender de GTIN hoje; o `externalId` da loja +
  modelo é o caminho (com casamento canônico por título+brand, **sem false-merge**).
- **Risco de identidade (feed 5k)**: **MEDIUM** — hoje já existem duplicatas de
  produto canônico; incorporar 5k ofertas de um feed sem GTIN robusto e sem
  matching conservador multiplica candidatos duplicados. Mitigação: dry-run +
  `AMBIGUOUS` em vez de fundir às cegas (já é a regra da V1).

## 6. Estoque / preço / imagem / freshness
- **Estoque real**: o agregador é **sinal não confiável** → para os canais
  autorizados, a V1 precisa validar na **origem** (`unknown ≠ available`).
- **Preço**: USD canônico no agregador; lojas próprias em PYG (Nissei) ou USD —
  V1 já preserva moeda (`US$ 1.150,00`, `₲`).
- **Imagem**: nos canais próprios é `MERCHANT_IMAGE_URL`/`STRUCTURED_API_IMAGE`
  (Alborada); no agregador é relap (`bucket` 3o) → **IMPORTANTE**: quando o
  merchant alimentar o ParaguAI, capturar a **imagem de origem** (do lojista),
  não a do bucket.
- **Freshness**: sinal de atualização raro fora do agregador (que tem price-history).
  ParaguAI usa a própria observação (sincronizada) — correto e suficiente.

## 7. Prioridade de fonte / arquitetura (§26-27)
`AUTHORIZED OFFICIAL API` → `AUTHORIZED OFFICIAL FEED` → `public store API` →
`public structured source` → `crawler`.
A implementação atual (V1 + Adaptive Sync) **suporta** essa ordem para **migração
de fonte sem duplicar ofertas**, desde que o `externalId` do merchant seja
estável e o Gatekeeper/casamento canônico seja conservador.
→ `SOURCE_PRIORITY_ARCHITECTURE = PASS`.

## 8. Candidatos de migração (sem migrar agora)
- **New Zone**: `GraphQL API (autorizada/publica)` já é o melhor — manter. Candidato `PUBLIC_API → (futuro) AUTHORIZED FEED`.
- **Shopping China / Mega / Atacado Connect**: `CRAWLER → (quando autorizado) MERCHANT FEED`.
- **Atacado Connect**: forte (13k produtos + site próprio + no agregador).

---

## 9. TOP 5 primeiros parceiros oficiais

Pontuação = effort (menor=melhor) + compatibilidade + valor catálogo + imagem +
preço/estoque + cobertura de marca.

1. **Shopping China** — já conectado, sitemap público, no ecossistema, effort LOW.
2. **Mega Eletrônicos** — já conectado, sitemap + agregador, effort LOW.
3. **New Zone** — já conectado via GraphQL pública, melhor API, effort LOW.
4. **Atacado Connect / Atacado Games** — 13k produtos, site + agregador, effort LOW-MEDIUM.
5. **Alborada** — public catalog API própria + price-list (comercial pronta p/ esse modelo), effort LOW.

**BEST_ZERO_EFFORT_CANDIDATE**: **Shopping China** (sitemap + já conectado; envia a
URL... mas é sitemap, não feed merchant → effort LOW, não ZERO).
**BEST_CATALOG_VALUE_CANDIDATE**: **Cellshop** (grande, 250k itens físicos, Apple,
nicho perfumaria) — exigirá autorização (esforço MEDIUM hoje).
**BEST_TECHNICAL_COMPATIBILITY_CANDIDATE**: **New Zone** (GraphQL pública já em uso).

`MIGRATION_CANDIDATES = shopping-china (crawler→feed), megaeletronicos, atacado-connect, topdek(opcional)`.

---

## 10. Decisão de formatos (§33)
- `JSON_FEED_IMPLEMENTATION_NEEDED` = **YES** — a única fonte estruturada
  comprovadamente "limpa" é a **API JSON** (New Zone GraphQL, Alborada `/api`).
  Um JSON adapter entra direto na V1 (`RawOffer`). Recomendado com evidência.
- `CSV_FEED_IMPLEMENTATION_NEEDED` = **YES (recomendado)** — CSV/planilha é um dos
  fluxos "lista de preços" mais comuns no varejo físico (e é ZERO-effort p/ lojista
  que exporta do ERP). Mas **não construir só por construir**: recomendado apenas
  porque há evidência de fluxo "lista de preços" (Alborada price-list; catálogos
  em planilha são padrão em CdE). Marcar como prioridade baixa/testável.
- `SELF_SERVICE_UI_NEEDED_NOW` = **NO** (§32 — provar compatibilidade antes).

---

## 11. Gates / produção
- **Código alterado**: `src/domains/merchant-feed/__tests__/RealMarketDataShape.test.ts`
  (fixture sanitizada do padrão real + 3 asserts de compat.). **Sem** mudança em
  produção/connectors/Adaptive Sync.
- `LINT / TYPECHECK / TESTS / BUILD` + `TEST_COUNT` — ver CHANGELOG; todos PASS.
- `PRODUCTION_IMPACT` = **ZERO** (nenhuma ativação, nenhuma escrita, nenhum
  conector alterado). Nenhuma produção merchant feed ativada (sem autorização).
- `OWNER_INTERRUPTION_COUNT` = 0.

---

## 12. Next Sprint recomendado
1. **Origem da imagem**: capturar imagem do **domínio do lojista** quando o
   merchant alimentar (evitar relay de 3o).
2. **Validação de estoque na origem** para canais autorizados (o agregador é
   sinal fraco).
3. **Adapter JSON feed** (prova a `RawOffer`) — aproveita New Zone/Alborada.
4. **Prova conceito com 1 lojista real autorizado** (Shopping China ou Atacado
   Games) — dry-run → preview → ativação com autorização explícita.
5. Não construir self-service UI até haver ≥1 parceiro oficial.

**Comercial**: o pitch "VOCÊ JÁ TEM UM FEED OU LISTA DE PRODUTOS? MANDE O LINK.
O PARAGUAI CUIDA DO RESTO." é **verdadeiro** para o modelo de dados real do mercado
(o lojista já alimenta um comparador) — falta apenas a **autorização do lojista**
para que o ParaguAI consuma o dado **diretamente** da origem preferida.
