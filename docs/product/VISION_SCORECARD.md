# VISION_SCORECARD.md
# PROGRAM Ω — Mission Ω-1 — Vision Alignment Score

**Categoria**: `docs/product/`
**Data**: 2026-07-08
**Companion**: `VISION_ALIGNMENT_AUDIT.md`, `STRATEGIC_GAP_MAP.md`

---

## O número

# Vision Alignment Score: 25 / 100

Este número mede **realização real da Visão** — participantes reais, decisões reais melhoradas, exatamente o critério que `NORTH_STAR.md` §2 define como a única métrica que importa. Não mede qualidade de engenharia, disciplina de processo ou completude de arquitetura — essas três coisas, medidas separadamente, estão em um patamar muito mais alto (ver "Foundation Readiness" abaixo). O Vision Alignment Score é deliberadamente severo porque a própria Foundation exige que seja: `NORTH_STAR.md` §2 é explícito que número de lojas, testes passando ou rotas construídas não são o objetivo — são insumo.

---

## Metodologia

Cada um dos 8 domínios (`STRATEGIC_GAP_MAP.md`) recebe um peso, refletindo a ordem de prioridade que a própria Foundation já declara (`AI_CONSTITUTION.md` §X: cobertura > profundidade; `VISION_2035.md` §3: escada sequencial de estágios). Domínios de Estágio 1–3 (o que deveria estar mais maduro agora) pesam mais que Estágios 4–6 (deliberadamente futuros).

| Domínio | Maturidade Real | Peso | Contribuição |
|---|---|---|---|
| Commerce | 30% | 25% | 7.50 |
| Merchant OS (realizado, não código) | 12% | 15% | 1.80 |
| Community / Trust | 25% | 10% | 2.50 |
| Infrastructure | 72% | 15% | 10.80 |
| Regional Intelligence | 12% | 10% | 1.20 |
| ParaguAI Brain | 10% | 10% | 1.00 |
| Tourism | 3% | 8% | 0.24 |
| Open Platform | 0% | 7% | 0.00 |
| **Total** | | **100%** | **25.04 ≈ 25** |

---

## Contraste: Foundation Readiness (engenharia) vs. Vision Realization (resultado)

Para não confundir "o time entregou mal" com "o mercado ainda não usou" — dois números diferentes, calculados com os mesmos pesos, trocando maturidade real por maturidade de engenharia/mecanismo:

| | Score | O que mede |
|---|---|---|
| **Foundation Readiness** | **~55/100** | Quanto do mecanismo técnico necessário para cada pilar já existe, testado e em produção |
| **Vision Realization** (= Vision Alignment Score) | **25/100** | Quanto desse mecanismo já está sendo usado por participantes reais, gerando o resultado que a Visão descreve |

**A distância entre os dois números (30 pontos) é o achado central desta auditoria.** Não é um problema de capacidade de engenharia — é `PRODUCTION_BASELINE_1.9.md` provando Quality Gate 100% verde. É um problema de **substrato real**: catálogo com pouca cobertura e zero lojas reivindicadas. Um Vision Alignment Score baixo com um Foundation Readiness alto é o padrão exato que `NORTH_STAR.md` §7 descreve como risco — "funcionalidades sem usuário identificado" acumulando-se silenciosamente, mesmo quando cada uma individualmente passou por um processo de decisão disciplinado.

---

## Por que 25 e não mais baixo

Infrastructure (72%) e o mecanismo de Commerce (Canonical Catalog, Connector Platform, ambos genuinamente operacionais) sustentam o placar sozinhos — sem eles o número estaria próximo de zero. O placar de 25 reflete uma plataforma que **tem tudo pronto para começar a operar como a Visão descreve, mas ainda não começou em volume real**. Isso é qualitativamente diferente de uma plataforma mal construída (que teria Foundation Readiness baixo também) ou de uma plataforma sem visão coerente (que não teria como calcular esta tabela de forma alguma, porque não haveria critério).

## Por que 25 e não mais alto

Nenhum atalho foi tomado nesta pontuação. Zero lojas reivindicadas, zero traço de código de Turismo, zero API pública, Brain sem consumidor de produto real e busca sem preço no resultado são fatos verificados nesta e nas auditorias anteriores (RC-9, RC-10), não estimativas pessimistas.

---

## Trajetória esperada, sem calendário

Este scorecard não projeta uma data para o próximo score — a Visão é explícita que não é um roadmap (`VISION_2035.md` §1). O que se pode afirmar com confiança: **o Vision Alignment Score sobe primeiro e mais rápido através de cobertura real de Commerce e ativação real de Merchant OS do que através de qualquer nova capacidade técnica** — Recommendation Engine, Brain avançado ou Tourism construídos agora, sobre o substrato atual, moveriam este número muito pouco, porque os pesos que os sustentam (Regional Intelligence, Brain, Tourism) já estão presentes na tabela e são pequenos por design. Ver `RELEASE_ALIGNMENT.md` para a implicação de sequenciamento.
