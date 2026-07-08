# KPI_BASELINE.md
# PROGRAM Ω — Mission Ω-4.0 — Baseline Measurement

**Categoria**: `docs/product/` (companion de Program Ω)
**Data da medição**: 2026-07-08, via query read-only direta contra produção (service-role key, mesmo padrão de acesso que todo service deste projeto já usa) — não uma estimativa
**Reprodutível em**: `database/health_checks/marketplace_density.sql`
**Escopo**: nenhuma escrita, nenhuma migration, nenhuma mudança de comportamento, nenhuma promoção de Product Identity além de Shadow Mode, nenhum Attribute Extraction

---

## Como ler este documento

Cada KPI tem 6 campos, exatamente como mandatado: **valor atual**, **método de cálculo**, **origem do dado**, **nível de confiança**, **meta para o Launch**, **meta para a VISION 2035**. "Nível de confiança" distingue número medido diretamente (Alto) de proxy/estimativa (Médio) de dado ainda não calculável sem uma engine específica rodando (Baixo/Requer engine).

---

## Products

### Products Coverage

- **Valor atual**: 650 produtos
- **Método de cálculo**: `COUNT(*) FROM products`
- **Origem do dado**: tabela `products`, medição direta
- **Nível de confiança**: Alto (contagem exata)
- **Meta para o Launch**: 5.000+ produtos reais, cobrindo pelo menos 15–20 lojas certificadas (hoje 4)
- **Meta para a VISION 2035**: dezenas de milhares de produtos — cobertura proporcional ao "maior polo de comércio informal da América do Sul" (`BUSINESS_MODEL.md` §1)

### Products Without Image

- **Valor atual**: 2 produtos (0,31%)
- **Método de cálculo**: `COUNT(*) FROM products WHERE image_url IS NULL`
- **Origem do dado**: tabela `products`, medição direta
- **Nível de confiança**: Alto
- **Meta para o Launch**: 0 produtos ativos sem imagem
- **Meta para a VISION 2035**: 0, permanentemente — mais galeria multi-imagem por produto, não apenas 1 campo

### Products Without Brand

- **Valor atual**: 0 produtos (0%)
- **Método de cálculo**: `COUNT(*) FROM products WHERE brand_id IS NULL`
- **Origem do dado**: tabela `products`
- **Nível de confiança**: Alto
- **Meta para o Launch**: manter 0% — já atingido
- **Meta para a VISION 2035**: manter 0%, com garantia de qualidade contra fragmentação (ver Brand Match Rate abaixo — 100% preenchido não é o mesmo que 100% correto)

### Products Without Category

- **Valor atual**: 0 produtos (0%)
- **Método de cálculo**: `COUNT(*) FROM products WHERE category_id IS NULL`
- **Origem do dado**: tabela `products`
- **Nível de confiança**: Alto
- **Meta para o Launch**: manter 0% — já atingido
- **Meta para a VISION 2035**: manter 0%, com taxonomia estável (ver Categories Coverage abaixo)

### Orphan Products

- **Valor atual**: 1 produto (0,15%) — 650 produtos totais menos 649 com pelo menos 1 oferta vinculada
- **Método de cálculo**: `COUNT(*) FROM products` menos `COUNT(DISTINCT product_id) FROM offers`
- **Origem do dado**: `products` + `offers`, medição direta (join implícito)
- **Nível de confiança**: Alto
- **Meta para o Launch**: 0 produtos órfãos ativos — processo de arquivamento/revisão para o único caso hoje
- **Meta para a VISION 2035**: 0 permanente, com detecção automática (Automation Opportunities, `MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md` §5)

---

## Offers

### Offer Density

- **Valor atual**: 1,0046 ofertas por produto (653 ofertas / 650 produtos)
- **Método de cálculo**: `COUNT(*) FROM offers` / `COUNT(*) FROM products`
- **Origem do dado**: `offers` + `products`
- **Nível de confiança**: Alto (a razão é exata; o que ela revela — concorrência de preço quase inexistente hoje — é a leitura correta do número, não uma inferência)
- **Meta para o Launch**: ≥1,5 ofertas/produto em média, com pelo menos 20% dos produtos com 2+ ofertas reais (comparação genuína, não apenas listagem)
- **Meta para a VISION 2035**: 3+ ofertas por produto nas categorias mais populares — reflexo de concorrência de preço real entre lojas da fronteira

