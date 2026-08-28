# Merchant Feed Platform V1 — MERCHANT_FEED_SPEC

**Objetivo**: permitir que um lojista do Py que **já mantém um feed de produtos**
entre no ParaguAI informando **apenas a URL do feed**. O ParaguAI valida, prevê,
ativa e sincroniza automaticamente — sem exigir redesenho da exportação do lojista.

Corolário comercial: *"Se você já possui um feed XML de produtos, provavelmente
não precisa alterar seu sistema. Informe a URL e o ParaguAI cuida da integração."*

> Este documento descreve o **schema compatível (referência)**. Um feed real no
> mesmo estilo é consumido com **zero mudança estrutural** do lojista.

---

## 1. Formatos suportados

| Source type | V1 |
|---|---|
| `XML_FEED` (referência) | ✅ implementado |
| `JSON_FEED` | detectado no validator, ingestão futura |
| `CSV_FEED` | detectado no validator, ingestão futura |
| `PUBLIC_API` | reuso de conectores existentes (GraphQL/API) |

## 2. Compatibilidade com o feed de referência (RSS)

Um feed XML no estilo **RSS/channel/item** com as tags abaixo é consumido
diretamente. Exemplo canônico: `docs/operations/MERCHANT_FEED_EXAMPLE.xml`.

### Campos reconhecidos (dentro de `<item>`)

| Tag (source) | RawOffer destino | Obrigatório |
|---|---|---|
| `codigo` | `product.externalId` (identidade) | ✅ |
| `title` | `product.name` | — (fallback) |
| `title_es` | `product.name` (preferido quando presente) | — |
| `description` / `description_es` | `product.description` | — |
| `marca` | `product.brand` | — |
| `categoria` | `product.category` | — |
| `preco` | `priceUSD` (+ extrai moeda) | ✅ |
| `price_iva` | (preservado; preço p/ análise) | — |
| `preco_normal_sem_liquidacao` | `oldPriceUSD` | — |
| `estoque` | `stockQuantity` + `inStock` | — |
| `disponibilidade` | `inStock` ("em estoque"/"sem estoque") | — |
| `link` | `productUrl` | — |
| `link_comprar` | `productUrl` (prioridade) | — |
| `link_imagem` | `product.imageUrl` | — |
| `tipo_venda` | (metadado de origem) | — |

Campos não mapeados são preservados como metadado (não inventar semântica).

## 3. Identidade e desduplicação

- **Oferta** é determinística por `STORE_ID + EXTERNAL_ID` (o `codigo`).
- Um mesmo `codigo` re-sincronizado faz **upsert** (atualiza preço/estoque), **não**
  cria nova oferta.
- **Produto canônico global** ≠ identidade da loja. Um `codigo` local é apenas a
  identidade da oferta; o casamento com o produto global usa `brand` + título
  normalizado + atributos estruturados. **FALSE MERGE é pior que duplicado** —
  ambiguidades são preservadas para reconciliação (não fundir às cegas).

## 4. Preço e moeda

Formatos aceitos (normalização determinística): `199.50`, `1,199.50`, `1199.50`,
`199.50 USD`, `USD 199.50`, `1.199,50`. **Preço inválido → item rejeitado**
(`INVALID_PRICE`), **NUNCA** convertido para zero. A moeda é preservada do feed;
não assumimos `USD` se houver moeda explícita.

## 5. Estoque

- `estoque` (quantidade) e `disponibilidade` (flag) mapeiam para a semântica
  do marketplace: `AVAILABLE` / `OUT_OF_STOCK` / `UNKNOWN`.
- `UNKNOWN ≠ AVAILABLE`. **Falha de fetch ≠ OUT_OF_STOCK** (feed fora do ar não
  marca a loja inteira como esgotada).
- Oferta esgotada permanece visível como "Sem estoque" (não arquivada).

## 6. Validação / Dry-run / Ativação

1. **Validar**: `/validator` faz fetch seguro + detecção de formato + parse +
   estatísticas (total/valid/invalid, duplicados de `codigo`, erros de preço,
   cobertura de imagem/marca/externalId) — **sem ingestão**.
2. **Preview (dry-run)**: simula o casamento canônico → cada item classificado
   `MATCHED_EXISTING_PRODUCT` / `NEW_PRODUCT_CANDIDATE` / `AMBIGUOUS` / `INVALID`.
3. **Ativar**: persiste o feed em `connectors` + registra o conector → o
   **Adaptive Sync Engine** assume (isDue → fetch → validate → upsert → history).

## 7. Frequência e sync

- Feed oficial pode ser **HOT (30min)** ou **WARM (2h)** conforme o tamanho.
- **Frequência do dispatcher ≠ frequência do feed**: o `*/15` do cron só desperta;
  o `next_sync_at` do feed decide se ele roda. Não refetemos um feed gigante a cada
  wake.
- **Conditional fetch**: `ETag`/`If-None-Match`/`Last-Modified`; `304` = observação
  válida "sem mudança" (frescor mantido sem refetch).
- Feeds grandes (1k–50k) usam o **checkpoint/continuation** existente (sweep em
  batches bounded entre wakes); não dependem de request único de 60s.

## 8. Freshness e histórico

- `offer.updated_at` = tempo real de observação (nunca render).
- Mudança de preço alimenta `price_history` como nos demais conectores; sem
  histórico fabricado em observação idêntica.

## 9. Segurança (feed é insumo externo)

- **SSRF**: só `HTTP(S)` público; bloqueia `localhost`/redes privadas/metadata.
- Response com **tamanho limitado** (20 MiB) e **timeout**.
- **Redirects** limitados e revalidados (SSRF em cada hop).
- **XML seguro**: `saxes` (streaming, sem resolução de entidade externa, sem
  execução de HTML); item malformado é **isolado**, não derruba o feed.

## 10. Erros e saúde

- Feed fora do ar → registra falha + backoff (Adaptive Sync), **mantém** o último
  estado conhecido das ofertas. Sem mass-delete de itens ausentes de um único fetch.
- Itens que somem de um fetch NÃO são deletados sem política segura de obsolescência.

## 11. Prioridade da fonte

1. `OFFICIAL_MERCHANT_API`
2. `OFFICIAL_MERCHANT_FEED`
3. `PUBLIC_STORE_API`
4. `PUBLIC_CONNECTOR/CRAWLER`

Se um feed oficial surgir para uma loja atualmente rastreada via crawler, é
possível migrar sem duplicar ofertas/produtos.

## 12. Proibição de catálogo

Feed **não** burla o Catalog Integrity Firewall: itens proibidos continuam
rejeitados pelo Gatekeeper.

## 13. Onboarding (fluxo futuro self-service)

```
LOJISTA
→ CADASTRAR LOJA
→ INFORMAR URL DO FEED
→ VALIDAR
→ PREVIEW
→ ACEITAR TERMOS
→ ATIVAR
→ SYNC AUTOMÁTICO
```

Nesta Sprint, o operador registra via serviço; a UI self-service é trabalho futuro.
Responsabilidade dos dados (preço, estoque, marca, imagens, legalidade, garantia)
será formalizada nos termos (revisão legal separada antes do lançamento).
