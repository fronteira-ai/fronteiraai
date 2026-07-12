# ATTRIBUTE_COVERAGE_MATRIX.md
# FASE 2 — SPRINT 2.4 — Data Quality Discovery — Objetivo 2

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companion**: `DATA_QUALITY_AUDIT.md` (evidência bruta por merchant)

---

## 1. Método de classificação

- **% cobertura**: medida onde há amostra real (Mobile Zone, via API, amostra de 300); estimada como "confirmado em N/N amostrados" onde só foi viável buscar 1-2 páginas ao vivo (os 4 merchants baseados em HTML/scraping — buscar uma amostra maior exigiria muitas requisições ao vivo contra sites de terceiros, fora do escopo proporcional desta Sprint de descoberta).
- **Qualidade estimada**: Alta (dado estruturado, vocabulário controlado ou unidade clara), Média (estruturado mas texto livre dentro do campo), Baixa (só disponível como prosa não estruturada).
- **Consistência**: se o mesmo atributo usa o mesmo rótulo/formato entre produtos do mesmo merchant.
- **Facilidade de extração**: Baixa/Média/Alta esforço de engenharia — todas as fontes desta tabela **já estão no HTML/JSON que os conectores baixam hoje**; nenhuma reescrita de discovery/paginação é necessária (não é uma mudança de Connector Platform).

## 2. Matriz — atributo × merchant

| Atributo | Shopping China | Mega Eletrônicos | Roma Shopping | Atacado Connect | Mobile Zone |
|---|---|---|---|---|---|
| **Marca** | ✅ Alta, regex "Marca:" | ✅ Alta, link estruturado | ✅ Alta, `itemprop="brand"` + `pa_brand` | ✅ Alta, JSON-LD `brand.name` | ✅ Alta, `productHasBrands` (90,7%) |
| **Modelo** | ❌ não encontrado | ✅ `feature_product` (rótulo "MODELO") | ✅ `pa_modelo` | ❌ não encontrado no JSON-LD | ✅ `productHasDetails` rótulo "Modelo" (90% em produtos tipo celular) |
| **Cor** | ❌ não encontrado | ✅ `feature_product` (rótulo "COR") | ✅ `pa_cor` | ❌ não encontrado | ✅ `productHasColors` (46% em celulares, 38,7% geral) — estruturado, com slot de hex |
| **Capacidade/Armazenamento** | ❌ não encontrado | ⚠️ possível via `feature_product` (rótulo varia por categoria, não confirmado para celulares nesta amostra) | ✅ `pa_capacidade` | ❌ não encontrado | ✅ `productHasDetails` rótulo "Capacidad de almacenamiento" (85% em celulares) |
| **Processador/Chipset** | ❌ não encontrado | ⚠️ não confirmado nesta amostra (produto amostrado foi um relógio, não celular) | ❌ não encontrado | ❌ não encontrado (só em prosa) | ✅ `productHasDetails` rótulo "Procesador"/"Chipset" (92% em celulares) |
| **SKU (identificador do lojista)** | ⚠️ presente na URL/externalId, não como campo separado | ✅ `sku`/`productID` no JSON-LD (= externalId, já capturado) | ✅ `.sku` / REF (já capturado como externalId) | ⚠️ presente na URL (`/produto/.../{id}`), já capturado como externalId | ✅ `id_product` (já capturado como externalId) |
| **GTIN/EAN** | ✅ `data-flix-ean`, confirmado em 2/2 amostrados | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado no JSON-LD | ⚠️ rótulo "Código de barras" existe na taxonomia de `productHasDetails`, mas 0/39 produtos tipo celular amostrados o têm populado |
| **MPN** | ⚠️ campo existe no widget Flixmedia mas vazio no produto amostrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado |
| **Categoria original (texto do site)** | ✅ Alta, breadcrumb | ✅ Alta, link | ✅ Alta, taxonomia WooCommerce | ✅ Alta, segmento de URL | ✅ Alta, array `productHasCategories` |
| **Especificações técnicas gerais (câmera, GPS, conectividade, SO)** | ❌ não encontrado | ⚠️ possível via outros rótulos de `feature_product`, não confirmado nesta amostra específica | ✅ `pa_outras-caracteristicas` (texto livre) | ❌ só em prosa | ✅ `productHasDetails` — rótulos "Cámara frontal/trasera", "Conectividad", "GPS", "Sistema Operativo" confirmados em amostra de celular |
| **Peso** | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado nesta amostra |
| **Dimensões** | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado | ❌ não encontrado nesta amostra |
| **Imagens** | ✅ Alta, CDN pattern | ✅ Alta | ✅ Alta, `og:image` | ✅ Alta, JSON-LD `image` | ✅ Alta, 100% na amostra |

Legenda: ✅ confirmado disponível e não extraído hoje (ou já extraído, no caso de Marca/Categoria/SKU) · ⚠️ parcialmente confirmado / precisa de amostra maior · ❌ não encontrado nas páginas/endpoints amostrados.

## 3. Leitura da matriz

- **Peso e Dimensões não foram encontrados em nenhum dos 5 merchants** nesta amostra — não fabricar a expectativa de que esses dois atributos estão disponíveis; se forem necessários, exigiriam uma fonte diferente (ex.: base de dados de fabricante, fora do escopo de scraping).
- **GTIN/MPN são o atributo mais raro e mais valioso**: só confirmado (Shopping China) ou parcialmente presente na taxonomia mas nunca populado (Mobile Zone). GTIN seria o sinal de identidade mais forte possível (um EAN idêntico entre 2 ofertas é, por definição de padrão internacional, o mesmo produto físico) — mas hoje só existe de forma confiável em 1 dos 5 merchants, então não resolve comparação cross-merchant sozinho ainda.
- **Modelo, Cor e Capacidade — os 3 atributos que mais moveriam `ProductIdentityEngine`** (nome, `specifications`, `model-number` são exatamente os 3 fatores fuzzy do engine, ver `MERGECANDIDATE_FLOW_REPORT.md` da Sprint 2.3) — estão disponíveis em 3 dos 5 merchants (Mega Eletrônicos, Roma Shopping, Mobile Zone) com boa cobertura amostral, e ausentes nos outros 2 (Shopping China, Atacado Connect — coincidentemente o par com a única sobreposição de catálogo já medida, `MERCHANT_OVERLAP_MATRIX.md`).