### Offers per Product (distribuição)

- **Valor atual**: não medido nesta baseline — a razão agregada (acima) não revela a distribuição (quantos produtos têm 2+ vs. exatamente 1)
- **Método de cálculo**: `GROUP BY product_id, COUNT(*) FROM offers` (não executado nesta Wave — decisão de escopo, ver nota abaixo)
- **Origem do dado**: `offers`
- **Nível de confiança**: N/A — não medido
- **Meta para o Launch**: medir a distribuição real na próxima baseline
- **Meta para a VISION 2035**: distribuição concentrada em 2+ ofertas para as categorias de maior densidade de compra (eletrônicos, perfumes)

> Nota: dado o Offer Density agregado já em ~1,0, a distribuição real quase certamente mostra a esmagadora maioria dos produtos com exatamente 1 oferta — mas isso é inferência, não medição, e por isso registrado como não medido, não como número aproximado.

### Inactive Offers

- **Valor atual**: 101 ofertas com `in_stock = false` (15,5% de 653)
- **Método de cálculo**: `COUNT(*) FROM offers WHERE in_stock = false`
- **Origem do dado**: `offers`
- **Nível de confiança**: Alto para a contagem; Médio para a interpretação como "inativa" — `in_stock=false` é sinal real de indisponibilidade, mas "inativa" no sentido de "morta/nunca mais vai voltar" exigiria também idade do último `updated_at`, não medida aqui
- **Meta para o Launch**: processo de revisão trimestral, manter abaixo de 10% do total
- **Meta para a VISION 2035**: abaixo de 5%, com arquivamento automático de ofertas mortas há mais de N dias (N a definir com dado real de reativação)

---

## Price History

### Price Freshness (proxy)

- **Valor atual**: 4 de 4 conectores certificados com pelo menos 1 sync registrado; 19 execuções de sync no total (~4,75 por conector, não "uma vez só" como a hipótese qualitativa anterior assumia — correção real desta medição)
- **Método de cálculo**: `COUNT(*)`/`COUNT(DISTINCT connector_id) FROM connector_sync_runs`
- **Origem do dado**: `connector_sync_runs`
- **Nível de confiança**: Alto para a contagem de execuções; **Baixo para "freshness" como métrica real** — o KPI verdadeiro é a saída do `FreshnessEngine` (Real-Time Commerce, já existe em código), não recalculado nesta baseline
- **Meta para o Launch**: sync diário confirmado e estável para 100% dos conectores certificados — depende da configuração de `CRON_SECRET`/`CRON_APP_URL`, pendência já nomeada em `docs/operations/PRODUCTION_BASELINE_1.9.md` §9
- **Meta para a VISION 2035**: atualização quase em tempo real, latência de detecção de mudança de mercado abaixo de 1 hora

### Price History Depth

- **Valor atual**: 618 registros de `price_history` para 615 ofertas distintas com pelo menos 1 registro (de 653 ofertas totais) — média de ~1,005 registros por oferta-com-histórico
- **Método de cálculo**: `COUNT(*)` e `COUNT(DISTINCT offer_id) FROM price_history`
- **Origem do dado**: `price_history`
- **Nível de confiança**: Alto
- **Meta para o Launch**: profundidade média de 3+ registros por oferta ativa (múltiplos ciclos de sync reais capturados)
- **Meta para a VISION 2035**: histórico de anos por oferta, suficiente para tendência sazonal real (`VISION_2035.md` §10 — "dois anos de dados")

### Price Volatility

