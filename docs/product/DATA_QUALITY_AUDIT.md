# DATA_QUALITY_AUDIT.md
# FASE 2 — SPRINT 2.4 — Data Quality Discovery — Objetivo 1

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Natureza**: Investigação read-only. Nenhuma extração implementada, nenhum parser alterado, nenhuma escrita em produção, nenhuma mudança em Product Identity/Shadow Mode/Connector Platform. Fontes: código dos 5 conectores já em produção (`src/domains/connectors/crawler/*`) e busca ao vivo, pública, read-only, das mesmas páginas/endpoints que os conectores já acessam (permissão explícita do CTO obtida antes — mesma disciplina de `[[feedback_no_direct_db_queries]]`, aplicada por analogia a acesso externo).
**Companion**: `PRODUCT_COMPARISON_AUDIT.md` (Sprint 2.3 — confirmou o gargalo é qualidade de dado, não geração de candidatos), `ATTRIBUTE_COVERAGE_MATRIX.md` (números consolidados desta Sprint)

---

## 1. Metodologia

Para cada um dos 5 merchants: (a) leitura do `detail-parser.ts`/`product-mapper.ts` real para saber o que **já é extraído hoje**; (b) busca ao vivo de 1-2 páginas/endpoints de produto reais (URLs obtidas de `offers.product_url` já persistido, leitura read-only) para inspecionar o HTML/JSON **bruto**, procurando por `application/ld+json`, microdata (`itemprop`), meta tags Open Graph/produto, tabelas de atributos visíveis, e blobs de estado embutidos (JSON de frameworks como Next.js/React). O objetivo é medir o que **existe na fonte**, não só o que o parser atual usa — a Sprint 2.3 já mostrou que os parsers atuais descartam a maior parte do que está disponível.

## 2. Shopping China (Magento)

**Extraído hoje**: nome (`<h1>`), preço (regex sobre texto da página), marca (regex `"Marca:"`), categoria (breadcrumb), descrição, imagem.

**Achado novo**: as páginas carregam um widget de terceiro (Flixmedia — conteúdo rico de fabricante) via `data-flix-ean`, com um **EAN/GTIN-13 real do produto** — confirmado em 2/2 produtos amostrados (`6931940799997` para um Oukitel C65, `6941812791240` para um Redmi Buds 6 Play). Este é o único merchant dos 5 com GTIN observado diretamente. A tabela nativa de atributos do Magento (`product-attribute-specs-table`) existe como hook no template, mas não estava populada em nenhum dos 2 produtos amostrados — capacidade estrutural presente, mas dado ausente ou dependente de cadastro manual pelo lojista.

## 3. Mega Eletrônicos (template próprio)

**Extraído hoje**: nome (CSS selector), preço USD/BRL, categoria (link), marca (link), estoque, imagem.

**Achado novo**: a página incorpora um blob JSON de estado (`feature_product`) com uma lista de atributos genuinamente estruturados por produto — confirmado em 2/2 produtos amostrados. Exemplo real (Garmin Forerunner 170): `MODELO: "Forerunner 170 Music 010-03920"`, `COR: "Relógio: Teal Green - Pulseira:Citron"`, `VISOR: "Always-On de 1.2\" AMOLED"`, `MEMÓRIA INTERNA: "4GB"`, `FUNÇÕES: "..."`. O rótulo de cada atributo já vem em português, pronto para virar chave de `specifications`.

## 4. Roma Shopping (WooCommerce)

**Extraído hoje**: nome, preço (meta Open Graph), moeda, disponibilidade (meta Open Graph), SKU (`.sku`), categoria (link), marca (`itemprop="brand"`), imagem (`og:image`).

**Achado novo**: a aba "Informação adicional" do WooCommerce expõe uma tabela de atributos por taxonomia — confirmado em 1/1 produto amostrado (Cuisinart DGB-800NAS): `pa_brand: "Cuisinart"`, `pa_modelo: "DGB-800NAS"`, `pa_cor: "Preto"`, `pa_capacidade: "12 xícaras"`, `pa_voltagem-frequencia: "110V"`, `pa_outras-caracteristicas` (texto livre). São exatamente os atributos que `ProductIdentityEngine` mais valoriza (modelo, cor, capacidade) — 100% descartados hoje.

