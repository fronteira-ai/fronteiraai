# HOME_EXPERIENCE_REDESIGN.md
# PROGRAM UX — Mission UX-1 — Home Positioning

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: proposta de reorganização — nenhum componente novo, nenhum backend, nenhuma alteração de arquitetura. Todo bloco citado abaixo já existe em `components/home/**`; a proposta é de ordem, copy e (em um único ponto, marcado explicitamente) wiring de props que já existem.

---

## 1. Estrutura atual (auditada em `app/page.tsx`)

```
Hero → SearchBar/HeroCTAs → DashboardStrip (7 cards) → Offers → EconomiaDoDia
     → AIShowcase → Benefits → HowItWorks → Brands → ForLojistasSection → CTASection
```

## 2. Nova estrutura proposta

```
Hero (copy revisado) → SearchBar/HeroCTAs (CTA revisado)
     → AIShowcase (REPOSICIONADO — sobe, copy honesto)
     → DashboardStrip (mantido, labels revisados)
     → Offers (WIRING — badges de inteligência já existentes)
     → EconomiaDoDia (mantido)
     → Benefits (copy revisado)
     → HowItWorks (copy revisado)
     → Brands → ForLojistasSection → CTASection (mantidos, fora da janela de 10s)
```

**O que muda de posição**: `AIShowcase` sobe para logo após o Hero — hoje ele aparece depois de dois blocos densos de dados (`DashboardStrip`, `Offers`), tarde demais para fazer parte da primeira impressão.
**O que desaparece**: nenhum bloco é removido — a mudança é de ordem, copy e (em um caso) wiring, nunca de exclusão de seção.
**O que ganha destaque**: `AIShowcase`, reposicionado e reescrito para provar — com um exemplo real, não uma promessa de chat — o que a inteligência já entrega.
**O que muda por dentro sem mudar de posição**: `Offers` passa a repassar os badges (`belowAveragePrice`/`isBestDeal`/`isVerifiedStore`) que `ProductCard` já aceita e que `SearchResults.tsx` já usa — é reaproveitar uma prop existente em um novo call site, não criar nada novo (marcado como P1/UX no plano de implementação, não P0 de texto).

## 3. Nova proposta de valor (Objetivo 3 — cinco versões avaliadas)

| # | Versão | Avaliação |
|---|---|---|
| 1 | "O comparador de preços mais completo do Paraguai" | Rejeitada — é exatamente o posicionamento a eliminar |
| 2 | "A IA que decide onde comprar por você" | Forte, mas soa a promessa de automação total que ainda não existe (o comprador ainda clica e decide) |
| 3 | "Nunca mais compre no escuro na fronteira" | Emocionalmente forte, mas não comunica o mecanismo (inteligência) |
| 4 | "Seu consultor de compras na fronteira" | Boa, mas genérica — não ancora por que é inteligente |
| 5 | **"O jeito mais inteligente de comprar no Paraguai"** | **Escolhida** |

**Justificativa**: a versão 5 já é o H1 atual do Hero (`components/home/Hero.tsx:49-55`) — está testada, já usa "inteligente" (não "comparador"), e já tem o gradiente visual associado a "comprar" como palavra-chave. Não é necessário trocar o H1 — é necessário parar de contradizê-lo no subtítulo, nos bullets e no CTA logo abaixo dele, que hoje ainda abrem com "Compare preços".

## 4. Hero Section reprojetada (Objetivo 2)