- **Valor atual**: não recalculado nesta baseline
- **Método de cálculo**: saída do `VolatilityEngine` já existente (`src/domains/realtime-commerce`) — requer execução da engine, não uma contagem simples
- **Origem do dado**: `market_changes` + `VolatilityEngine`
- **Nível de confiança**: Requer engine — não incluído no escopo desta medição read-only simples
- **Meta para o Launch**: `VolatilityEngine` rodando sobre histórico real de pelo menos 30 dias por oferta
- **Meta para a VISION 2035**: detecção de padrão sazonal com histórico plurianual

---

## Canonical Products

### Canonical Coverage

- **Valor atual**: 36 `canonical_products` para 650 produtos (5,5%) — **achado mais importante desta baseline**: o bootstrap 1:1 descrito na migration (`scripts/canonical-catalog-bootstrap.ts`, "produto existente → canonical product") aparentemente não foi executado contra o catálogo completo, apenas uma fração pequena dele
- **Método de cálculo**: `COUNT(*) FROM canonical_products` / `COUNT(*) FROM products`
- **Origem do dado**: `canonical_products` + `products`
- **Nível de confiança**: Alto para os números; Alto também para a interpretação — a migration original já documenta o bootstrap como "recriável a qualquer momento rodando o script de novo", então isso é uma lacuna de execução, não de arquitetura
- **Meta para o Launch**: ≥80% dos produtos com canonical resolvido — rodar o bootstrap contra 100% do catálogo, não apenas os 36 já existentes
- **Meta para a VISION 2035**: Match Rate >95%, Product Identity fora de Shadow Mode com merge automático auditável para candidatos de altíssima confiança (exige ADR própria — ver `MISSION_OMEGA_4_EXECUTION_BLUEPRINT.md` §"ADRs potencialmente necessárias")

### Canonical Match Rate (ofertas)

- **Valor atual**: 39 de 653 ofertas com `canonical_product_id` preenchido (5,97%)
- **Método de cálculo**: `COUNT(*) FROM offers WHERE canonical_product_id IS NOT NULL` / `COUNT(*) FROM offers`
- **Origem do dado**: `offers`
- **Nível de confiança**: Alto
- **Meta para o Launch**: consistente com Canonical Coverage acima — cresce junto quando o bootstrap for reexecutado
- **Meta para a VISION 2035**: >95%, mesma meta do item acima

### Duplicate Canonicals / Merge Queue

- **Valor atual**: **0 registros em `merge_candidates`, em qualquer status** (`pending`/`approved`/`rejected`/`ignored`) — a tabela existe desde a Release 1.7 Wave 4 e nunca recebeu uma linha
- **Método de cálculo**: `SELECT status, COUNT(*) FROM merge_candidates GROUP BY status`
- **Origem do dado**: `merge_candidates`
- **Nível de confiança**: Alto para o número (zero é zero); **achado estrutural, não estatístico**: não significa "zero duplicatas" — significa que o processo de geração de candidatos (`ProductIdentityEngine`/`CanonicalMergeSuggestionService`) nunca rodou contra o catálogo em produção, ou rodou e não persistiu nada
- **Meta para o Launch**: processo de geração de `merge_candidates` executado pelo menos uma vez contra 100% do catálogo; fila resultante triada
- **Meta para a VISION 2035**: fila processada continuamente a cada novo produto ingerido, tempo médio de resolução abaixo de 7 dias

---

## Brands & Categories

### Brand Match Rate

- **Valor atual**: 100% dos produtos com `brand_id` preenchido — mas **140 marcas distintas para 650 produtos** (razão de ~4,6 produtos/marca), uma proporção que sugere fragmentação real não auditada (grafias diferentes da mesma marca contadas como marcas distintas)
- **Método de cálculo**: `COUNT(*) FROM products WHERE brand_id IS NOT NULL` / total; `COUNT(*) FROM brands` para o denominador de fragmentação
- **Origem do dado**: `products` + `brands`
- **Nível de confiança**: Alto para os números; Baixo para "quantas dessas 140 são duplicatas reais" — não auditado nesta baseline (exigiria revisão nominal, fora do escopo de uma query agregada)
- **Meta para o Launch**: auditoria de variantes de marca concluída (Ω-4.5 do Blueprint), mapa de merge proposto
- **Meta para a VISION 2035**: catálogo de marcas canônico, sem duplicatas, reconhecimento automático de variação de grafia

