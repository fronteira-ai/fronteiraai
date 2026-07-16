# ATTRIBUTE_EXTRACTION.md
# Program Κ — Mission Κ-3 — Objetivo 1/2

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15 — medição direta contra produção via `scripts/kappa3-attribute-audit.ts` (read-only, 18.010 `canonical_products`)

---

## 1. Auditoria completa (Objetivo 1)

| Métrica | Valor |
|---|---:|
| `canonical_products` totais | 18.010 |
| `specifications` vazio | 6.578 (36,5%) |
| `specifications` não-vazio | 11.432 (63,5%) |
| Chaves distintas encontradas | **323** |

**Achado central**: a mesma fragmentação lexical que a Mission Κ-1 encontrou em `categories` (929 linhas para poucas centenas de conceitos) existe, na mesma forma, nas CHAVES de `specifications` — não só nos valores. Exemplo real: cor aparece separadamente como `COR` (3.228), `Color` (3.135) e `cor` (2) — 3 chaves distintas para o mesmo conceito. Isso é o motivo exato pelo qual o fator `specifications` do `ProductIdentityEngine` (comparação exata de chave+valor) raramente encontrava overlap: duas ofertas podiam ambas ter cor preenchida e nunca serem comparadas, porque uma usava `COR` e a outra `Color`.

### Ranking das 20 chaves mais frequentes

| Chave | Ocorrências | % | Atributo oficial mapeado? |
|---|---:|---:|---|
| Modelo | 5.231 | 29,04% | ✅ `model` |
| PESO BRUTO (g) | 5.121 | 28,43% | ❌ (fora do escopo — logística, não identidade) |
| DIMENSÕES DA EMBALAGEM (cm) | 5.120 | 28,43% | ❌ (idem) |
| MODELO | 5.115 | 28,40% | ✅ `model` |
| COR | 3.228 | 17,92% | ✅ `color` |
| Color | 3.135 | 17,41% | ✅ `color` |
| CARACTERÍSTICAS | 2.920 | 16,21% | ❌ texto livre, não estruturável sem heurística nova |
| INCLUI | 2.760 | 15,32% | ✅ `bundle_includes` |
| Conectividad | 1.848 | 10,26% | ❌ (não mapeado — ver §3) |
| MARCA | 1.805 | 10,02% | Redundante — já 100% coberto por `brand_id` |
| VOLTAGEM | 1.088 | 6,04% | ✅ `voltage` |
| POTÊNCIA | 845 | 4,69% | ✅ `power_w` |
| TELA | 832 | 4,62% | ✅ `screen_size_in` |
| PROCESSADOR CPU | 756 | 4,20% | ✅ `processor` |
| MEMÓRIA RAM | 733 | 4,07% | ✅ `ram_gb` |
| MEMÓRIA INTERNA | 703 | 3,90% | ✅ `capacity_gb` |
| GPU | 388 | 2,15% | ✅ `gpu` |
| Código de barras | 376 | 2,09% | ✅ `ean` |
| Capacidad de almacenamiento | 498 | 2,77% | ✅ `capacity_gb` |
| Energía / Voltaje | 495 | 2,75% | ✅ `voltage` |

## 2. Extractors construídos (Objetivo 2)

Cobrem 8 dos ~22 atributos nomeados no mandato com grounding real e alta frequência: **Marca** (lookup direto de `brand_id`, 100% cobertura, zero extração), **Modelo** (reuso do parser Apple da Κ-2 + código de fabricante via nome), **EAN**, **MPN/Part Number/SKU fabricante** (unificados em `manufacturerCode` — heurística de token, ver §4), **Capacidade**, **RAM**, **Cor**, **Tela**, **Voltagem**, **Potência**, **CPU**, **GPU**, **Bundle**.

**Deliberadamente não construídos** (medidos, não simplesmente esquecidos):
- **Linha/Família** — nenhuma chave real de `specifications` corresponde a esse conceito isoladamente; `MODELO`/`Modelo` já cobre o nível mais específico. Construir "linha" exigiria um dicionário próprio por marca (ex.: "Galaxy S" vs "Galaxy A" para Samsung) — não medido, fora do escopo desta Mission.
- **Ano/Geração** — chave `ANO` medida com apenas 2 ocorrências (0,01%) — dado real, mas volume insuficiente para justificar um extrator dedicado.
- **Condição** — não existe como chave de `specifications`; o sinal real está no texto do NOME (ex.: "S Lacre", "CX Feia", "CPO"), já confirmado em amostras da Κ-2 — extração desse sinal específico não foi construída nesta Mission (candidato real para uma próxima Wave, nomeado aqui, não escondido).
- **Tamanho/Versão** — `TAMANHO`/`Tamaño` medidos (508 ocorrências combinadas) mas deliberadamente excluídos do mapa de aliases: o significado é dependente de categoria (tamanho de relógio vs. comprimento de cabo vs. dimensão física) — mapear direto arriscaria conflatar grandezas físicas diferentes sob uma única chave, violando a disciplina de confiança do Objetivo 4.

## 3. Chaves medidas e explicitamente não mapeadas

`Conectividad`/`CONECTIVIDADE WIRELESS`/`BATERIA`/`SENSOR`/`SISTEMA OPERACIONAL`/`CÂMERA` — todas de alta frequência real (>600 ocorrências), mas cada uma descreve um conjunto de sub-especificações (ex.: câmera tem MP + abertura + OIS numa string só), não um valor atômico único — normalizar exigiria um parser por atributo próprio, não coberto pelo escopo desta Mission (`src/domains/product-intelligence/extraction/attribute-key-aliases.ts`, comentário de cabeçalho).

## 4. Manufacturer Code (EAN/MPN/Part Number/SKU) — heurística validada

`extractManufacturerCode()` escaneia o texto do NOME (não `specifications` — o dado real vive lá, confirmado por amostra) por tokens alfanuméricos de 4-24 caracteres com pelo menos 1 letra e 1 dígito, filtrados por uma stoplist real de falsos positivos (`4K`, `5G`, `USB-C`, `NFC`, etc.). Validado por 2 rodadas de spot-check manual contra amostras reais (`scripts/kappa3-code-spotcheck.ts`) — 2 bugs reais encontrados e corrigidos nesta Mission: um limite de comprimento (16 chars) truncava códigos reais de 19 caracteres (Razer `RZ01-04870100-R3U1`).

**Cobertura medida**: 9.648 de 18.010 canonical products (53,57%) têm pelo menos 1 candidato de código extraído — sempre `confidence: "medium"`, nunca `"high"` (é uma heurística de forma de token, não uma validação contra um registro oficial de MPN).

## 5. Fontes

`scripts/kappa3-attribute-audit.ts`, `scripts/kappa3-signature-coverage.ts`, `scripts/kappa3-code-spotcheck.ts`, `src/domains/product-intelligence/extraction/attribute-key-aliases.ts`.