| Elemento | Estado atual | Novo texto proposto |
|---|---|---|
| Badge superior | "Inteligência artificial para compras no Paraguai" | Mantido — já correto |
| H1 | "O jeito mais inteligente de comprar no Paraguai." | **Mantido — já correto** |
| Subtítulo | "Compare preços entre centenas de lojas, converse com a nossa IA e descubra exatamente onde vale a pena comprar — antes de atravessar a fronteira." | "Cruzamos preço, confiança da loja e o momento certo de compra — e te dizemos exatamente onde e quando vale a pena comprar na fronteira." |
| Bullet 1 | "Compare preços / em tempo real" | "Preço certo / sempre atualizado" |
| Bullet 2 | "Centenas de lojas / confiáveis" | "Lojas verificadas / com histórico real" |
| Bullet 3 | "IA que encontra / o melhor para você" | "Recomendação clara / com o porquê" |
| CTA primário | "Comparar preços" → `/products` | "Buscar minha recomendação" → `/search` (mesma rota já existente da busca inteligente) |
| CTA secundário | "Sou Lojista" | Mantido — já correto, público diferente |

**Promessa que deve aparecer imediatamente**: preço + confiança + timing, resumidos em uma frase — não apenas preço.

## 5. Copywriting Review (Objetivo 6)

### AIShowcase (reposicionado, copy honesta)

| Estado atual | Novo texto |
|---|---|
| Badge: "Assistente de compras" | "Como a IA decide por você" |
| H2: "Pergunte. A IA do ParaguAI encontra a melhor compra para você." | "Toda busca já vem com a decisão pronta." |
| Parágrafo: "Descreva o que você precisa em poucas palavras e deixe a nossa IA comparar preços, lojas e especificações por você." | "Busque um produto e veja, na hora: qual loja é a mais confiável, se o preço está bom e se vale a pena comprar agora." |
| Chips de exemplo (perguntas) | Substituir por exemplos de *resultado*, não de pergunta: "🟢 Comprar agora — RAM DDR4 12% abaixo da média", "🛡️ Loja verificada há 8 meses", "🕒 Melhor aguardar — câmbio em queda" |
| CTA: "Perguntar para a IA" → `/search` | "Ver uma recomendação agora" → `/search` (mesmo destino — a mudança é não prometer uma conversa que a página de destino não entrega) |

### Benefits (revisão pontual)

| Atual | Novo |
|---|---|
| "IA avançada / Encontra o melhor preço" | "IA avançada / Recomenda com evidência" |
| "Histórico de preços / Compare e economize" | "Histórico de preços / Saiba se o preço é bom" |
| Demais 3 itens | Mantidos — já não usam "comparar" |

### HowItWorks (revisão pontual)

| Atual | Novo |
|---|---|
| Passo 02 "Compare" — "Veja o produto em centenas de lojas, com preço, estoque e garantia." | Passo 02 "Avalie" — "Veja o preço, a confiança da loja e se vale a pena comprar agora — já comparado para você." |
| Passo 01/03 | Mantidos (já usam "Pesquise"/"Economize", coerentes) |

## 6. Auditoria de consistência (Objetivo 7)

Confirmado (ver `RELEASE_2_PRODUCT_EXPERIENCE_AUDIT.md`, achados 2-6): Home, Busca, Produto e Comparação **não falam a mesma língua hoje**. A Home promete "comparar"; o Produto/Comparação já entregam "recomendação" (Advisor). Corrigir apenas a Home sem tocar o restante deixaria a experiência pior, não melhor — o comprador chegaria a uma Home alinhada e cairia de volta em cards que ainda dizem "Score: 87/100". Este documento assume que a correção de copy da Home é o primeiro passo de uma correção de linguagem que precisa, na Fase 3, alcançar também Produto e Comparação (já mapeado no plano de implementação abaixo como item fora do escopo de código desta missão, mas dependente dela).

## 7. Antes vs Depois (resumo executivo)

| Dimensão | Antes | Depois |
|---|---|---|
| Primeira palavra de valor | "Compare" | "Recomendamos"/"inteligente" |
| CTA primário | "Comparar preços" | "Buscar minha recomendação" |
| Prova de IA nos primeiros 10s | Nenhuma (AIShowcase aparece tarde, e promete chat inexistente) | Exemplo real de recomendação, logo após o Hero |
| Metáfora do produto | Comparador | Consultor |
| Consistência com Produto/Comparação | Nenhuma | Mesma linguagem de recomendação e evidência |