### Categories Coverage

- **Valor atual**: 100% dos produtos com `category_id` preenchido — **175 categorias distintas para 650 produtos** (razão de ~3,7 produtos/categoria), mesma suspeita de fragmentação/taxonomia excessivamente granular do item acima
- **Método de cálculo**: `COUNT(*) FROM products WHERE category_id IS NOT NULL` / total; `COUNT(*) FROM categories` para o denominador
- **Origem do dado**: `products` + `categories`
- **Nível de confiança**: Alto para os números; Baixo para "a taxonomia faz sentido" — não auditado
- **Meta para o Launch**: taxonomia revisada e consolidada (auditoria de 175 → uma estrutura hierárquica menor, sem perder cobertura)
- **Meta para a VISION 2035**: taxonomia estável, refletindo os departamentos reais do comércio fronteiriço

---

## Stores / Connectors / Merchant Ownership

### Merchant Coverage

- **Valor atual**: 4 conectores reais certificados (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect) de 10 merchants Tier 1 auditados (`docs/marketplace/Tier1_Merchants.md`) = 40%; 6 `stores` totais no banco, todas as 6 com `discovered_at IS NULL` (nenhuma criada via Discovery ainda, todas admin-created), todas `is_verified`/`active`
- **Método de cálculo**: `COUNT(*) FROM connectors`; `COUNT(*) FROM stores WHERE discovered_at IS NOT NULL` vs. `IS NULL`
- **Origem do dado**: `connectors`, `stores`
- **Nível de confiança**: Alto
- **Meta para o Launch**: 10/10 merchants Tier 1 certificados ou com `Integration Strategy` formal resolvida (`docs/business/TIER1_PARTNERS.md` para os 4 bloqueados)
- **Meta para a VISION 2035**: centenas de lojas conectadas, cobrindo a totalidade do comércio relevante de Ciudad del Este

### Claimed Stores (Merchant Activation)

- **Valor atual**: **0** — `merchant_stores` tem zero linhas
- **Método de cálculo**: `COUNT(*) FROM merchant_stores`
- **Origem do dado**: `merchant_stores`
- **Nível de confiança**: Alto — confirma numericamente o achado qualitativo já repetido em 3 auditorias anteriores (RC-10, Mission Ω-1, `PRODUCTION_BASELINE_1.9.md`)
- **Meta para o Launch**: **este KPI pertence exclusivamente a Program Ω** (`ROADMAP_2_0.md` §1) — não uma meta desta missão, apenas medido aqui
- **Meta para a VISION 2035**: idem — ver Program Ω

---

## Compostos (dependem de engine, não recalculados nesta baseline)

| KPI | Por que não foi recalculado agora |
|---|---|
| Marketplace Freshness Score | Composto do `FreshnessEngine` + regularidade de sync — a baseline aqui alimenta o cálculo quando a engine for de fato executada/exposta (Blueprint Ω-4.7) |
| Marketplace Density Score | Composto proposto no Blueprint (§3) — pode ser calculado agora a partir dos números acima (ver `BASELINE_SUMMARY.md`), mas como agregado ponderado, não uma query única |
| Merchant Quality Score | Já existe (`ConnectorHealthService`/`MerchantPriorityService`) — não reexecutado nesta baseline, apenas confirmado que os 4 conectores têm dado suficiente para computá-lo |
| Overall Marketplace Health | Já existe (`MarketplaceHealthEngine`, 8 fatores) — mesma situação |

---

## Metodologia — nível de confiança, definição

- **Alto**: número exato, medido por `COUNT`/`COUNT DISTINCT` direto contra a tabela real em produção, nesta data.
- **Médio**: número exato mas usado como proxy de um conceito mais amplo (ex.: `in_stock=false` como proxy de "oferta inativa").
- **Baixo / Requer engine**: o KPI real depende de lógica de negócio já implementada em código (`FreshnessEngine`, `VolatilityEngine`, `MarketplaceHealthEngine`) que não foi executada nesta medição simples de contagem.
