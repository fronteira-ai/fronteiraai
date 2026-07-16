# LEARNING_PIPELINE.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura.

---

## 1. Fluxo pedido, mapeado contra o que já existe (Objetivo 3)

```
Nova Oferta
  ↓
Extração              ✅ já existe — ProductSignatureExtractor (Κ-3), recomputada toda vez (o gap)
  ↓
Validação              ⚠️ parcial — AttributeValue.confidence já existe por campo, mas nunca é usado
                          para decidir "vale a pena persistir" — é calculado e descartado junto com o resto
  ↓
Knowledge Graph         ⚠️ proposto, não implementado — Mission Π-1, camada lógica de composição
  ↓
Marketplace Memory      ❌ não existe — MARKETPLACE_MEMORY.md, o elo que faltava
  ↓
Identity                ✅ já existe — ProductIdentityEngine, intocado
  ↓
Merge                   ✅ já existe — MergeExecutorService, intocado, Shadow Mode preservado
  ↓
Opportunity              ✅ já existe — OpportunityEngine, intocado
  ↓
Advisor                  ✅ já existe — ParaguAIAdvisorComposer, intocado
  ↓
Persistência do aprendizado  ❌ não existe — a única peça genuinamente nova desta proposta
```

**Leitura honesta**: 6 dos 9 elos já existem e não precisam de nenhuma mudança de algoritmo. 2 são gaps conceituais já nomeados por Missions anteriores (Knowledge Graph, Π-1). **1 é o elo verdadeiramente novo**: persistência do aprendizado — sem ele, os outros 8 elos continuam existindo mas o sistema nunca para de "redescobrir."

## 2. Como cada sincronização aumentaria a inteligência da plataforma, sem algoritmo novo

O mecanismo não é "o sistema aprende algo conceitualmente novo a cada sync" — é "o sistema para de jogar fora o que já sabia." Concretamente:

1. Sincronização 1 de um produto: `buildProductSignature` roda, extrai `manufacturerCode="A3257"`. Hoje: resultado descartado após uso pontual. Proposto: resultado persistido junto ao canonical product.
2. Sincronização 2 (mesmo produto, sem mudança de fonte): hoje, `buildProductSignature` roda de novo, produz o mesmo resultado — trabalho 100% redundante. Proposto: `diffFromProduct` (já existe, Κ-4) já detecta que nada mudou — a mesma checagem que já existe para decidir se sincroniza o `canonical_product` decidiria se recalcula a assinatura. Zero código novo necessário no detector de drift — só uma decisão de quando pular a extração.
3. Produto novo, mesma marca, mesmo `manufacturerCode` de um produto já visto: hoje, tratado como completamente desconhecido. Proposto: a Memória por (`brand_id`, `manufacturerCode`) já teria esse grupo — o novo produto entra direto no grupo existente, sem esperar o Engine reavaliar do zero um par que a estrutura já sabe ser o mesmo identificador.

Nenhuma dessas 3 mudanças altera o que o `ProductIdentityEngine` decide — muda só quantas vezes ele precisa ser chamado para chegar à mesma decisão.

## 3. Onde o Shadow Mode permanece intocado

A "Persistência do aprendizado" proposta nunca persiste uma decisão de merge — só persiste fatos de extração (que já eram determinísticos, já eram calculados, só não guardados). A aprovação humana de um merge continua exatamente como está (`MergeExecutorService.approve()`, Program Ω) — esta proposta não move essa fronteira, mesmo que o brief da Mission fale em "aprender continuamente sem intervenção humana": a continuidade proposta é sobre **não recalcular o que já se sabe**, nunca sobre **decidir sozinho o que hoje exige aprovação**.
