# STRATEGIC_PRODUCTS_ANALYSIS.md
# FASE 2 — SPRINT 2.3 — Product Comparison Validation — Objetivos 1 e 2

**Categoria**: `docs/product/`
**Data**: 2026-07-11
**Companion**: `PRODUCT_COMPARISON_AUDIT.md` (achados agregados), `MERGECANDIDATE_FLOW_REPORT.md` (a cadeia completa)

---

Para cada produto estratégico: o que existe hoje, loja a loja, e por que (não) está comparável. Dados extraídos por `scripts/product-comparison-audit.ts`, produção, 2026-07-11.

## iPhone 17 Pro Max — 26 produtos, 0 comparáveis

Presente em 4 lojas (atacado-connect, mega-eletronicos, mobile-zone, shopping-china). Brand consistente (`Apple` em quase todos — 2 ofertas caem em `Outros` porque o parser de origem não extraiu marca daquela listagem específica). **5 valores de `category_id` diferentes** usados só para este produto: `Smartphones` (atacado-connect), `Celular` (mega-eletronicos), `Celulares`/`iPhone`/`iPhone SWAP` (mobile-zone, 3 categorias diferentes dentro da mesma loja). Nenhum par cross-merchant compartilha `canonical_product_id`. Nomes variam por template de loja (`"Apple iPhone 17 Pro Max A3525 VC 256GB eSIM Tela 6.9\" - Prata"` vs `"CELULAR APPLE IPHONE 17 PRO MAX 256GB DEEP..."`) — mesmo produto, strings muito diferentes.

## iPhone 17 Pro — 10 produtos, 0 comparáveis

Mesmo padrão em escala menor: 4 lojas, categorias fragmentadas (`Smartphones`, `Celular`, `Celulares`, `GENERAL`).

## Samsung Galaxy Ultra — 15 produtos, 1 comparável

O único caso comparável da amostra "Ultra": **"Galaxy S25 Ultra 256GB"**, shopping-china e mega-eletronicos, `canonical_product_id = 9bff4722…`. É o único produto da amostra inteira com `specifications` populado (`{"cor":"Titânio Preto","tela":"6.8\"","armazenamento":"256GB"}`) — mas isso não foi o que gerou a comparação (ver `PRODUCT_COMPARISON_AUDIT.md` §5: as duas lojas produziram a mesma string de nome, colidindo em `products.slug`). Os outros 13 produtos "Ultra" da amostra usam 3 categorias diferentes (`Smartphones`, `Celulares`, `Celular`) e nomes com templates de loja muito diferentes (`"Smartphone Samsung Galaxy S25 Ultra 5G SM-S938B..."` vs `"Celular Samsung Galaxy S26 Ultra SM-S948B NFC..."`), 0 comparáveis entre si.

## MacBook Air — 43 ofertas, 42 produtos, 1 comparável

**"MacBook Air M3 13\" 256GB"**, nissei e shopping-china — mesma mecânica de coincidência de string do caso Galaxy acima, não resultado do matching fuzzy. Os outros 40 produtos MacBook Air (majoritariamente mobile-zone e mega-eletronicos) têm SKUs/cores/config de RAM muito específicos no nome (`"Apple MacBook Air MDHH4LL/A 13\" M5 16GB de RAM 512GB Sky Blue"`) sem par exato em outra loja.

## MacBook Pro — 39 produtos, 0 comparáveis

Concentrado em mobile-zone e mega-eletronicos, sem sobreposição de configuração exata entre as duas.

## AirPods Pro — 7 produtos, 0 comparáveis (mas 1 duplicata real capturada no match log, não em `merge_candidates`)

Caso mais informativo da amostra: **AirPods Pro 3 MFHP4LL, mesma SKU, mega-eletronicos e mobile-zone**, aparece no `product_identity_match_log` com confiança **38** (`tier=new_product`) — abaixo do threshold `possible=70`, então nunca virou `MergeCandidate`. Ver `MERGECANDIDATE_FLOW_REPORT.md` §4 para a decomposição exata dessa pontuação (a resposta não é só "category bateu errado" — `specifications` vazio e a diferença de template de nome também custam pontos, e nesse par específico o gate de categoria nem chegou a ser o fator decisivo).

## Apple Watch — 41 produtos, 0 comparáveis

Concentrado em mobile-zone (Series 11, SE 3) e mega-eletronicos (SE 3rd gen) — nenhuma sobreposição de modelo+cor+tamanho exata encontrada.

## PlayStation 5 — 43 produtos, 0 comparáveis hoje (1 par suspeito na simulação — ver `COMPARISON_SIMULATION_REPORT.md`)

4 lojas presentes (mega-eletronicos, mobile-zone, roma-shopping, atacado-connect), majoritariamente acessórios/jogos (mega-eletronicos concentra jogos e o DualSense) e consoles em roma-shopping/atacado-connect com bundles/edições diferentes — não são o mesmo SKU.

## Nintendo Switch — 80 produtos, 0 comparáveis

**Concentração em uma única loja**: dos 80 produtos, a esmagadora maioria é mega-eletronicos (consoles OLED/Switch 2 em várias edições + biblioteca de jogos). Não há segunda loja com catálogo Nintendo Switch comparável hoje — isto não é um problema de matching, é ausência de oferta concorrente (mobile-zone e outras lojas simplesmente não vendem esses jogos/consoles ainda). Um near-miss real aparece no match log: duas variantes OLED na mesma loja (`JP` vs `HEG-001`) pontuam 60 — corretamente abaixo do threshold, porque são de fato *SKUs diferentes* (edições diferentes), não uma duplicata a corrigir.

## Leitura consolidada

- **8 de 10 padrões: 0% comparável.** Não por falta de presença multi-loja (a maioria tem 3-4 lojas vendendo o mesmo produto por nome), mas por fragmentação de atributos e ausência de dado estruturado (ver `PRODUCT_COMPARISON_AUDIT.md`).
- Os 2 casos positivos são acidentes de string idêntica, não resultado do pipeline de identidade.
- O único near-miss cross-merchant capturado com evidência completa (AirPods Pro 3) mostra que mesmo removendo o gate de categoria, a pontuação não teria alcançado o threshold sozinha — múltiplos fatores compõem o problema, não um único bug isolado. Ver `PRODUCT_IDENTITY_FINDINGS.md` para a decomposição causal completa.
