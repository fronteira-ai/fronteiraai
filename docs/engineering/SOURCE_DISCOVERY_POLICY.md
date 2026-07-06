# SOURCE_DISCOVERY_POLICY.md
# Política Oficial de Descoberta de Fonte de Dado

**Versão**: 1.0
**Criado**: 2026-07-04 (Release 1.8 — Program B — Wave 2, Connector Platform Finalization)
**Status**: Política permanente — obrigatória para toda implementação futura de Connector
**Categoria**: `docs/engineering/`

---

## 1. Por que esta política existe

A auditoria de merchants Tier 1 (`docs/marketplace/Tier1_Merchants.md`, Program A Wave 3) encontrou 4 lojas que bloqueiam explicitamente crawlers de IA no `robots.txt`. A decisão tomada naquele momento — nunca contornar `robots.txt`, nunca burlar Cloudflare — era uma decisão pontual até esta Wave. Este documento a torna **política permanente**, obrigatória para qualquer Connector futuro, não apenas para os 4 merchants já identificados.

---

## 2. Ordem de prioridade obrigatória

Para qualquer novo Connector, a fonte de dado deve ser escolhida nesta ordem — a primeira opção viável vence, nunca pular para uma opção mais simples só por conveniência:

1. **API oficial** do merchant (quando existir e for tecnicamente acessível)
2. **API de parceiro** (integração formal via `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md`)
3. **Feed oficial** (CSV/JSON/XML fornecido pelo merchant, via parceria ou publicamente)
4. **Sitemap XML** público (via `sdk/sitemap`, o caminho já usado por Shopping China/Mega Eletrônicos/Roma Shopping/Atacado Connect)
5. **Structured Data** (schema.org/JSON-LD embutido em páginas públicas — nenhum Connector deste projeto usa isso ainda, mas é preferível a heurística de texto quando disponível)
6. **HTML público** (scraping de texto/DOM — o último recurso, usado hoje via `node-html-parser` + regex heurísticas)

Cada Tier corresponde a um `Integration Strategy` já existente (`docs/marketplace/Tier1_Merchants.md`): `Public Connector` (Tiers 4-6, os 4 merchants tecnicamente viáveis hoje), `Data Partnership`/`Commercial API`/`Merchant Feed` (Tiers 1-3, os 4 merchants bloqueados). A ordem acima é a razão de ser desse campo, não uma regra nova e independente.

---

## 3. Proibições absolutas

Nenhuma implementação, presente ou futura, pode:

- **Contornar Cloudflare** (bot-fight mode, challenge pages, fingerprinting evasivo) — se um site retorna 403 consistente para tráfego automatizado, a resposta é `Data Partnership`, nunca uma técnica de evasão.
- **Contornar `robots.txt`** — um `Disallow` (nomeado ou geral) é respeitado sempre, mesmo quando tecnicamente possível ignorá-lo.
- **Usar técnicas anti-detecção** (rotação de proxy para mascarar origem, fingerprint spoofing além de um `User-Agent` honesto, CAPTCHA-solving automatizado).
- **Adicionar headless browser sem ADR aprovada** — Playwright/Puppeteer/similar é uma dependência nova e uma superfície de infraestrutura nova (memória, tempo de execução, potencial de detecção como bot mesmo sem intenção evasiva); qualquer Connector que precise de renderização client-side (ex.: Mobile Zone/Visão VIP, confirmados CSR na Wave 4) fica bloqueado até uma ADR formal aprovar a dependência — não é uma decisão de implementação de rotina.

---

## 4. Consequência prática já em vigor

- **Cellshop, Nissei, Casa Americana, New Zone**: `Integration Strategy: Data Partnership` — bloqueados por política nomeada aqui, caminho é `docs/business/MERCHANT_PARTNERSHIP_PROGRAM.md`.
- **Mobile Zone, Visão VIP**: `Integration Strategy: Pending Decision` — confirmados client-side-rendered (Wave 4); qualquer avanço técnico exige primeiro uma ADR aprovando headless browser como dependência do projeto, não apenas "escrever mais um parser".
- **Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect**: `Integration Strategy: Public Connector` — via Tier 4 (Sitemap XML), o nível mais alto da hierarquia que essas 4 lojas de fato oferecem publicamente.

---

## 5. Como aplicar esta política a um novo merchant

1. Auditar (como a Wave 3 já fez) `robots.txt`, presença de API/feed documentado publicamente, sitemap, e sinais de anti-bot — nunca pular direto para "vamos scraping".
2. Classificar na hierarquia do §2 pela opção **mais alta** genuinamente viável.
3. Se a única opção viável for Tier 6 (HTML) e o site tiver proteção anti-bot ativa, a classificação correta é `Data Partnership`, não uma tentativa de Tier 6 forçada.
4. Documentar a decisão em `docs/marketplace/Tier1_Merchants.md` (ou o dossiê equivalente do lote), nunca implicitamente no código.
