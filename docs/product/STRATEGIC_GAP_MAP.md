# STRATEGIC_GAP_MAP.md
# PROGRAM Ω — Mission Ω-1 — Mapa de Maturidade Estratégica

**Categoria**: `docs/product/`
**Data**: 2026-07-08
**Companion**: `VISION_ALIGNMENT_AUDIT.md` (leitura de cada domínio), `VISION_SCORECARD.md` (score agregado)

---

## Como ler "Maturidade Esperada"

Não é "quanto de 2035 já deveríamos ter" — a Visão é um horizonte de década, não um SLA. É **quanto deveríamos ter deste domínio dado o ponto em que a própria plataforma está** (fundação declarada encerrada, Release 1.9 publicada) e a ordem de sequenciamento que a própria Foundation prescreve (`VISION_2035.md` §3 — escada de 6 estágios; `AI_CONSTITUTION.md` §X — cobertura antes de profundidade, densidade antes de expansão). Um domínio de Estágio 4+ com maturidade baixa não é necessariamente um gap — pode ser sequenciamento correto. Um domínio de Estágio 1 com maturidade baixa é sempre um gap real, porque tudo depende dele.

---

## Tabela de Maturidade

| Domínio | Estágio da Visão | Maturidade Atual | Maturidade Esperada | Gap | Prioridade | Dependências | Impacto se não corrigido |
|---|---|---|---|---|---|---|---|
| **Commerce** | 1–2 | 30% | 55% | **-25** | **Crítica** | Connector Platform (pronto), parcerias comerciais (`docs/business/`) | Todo domínio abaixo (3, 4, 5, 6) tem teto de valor definido por este número — permanece baixo |
| **Merchant OS** (código) | 3 | 58% | 40% | +18 (invertido — ver linha seguinte) | — | Analytics/Decision/Growth Engine (todos prontos) | — |
| **Merchant OS** (realizado) | 3 | ~12% | 35% | **-23** | **Crítica** | Lojas reivindicadas reais (funil de aquisição, não mais código) | Investimento de engenharia sem retorno mensurável; risco de continuar aprofundando features sem validação |
| **Community / Trust** | 2 | 25% | 30% | -5 | Média | Mesma dependência do Commerce (substrato de lojas/reviews reais) | Moat de confiança não começa a acumular tempo real |
| **Regional Intelligence** | 5 | 12% | 15% | -3 | Baixa (sequenciamento correto) | Cobertura de Canonical Match (Commerce) | Baixo — teto de valor já é reconhecido e documentado pelo próprio domínio |
| **ParaguAI Brain** | Transversal | 10% | 18% | -8 | Média | Nenhuma técnica — falta decisão de produto sobre primeiro consumidor real | Brain permanece "logger" em vez de "cérebro"; ROADMAP_2_0 Wave 5 já nomeia a correção |
| **Tourism** | 4 | 3% | 5% | -2 | Baixa (não iniciar ainda) | Commerce + Community maduros primeiro | Nenhum no curto prazo — risco só surge se for iniciado prematuramente |
| **Open Platform** | 6 | 0% | 5% | -5 | Baixa (não iniciar ainda) | Todos os estágios anteriores | Nenhum no curto prazo |
| **Infrastructure** | Habilitador | 72% | 75% | -3 | Baixa (manutenção) | — | Mínimo — CI/CD dormant e ambiente único são as únicas pendências reais |

---

## Leitura da tabela

**A única linha vermelha crítica dupla é Commerce + Merchant OS realizado** — e não por acaso são a mesma causa raiz. Merchant OS tem maturidade de *código* alta (58%, legitimamente construído com disciplina) mas maturidade de *resultado* baixíssima (~12%, porque zero lojas reais o usam). A diferença entre essas duas linhas — +18 vs -23 — é o achado mais importante deste mapa: **o gap não é falta de engenharia, é excesso de engenharia não validada em cima de um substrato (Commerce) que ainda não tem volume.**

Tourism e Open Platform em maturidade baixa **não são gaps** — são sequenciamento correto pela própria lógica da Visão. Não devem ser acelerados antes de Commerce/Merchant OS realizado fecharem seus gaps.

Regional Intelligence e Brain estão em posição intermediária honesta: construídos de forma correta e proporcional, mas com teto de valor definido pelo mesmo gargalo (cobertura real).

Infrastructure é o único domínio sem gap estratégico relevante — está fazendo exatamente o que se espera de um habilitador nesta fase.

---

## Prioridade de correção (ordem, não paralelismo)

1. **Commerce — cobertura real** (mais merchants reais, não mais refinamento de engine)
2. **Merchant OS — ativação real** (converter o funil claim→cliente que já existe tecnicamente em volume real; não mais features)
3. Brain — primeiro consumidor de produto real (baixo esforço, decisão de produto pendente, não bloqueado tecnicamente)
4. Regional Intelligence — cresce automaticamente com 1
5. Community — cresce automaticamente com 1 e 2
6. Tourism, Open Platform — aguardam 1–2 amadurecerem, não devem ser antecipados
7. Infrastructure — manutenção contínua (secrets de CI/CD, ambiente de staging), sem urgência estratégica
