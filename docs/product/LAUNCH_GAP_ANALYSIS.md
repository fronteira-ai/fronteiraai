# LAUNCH_GAP_ANALYSIS.md
# PROGRAM Δ — Mission Δ-1 — Análise de Prontidão para o Launch

**Categoria**: `docs/product/` (companion de Program Ω/Δ)
**Data**: 2026-07-08

---

## Pergunta

> O marketplace atual já é suficiente para proporcionar uma experiência superior à concorrência?

## Resposta objetiva

**Não.** Com base exclusivamente nos dados produzidos até a Mission Ω-4.1 e nesta missão:

## O que já está pronto (não é gap)

- Catálogo estruturalmente limpo: 99,7% com imagem, 100% com marca, 100% com categoria (`KPI_BASELINE.md`).
- Canonical Coverage: 100% (`BEFORE_AFTER_BASELINE.md`) — todo produto e oferta tem identidade canônica resolvida.
- Connector Platform industrializado: 4 connectors certificados, pipeline reutilizável comprovado 3 vezes (Mega Eletrônicos, Roma Shopping, Atacado Connect todos via o mesmo SDK).
- Zero falha de dado — nenhuma corrupção, nenhuma duplicação, nenhuma regressão em nenhuma das duas execuções recentes.

## O que falta (gaps reais, não genéricos)

1. **Densidade de oferta**: 1,0046 ofertas/produto — a experiência de "comparar preços entre lojas", a proposta de valor central do ParaguAI (`BUSINESS_MODEL.md` §2), **não existe hoje para a esmagadora maioria do catálogo**. Isso não é um gap de infraestrutura — é o gap central.
2. **Sincronização estagnada**: nenhum dos 4 connectors ativos sincronizou desde 2026-07-04 (`CONNECTOR_EXECUTION_BACKLOG.md` Item 2) — `CRON_SECRET`/`CRON_APP_URL` não configurados. Todo dado está envelhecendo sem nenhum código novo ser necessário para corrigir.
3. **Shopping China subutilizado**: 35 ofertas ativas contra um catálogo estimado de 1.000–1.500 — o connector mais antigo do projeto entrega a menor fração do seu potencial.
4. **6 de 10 merchants Tier 1 fora do marketplace**: 4 bloqueados comercialmente (sem conversa iniciada — todos `Not Contacted` em `TIER1_PARTNERS.md`), 2 aguardando spike técnico.
5. **Zero lojistas reais usando a plataforma**: `merchant_stores` = 0 (achado de Ω-4.0, não revertido por esta missão — pertence a Program Ω, não a esta) — todo o Merchant OS opera sem validação real.
6. **Fragmentação de marca/categoria não auditada**: 140 marcas e 175 categorias para 650 produtos — risco real, não quantificado.
7. **Bug de moeda pré-existente**: Shopping China grava preço em Guarani como `price_usd` em um caso de fallback (`TECH_DEBT.md`) — contamina qualquer comparação de preço envolvendo essa loja até corrigido.

## Por que "não" é a resposta certa, não uma formalidade

A IA do ParaguAI (`AI_CONSTITUTION.md` §IX) promete responder perguntas como "qual loja tem o menor preço" — uma pergunta que, hoje, tem resposta trivial e sem valor ("a única loja que vende") para 99% do catálogo. Nenhuma quantidade de sofisticação em Market Intelligence ou um futuro Recommendation Engine muda essa resposta enquanto a densidade de oferta por produto canônico permanecer perto de 1.

## O que fecha esse gap, em ordem de custo/impacto

Ver `CONNECTOR_EXECUTION_BACKLOG.md` para o detalhe — em resumo: (1) ativar sync automático (config, não código, maior impacto por menor custo), (2) recertificar Shopping China (baixo esforço, reaproveitamento total de infraestrutura), (3) avançar o pipeline comercial dos 4 merchants bloqueados (`TIER1_PARTNERS.md`, já pronto para começar, nenhum contato feito ainda), (4) resolver os 2 spikes técnicos pendentes.

Nenhum desses 4 itens exige nova arquitetura, novo domínio ou novo algoritmo — exatamente a restrição desta missão.
