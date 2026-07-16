# PUBLIC_BETA_READINESS.md
# Program Ψ (Psi) — Mission Ψ-1 — Marketplace Dominance

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Metodologia**: itens marcados **[RECONFIRMADO 07-16]** foram medidos de novo nesta Mission. Itens marcados **[CITADO, não remedido]** vêm de `docs/engineering/TECH_DEBT.md`/`docs/product/LAUNCH_READINESS_UPDATE.md` (2026-07-08) e não foram reverificados — podem já estar resolvidos; reportados porque a Mission não permite escrever código para checar cada um, e omiti-los seria pior que citá-los com a data.

---

## Crítico (bloqueia Beta Público)

1. **Comparable Product Coverage = 0,03%** [RECONFIRMADO 07-16]. O valor central do produto — "compare preços entre lojas" — existe hoje para 6 de 17.990 produtos. Um Beta Público que exponha isso a compradores reais mostraria "sem comparação" na esmagadora maioria das buscas. Caminho de resolução já existe e está medido (`EXPANSION_MATRIX.md` Prioridade 1) — não é um gap de construção, é um gap de execução (aprovação humana dos 66 candidatos cross-merchant já descobertos).

2. **`exchange_rates` vazio (0 linhas)** [RECONFIRMADO 07-16]. `EXCHANGE_RATE_API_KEY` não provisionada — qualquer exibição de preço convertido (Guarani ↔ USD ↔ BRL, conforme moeda nativa de cada loja) está sem dado real de câmbio em produção. Risco direto de exibir preço incorreto/enganoso a um comprador real — inaceitável para Beta Público.

## Importante (deveria ser resolvido antes, mas não impede tecnicamente um Beta fechado/controlado)

3. **Engajamento comercial real com merchants ainda mínimo** [RECONFIRMADO 07-16: 2 contas `merchants` reais, 7 `stores` no total]. Não é zero (era zero em 07-08), mas está muito abaixo de "lojistas reivindicando e gerenciando catálogo real" — Program Ω (roadmap) já é o dono designado deste resultado, fora do escopo desta Mission.

4. **Ausência de rate limiting em APIs de mutação pública** [CITADO, não remedido — `TECH_DEBT.md`, ADR-042 pt.3 e ADR-046]. `buyer_events`, `buyer_sessions`, `/api/merchant/claims`, `/delegates`, `/upgrade-interest` sem limite de taxa — exposição real de abuso assim que o tráfego deixar de ser interno.

5. **Sincronização automática de conectores — status incerto** [CITADO, não remedido]. `docs/operations/ADR-052` decidiu desacoplar o cron de alta frequência para GitHub Actions, mas o próprio workflow (`high-frequency-crons.yml`) se descreve como "DORMANT until configured" (secrets `CRON_SECRET`/`CRON_APP_URL` no GitHub, não confirmados nesta Mission). O cron diário nativo do Vercel (`marketplace-operations/snapshot`) foi confirmado funcionando em Φ-1. Sincronização de catálogo em si claramente está acontecendo (catálogo cresceu de ~1.262 para 18.010 produtos desde 07-08) — via execução manual/script, não necessariamente automática.

6. **Preço ausente nos resultados de busca, links mortos (`/categorias/[slug]`, `/stores`)** [CITADO, não remedido, `TECH_DEBT.md`]. Se ainda verdadeiro, afeta diretamente a experiência de um comprador real no Beta Público — mas é um bug de UI, não uma limitação estrutural.

## Desejável (não bloqueia, melhora a experiência)

7. Domínio de Reviews ainda não existe ("Avaliações em breve") [CITADO].
8. `/compare` compara 1 produto entre lojas, não N produtos lado a lado (spec original) [CITADO].
9. Imagens reais de produto ausentes (bucket pronto, campos `null`) [CITADO].
10. Busca sem autocomplete/filtro/paginação real (cap de 8 resultados por seção) [CITADO].
11. Opções de ordenação "Mais vendidos"/"Melhor avaliação" são apenas UI, sem dado real por trás [CITADO].
12. Sem teste/scan de acessibilidade configurado [CITADO].

## Leitura executiva

Dos 2 itens Críticos, **nenhum exige nova arquitetura** — CPC precisa de execução (revisão humana de candidatos já descobertos, zero código), câmbio precisa de uma chave de API (decisão operacional/comercial, zero código). Isso é consistente com o padrão já observado em toda auditoria recente do ParaguAI (Φ-1, Κ-4, Κ-5): a engenharia existe, a execução/autorização é o que falta. Dos itens Importante, o único genuinamente incerto sem remedição é o status do cron de alta frequência — os demais são bugs de UI conhecidos, catalogáveis mas não bloqueantes por si só.
