# ROADMAP_1_9.md
# Release 1.9 Organizado em Programas

**Versão**: 1.9
**Criado**: 2026-07-04 (Release 1.9 — Program F — Wave 1, Premium Home Experience)
**Status**: Referência oficial de execução do Release 1.9

---

## Por que este Release existe

Release 1.8 encerrou formalmente a fase de engenharia de fundação (Connector Platform, Canonical Catalog, Product Identity, Market Intelligence, Marketplace Operations, Exchange Intelligence, Brain Foundation, Merchant Platform, Analytics Platform, Knowledge Graph, Trust Platform — todos considerados ativos consolidados). Release 1.9 é o primeiro a usar essa fundação para construir experiência de produto, não infraestrutura — o mandato do CTO nomeou isso explicitamente: "o foco deixa de ser infraestrutura, passa a ser construir a melhor experiência de compra da fronteira Brasil–Paraguai."

---

## PROGRAM F — Premium Home Experience

| Wave | Escopo | Status |
|---|---|---|
| Wave 1 | Home Premium (redesign completo) + nova página `/categorias` — consumindo exclusivamente Market Intelligence, Canonical Catalog, Marketplace Operations, Exchange Intelligence e Connector Platform, zero regra de negócio em componente React | ✅ Entregue 2026-07-04. Ver `docs/engineering/PREMIUM_HOME_EXPERIENCE.md` para o relatório completo. |

**Assets/Moats fortalecidos**: nenhum ativo novo — esta Wave é a primeira prova pública de que os ativos construídos no Release 1.8 (Market Intelligence, Connector Platform, Exchange Intelligence) produzem valor de produto visível sem código específico de tela. A Home passa a ser o primeiro consumidor real desses domínios fora de testes/scripts internos.