## 5. Atacado Connect (Next.js, JSON-LD)

**Extraído hoje**: nome, descrição, imagem, marca, categoria (da URL), preço, moeda, estoque — via bloco `application/ld+json` schema.org/Product completo.

**Achado**: este é o merchant mais "raso" dos 5 para atributos estruturados. O bloco JSON-LD real (inspecionado ao vivo) **não contém** `sku`, `gtin`, `mpn`, `color`, `size` nem `additionalProperty` — campos que o schema.org Product suporta, mas que este site não preenche. Não há `__NEXT_DATA__` nem outro blob de estado com mais dados (confirmado, 0 ocorrências). O único sinal extra é a descrição em prosa (`"128 GB de armazenamento... chip A16 Bionic..."`), que carrega informação real mas exigiria extração por NLP/regex sobre texto livre — técnica de custo/risco mais alto que os outros 4 merchants, que expõem dado já estruturado.

## 6. Mobile Zone (API REST)

**Extraído hoje**: nome, marca (primeiro item do array), categoria (última do array), imagem, estoque, preço.

**Achado novo, o mais rico dos 5**: a API retorna dois campos inteiramente ignorados pelo `ApiProduct` (tipo TypeScript do conector nem os declara): `productHasDetails[]` (lista de atributos rotulados, ex.: `Modelo`, `Procesador`, `Capacidad de almacenamiento`, `Cámara frontal`, `Cámara trasera`, `Conectividad`, `GPS`, `Sistema Operativo`, entre 60+ rótulos distintos observados na amostra) e `productHasColors[]` (cor estruturada, com `id_color`, `name_py`/`name_en`/`name_br` e um slot `hexa` para código de cor). Medido em amostra de 300 produtos reais via `GET /api/products?offset=0&limit=300`:

| Campo | Cobertura (amostra 300) |
|---|---|
| `productHasBrands` | 90,7% |
| `productHasImages` | 100% |
| `productHasDetails` (qualquer atributo) | 90,0% |
| `productHasColors` | 38,7% |

Recorte específico para produtos "tipo celular" (39 de 300 na amostra, por nome):

| Atributo | Cobertura |
|---|---|
| `Modelo` | 90% |
| `Procesador` | 92% |
| `Capacidad de almacenamiento` | 85% |
| `productHasColors` | 46% |
| `Código de barras` (rótulo existe na taxonomia, mas...) | **0%** — rótulo existe, nunca populado nesta amostra |

## 7. Resumo por merchant — o que está disponível vs. o que é extraído hoje

| Merchant | Extraído hoje | Disponível e não extraído | Esforço de extração |
|---|---|---|---|
| Shopping China | nome, marca, categoria, descrição, imagem | EAN/GTIN (`data-flix-ean`) | Baixo (1 atributo, regex) |
| Mega Eletrônicos | nome, preço, categoria, marca, estoque, imagem | `feature_product` (specs estruturados, rótulo já em PT) | Baixo-médio (parsear 1 blob JSON já baixado) |
| Roma Shopping | nome, preço, moeda, disponibilidade, SKU, categoria, marca, imagem | tabela `pa_*` (modelo, cor, capacidade, voltagem) | Baixo-médio (parsear tabela HTML já baixada) |
| Atacado Connect | nome, descrição, imagem, marca, categoria, preço, moeda, estoque | nada estruturado além do já extraído — só prosa em `description` | Alto (NLP sobre texto livre, menor confiança) |
| Mobile Zone | nome, marca, categoria, imagem, estoque, preço | `productHasDetails` (90% cobertura), `productHasColors` (38,7-46%) | Baixo (2 campos já vêm no mesmo payload JSON já baixado, zero HTTP novo) |

**Achado central**: para 4 dos 5 merchants, dado estruturado relevante para comparação de produto (modelo, cor, capacidade) **já está sendo baixado hoje** (está no mesmo HTML/JSON que o conector já busca) e é descartado na normalização. Não é um problema de "os merchants não publicam isso" — é um problema de "nossos parsers não leem o que já está na resposta". Apenas Atacado Connect exige trabalho genuinamente novo (parsing de linguagem natural) para ir além do que já é extraído.
