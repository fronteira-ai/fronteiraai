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

---

## PROGRAM Z — Repository Consolidation (RC-1)

Não é um Program de produto — é uma pausa de governança entre Program F Wave 1 e o próximo Program de Release 1.9. Auditoria de 2026-07-06 confirmou que todo o trabalho listado acima (e todo o Release 1.8) existia apenas em working tree local, nunca commitado. RC-1 consolidou os ~300 arquivos afetados em 16 commits Conventional Commits por domínio, sem alterar comportamento, design ou arquitetura — ver `docs/operations/CHANGELOG.md` (entrada 2026-07-06) para a lista completa dos commits e ADR-051 (`docs/operations/DECISIONS.md`) para a regra de governança que resultou desta descoberta.

| Wave | Escopo | Status |
|---|---|---|
| RC-1 | Auditoria final, classificação por domínio, consolidação em 16 commits, Quality Gate completo, push/deploy pendente de aprovação do CTO | ✅ Commits locais completos 2026-07-06. Push/Deploy: ver relatório da Wave. |
