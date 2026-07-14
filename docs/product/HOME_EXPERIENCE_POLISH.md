# HOME_EXPERIENCE_POLISH.md
# PROGRAM UX — Mission UX-1 — Home Experience Polish

**Categoria**: `docs/product/`
**Data**: 2026-07-13
**Natureza**: proposta de UX/comunicação — nenhum componente novo, nenhum backend, nenhuma arquitetura ou Design System alterados. Toda evidência citada foi verificada diretamente em `app/page.tsx` e `components/home/**`.

---

## 1. Auditoria pixel por pixel (Objetivo 1)

| Bloco | Chama atenção | Distrai / compete | Propósito claro? | Pertence ao "ParaguAI antigo"? |
|---|---|---|---|---|
| Hero (H1 + badge) | Sim — H1 já correto | — | Sim | Não |
| Hero subtítulo/bullets | — | Compete consigo mesmo (3 promessas na mesma frase) | Parcial | Sim (abre com "Compare") |
| HeroCTAs | CTA primário chama atenção | CTA diz "Comparar preços" — a palavra errada no lugar mais visível da página | Sim, mas com a mensagem errada | **Sim** |
| DashboardStrip — MarketPulseCard | Sim (tempo real) | Apresenta o mesmo tipo de sinal do Purchase Timing como ticker de bolsa, não como recomendação | Claro como dado, obscuro como valor para o comprador | Parcial |
| DashboardStrip — CambioCard | Sim | Câmbio cru, sem dizer por que importa para a decisão de compra | Parcial | Parcial |
| DashboardStrip — FlashOffersCard | Sim | — | Claro (linka para o produto certo) | Não |
| DashboardStrip — LiveMarketplaceCard | Sim | — | Claro (prova de atividade real) | Não |
| DashboardStrip — StoreCarousel | — | — | Claro | Não |
| DashboardStrip — CategoriesCard | — | — | Claro (navegação) | Não |
| **DashboardStrip — LiveCameras** | Visualmente, sim (grade de câmeras) | **Sim — 4 slots, todos "Em breve"** | **Nenhum propósito hoje — recurso não existe** | **Sim — a única seção que ativamente promete o futuro na primeira dobra** |
| BottomCta (trust strip) | — | "Garantia de economia" é superlativo sem evidência | Parcial | Parcial |
| Offers ("Produtos em destaque") | Sim | Nenhum badge de inteligência aparece (belowAveragePrice/isBestDeal/isVerifiedStore existem no código mas não são usados aqui) | Claro, mas incompleto | Não |
| EconomiaDoDia | Sim | **Repete "Economia do dia" do FlashOffersCard, com o mesmo conceito duas vezes** | Claro isoladamente, redundante em conjunto | Não |
| AIShowcase | Sim (visualmente) | **Promete uma conversa que não existe; CTA leva a uma busca comum** | Propósito existe, execução quebra a promessa | **Sim** |
| Benefits | — | "IA avançada" é copy genérica sem citar um sinal real | Parcial | Sim |
| HowItWorks | — | Passo 2 usa "Compare" | Claro, palavra errada | Sim |
| Brands | — | — | Claro (prova social de marca) | Não |
| ForLojistasSection | — | "Comparação automática" (copy B2B, menor prioridade) | Claro (público diferente) | Parcial |
| CTASection | — | Terceiro CTA de fechamento com um quarto verbo diferente ("Pesquisar agora") | Claro, mas inconsistente com os outros dois CTAs | Parcial |
| Footer | — | Não auditado neste nível (fora da janela de 10s) | — | — |
| FAQ | — | **Não existe na Home hoje** — nada a classificar | — | — |

**O que comunica valor hoje**: H1, FlashOffersCard, LiveMarketplaceCard, StoreCarousel, o trecho "IA que recomenda / Realmente vale a pena" do BottomCta.
**O que gera distração**: `LiveCameras` (vaporware na primeira dobra), a dupla "Economia do dia", o CTA "Comparar preços" bem no topo, a promessa de chat da `AIShowcase`.
**O que pode ser removido**: `LiveCameras` da posição de destaque atual (não o componente em si — apenas sua presença na primeira dobra).
**O que pode ser simplificado**: subtítulo do Hero (três promessas em uma frase), os três CTAs finais com três verbos diferentes para a mesma ação.
**O que deveria aparecer imediatamente**: uma prova concreta — preço + confiança + timing — não apenas uma afirmação abstrata de "inteligência".

## 2. Hero Redesign (Objetivo 2)

**H1 preservado exatamente**, por mandato: *"O jeito mais inteligente de comprar no Paraguai."*

**Novo subtítulo oficial adotado como está** — nenhuma redação encontrada foi objetivamente superior: *"Mais do que comparar preços. O ParaguAI analisa, explica e recomenda a melhor compra para você."* Justificativa para não alterar: a frase já faz o trabalho mais difícil sozinha — nomeia e descarta explicitamente "comparar preços" como o *problema antigo* na própria primeira oração, depois entrega os três verbos certos (analisa/explica/recomenda) na segunda. Qualquer tentativa de reescrever isso arriscava perder essa contraposição direta, que é exatamente a arma retórica que esta missão pede.

## 3. Eliminação da linguagem de comparador (Objetivo 3)

Ver `PRODUCT_LANGUAGE_GUIDE.md` §6-8 para a lista de palavras proibidas/obrigatórias e a tabela completa de antes/depois. Focos de maior densidade do problema, por ordem de visibilidade: CTA primário do Hero ("Comparar preços"), bullets do Hero, CTA da `AIShowcase`, passo 2 do `HowItWorks`, CTA do `CTASection`.

## 4. Comunicação da Hero redesenhada (Objetivo 4)

| Elemento | Atual | Novo |
|---|---|---|
| Badge superior | "Inteligência artificial para compras no Paraguai" | Mantido |
| H1 | (mandatado, preservado) | Preservado |
| Subtítulo | (substituído pelo oficial) | Oficial adotado (§2) |
| Bullet 1 | "Compare preços / em tempo real" | "Preço certo / sempre atualizado" |
| Bullet 2 | "Centenas de lojas / confiáveis" | "Loja confiável / com histórico real" |
| Bullet 3 | "IA que encontra / o melhor para você" | "Recomendação clara / com o porquê" |
| Search placeholder | (a verificar no componente `SearchBar`, texto genérico "Pesquisar...") | "O que você quer comprar hoje?" — mantém o verbo de busca (correto para um campo de busca) mas em tom de conversa, não de índice |
| CTA primário | "Comparar preços" → `/products` | "Buscar minha melhor compra" → `/search` (ver Objetivo 6) |
| CTA secundário | "Sou Lojista" | Mantido |

## 5. Os três bullets — 10 propostas geradas, 3 selecionadas (Objetivo 5)

| # | Proposta |
|---|---|
| 1 | Preço certo — sempre atualizado |
| 2 | Loja confiável — com histórico real |
| 3 | Recomendação clara — com o porquê |
| 4 | Economia real — não estimada |
| 5 | Confiança verificada — não achismo |
| 6 | Momento certo — nunca no escuro |
| 7 | Decisão pronta — sem abrir 10 abas |
| 8 | IA que explica — não só sugere |
| 9 | Melhor compra — já comparada por nós |
| 10 | Câmbio considerado — antes de você decidir |

**Selecionadas: #1, #2, #3.** Justificativa: mantêm o formato exato de duas linhas já existente no componente (`title`/`sub`), e cada uma mapeia 1:1 para um dos três pilares reais já construídos (Best Deal/preço, Trust, Advisor/explicabilidade) — nenhuma inventa um conceito novo, e nenhuma usa "comparar". As demais 7 foram descartadas por serem mais chamativas porém redundantes entre si (#4/#9 repetem #1; #5 repete #2; #6/#10 repetem uma faceta de #3 já coberta pelo Purchase Timing sem precisar de um quarto bullet).

## 6. Botão principal — 15 alternativas avaliadas (Objetivo 6)

| # | Alternativa | Clareza | Expectativa criada | CTR estimado | Alinhamento |
|---|---|---|---|---|---|
| 1 | Ver minha recomendação | Alta | Espera recomendação imediata (falso — ainda precisa buscar) | Médio | Médio |
| 2 | Descobrir a melhor compra | Alta | Correta | Médio-alto | Alto |
| 3 | Buscar e decidir | Média | Correta | Médio | Alto |
| 4 | Quero a recomendação certa | Média | Levemente exagerada | Médio | Médio |
| 5 | Encontrar minha melhor oferta | Alta | Correta | Médio-alto | Alto |
| 6 | Ver o que vale a pena comprar | Alta | Correta | Alto | Alto |
| 7 | Deixe a IA decidir por mim | Média | Exagerada (a IA não decide sozinha) | Alto (curiosidade) | Baixo (overpromise) |
| 8 | Buscar com inteligência | Média | Vaga | Médio | Médio |
| 9 | Começar minha busca inteligente | Baixa (longa) | Correta | Baixo | Médio |
| 10 | Ver preço, confiança e timing | Baixa (técnica) | Correta mas fria | Baixo | Alto |
| 11 | Quero economizar com segurança | Média | Boa, mas soa financeiro/banco | Médio | Médio |
| 12 | Explorar recomendações | Média | Vaga | Baixo | Médio |
| **13** | **Buscar minha melhor compra** | **Alta** | **Correta — entrega exatamente uma busca, que já chega com sinais de inteligência** | **Alto** | **Alto** |
| 14 | Ver o que a IA recomenda | Alta | Excesso — implica recomendação sem input do usuário | Alto (curiosidade), risco de decepção | Médio |
| 15 | Ir direto à melhor oferta | Alta | Excesso — implica destino direto, não uma busca | Médio | Baixo |

**Escolhida: #13, "Buscar minha melhor compra".** Justificativa: usa o verbo familiar e de baixo atrito ("buscar", a mesma ação que o usuário já entende de qualquer busca), mas fecha a frase com "minha melhor compra" — a linguagem do Advisor/Best Deal, não do comparador. É a única opção que não promete mais do que a página de destino (`/search`) realmente entrega no primeiro clique: uma busca que já chega com preço, confiança e badges de inteligência — nunca uma recomendação instantânea sem input, que várias alternativas mais "chamativas" (#7, #14, #15) prometeriam e quebrariam.

## 7. Reorganização dos componentes (Objetivo 7)

**Nova ordem**:
```
Hero (copy revisado) → SearchBar/HeroCTAs (CTA revisado)
  → AIShowcase (sobe para logo após o Hero, copy honesta — prova, não promessa)
  → DashboardStrip, SEM LiveCameras na primeira dobra
  → Offers (badges de inteligência ligados) → EconomiaDoDia (redefinida para não repetir o FlashOffersCard)
  → Benefits (copy revisada) → HowItWorks (copy revisada)
  → Brands → ForLojistasSection → CTASection (CTA unificado com o do Hero)
```
- **Primeiro**: Hero. **Segundo**: `AIShowcase` reposicionada (prova de inteligência logo após a promessa).
- **Desaparece da primeira dobra**: `LiveCameras` — nenhuma câmera existe hoje (todos os 4 slots são "Em breve"); ocupar 3 de 12 colunas do segundo bloco do dashboard com um recurso inexistente é exatamente a "promessa futura" que o Definition of Done proíbe.
- **Ganha destaque**: `AIShowcase`, reescrita para mostrar um exemplo real de recomendação (🟢🛡️🕒), não uma lista de perguntas de chat.
- **É compactado**: `EconomiaDoDia` deveria deixar de duplicar o `FlashOffersCard` — ou vira uma citação de segunda oferta diferente, ou é fundida à seção do dashboard.
- **Compete com o Advisor**: `MarketPulseCard`/`CambioCard`, que mostram o mesmo tipo de sinal (tendência de preço/câmbio) em formato de ticker de bolsa, sem a tradução em linguagem de recomendação que o Advisor já faz — não removidos (são dados reais e ao vivo, valiosos como prova), mas não devem crescer além do tamanho atual nem ganhar mais destaque que a `AIShowcase`.

## 8. Information Hierarchy (Objetivo 8)

| Janela | O que o comprador vê | Pergunta respondida |
|---|---|---|
| **3 segundos** | H1 + badge de IA | "O que é isso?" |
| **10 segundos** | Subtítulo oficial + 3 bullets + CTA "Buscar minha melhor compra" + `AIShowcase` reposicionada mostrando um exemplo real de recomendação | "Por que isso é diferente de pesquisar no Google?" |
| **30 segundos** | DashboardStrip (Market Pulse, Câmbio, Economia do dia, Live Marketplace, Lojas em destaque) | "Isso é real e está acontecendo agora?" |
| **2 minutos** | Offers com badges de inteligência, Benefits, HowItWorks, Brands | "Por que confiar e por que voltar amanhã?" |

## 9. Emotion Journey (Objetivo 9)

```
Chegada → Curiosidade → Confiança → Descoberta → Decisão → Compra → Retorno
```

| Etapa | Estado hoje | Atrito / Encantamento / Dúvida / Excesso |
|---|---|---|
| Chegada | H1 forte, mas CTA imediato diz "Comparar preços" | **Atrito**: a primeira ação visível contradiz o H1 |
| Curiosidade | `AIShowcase` tarde demais, promete chat | **Dúvida**: "isso é um chatbot? por que não abre uma conversa?" |
| Confiança | `LiveCameras` mostrando "Em breve" bem na primeira dobra | **Atrito/Dúvida**: sinaliza que partes do produto são vaporware |
| Descoberta | `Offers` sem badges de inteligência, `DashboardStrip` denso | **Excesso**: muito dado, pouca tradução em "o que isso significa para mim" |
| Decisão | (fora da Home — no Advisor, em Produto/Comparação) | **Encantamento real**, mas só depois de já ter clicado fundo |
| Compra | Clique externo direto | Neutro |
| Retorno | Nenhum gatilho visível (favorito/alerta) | **Dúvida**: nada na Home hoje dá um motivo específico para voltar amanhã |

## 10. Keep / Improve / Remove Matrix (Objetivo 10)

| Componente | Classificação | Nota |
|---|---|---|
| Hero (H1) | **KEEP** | Mandatado, já correto |
| Hero (subtítulo) | **IMPROVE** | Adotar o texto oficial (§2) |
| Hero (bullets) | **IMPROVE** | Ver §5 |
| HeroCTAs | **IMPROVE** | Trocar rótulo do CTA primário (§6) |
| DashboardStrip (shell) | **KEEP** | Estrutura de streaming independente por card é sólida |
| MarketPulseCard | **IMPROVE** | Manter dado, mas não deixar crescer além do tamanho atual |
| CambioCard | **IMPROVE** | Adicionar uma linha de contexto ("por que isso importa para sua compra") |
| FlashOffersCard | **KEEP** | Já usa linguagem de economia correta, linka certo |
| LiveMarketplaceCard | **KEEP** | Boa prova de atividade real |
| StoreCarousel | **KEEP** | Simples, sem conflito de linguagem |
| CategoriesCard | **KEEP** | Navegação pura, sem necessidade de reposicionamento |
| **LiveCameras** | **REMOVE (da primeira dobra)** | 4/4 slots "Em breve" — vaporware ocupando espaço de destaque |
| BottomCta (trust strip) | **IMPROVE** | Trocar "Garantia de economia" por uma frase com evidência |
| Offers | **IMPROVE** | Ligar badges de inteligência já existentes (`belowAveragePrice`/`isBestDeal`/`isVerifiedStore`) |
| EconomiaDoDia | **IMPROVE** | Parar de duplicar o `FlashOffersCard` |
| AIShowcase | **IMPROVE + REPOSICIONAR** | Copy honesta, sobe de posição (§7) |
| Benefits | **IMPROVE** | Remover "IA avançada" genérico (§ Language Guide) |
| HowItWorks | **IMPROVE** | Passo 2 (§ Language Guide) |
| Brands | **KEEP** | Prova social simples, sem conflito |
| ForLojistasSection | **KEEP** | Público B2B, fora do escopo dos primeiros 10s |
| CTASection | **IMPROVE** | Unificar CTA com o do Hero |
| Footer | **KEEP** | Fora da janela de 10s |
| FAQ | **N/A** | Não existe hoje — nada a classificar |

## 11. Antes vs Depois (resumo)

| Dimensão | Antes | Depois |
|---|---|---|
| Primeiro CTA visível | "Comparar preços" | "Buscar minha melhor compra" |
| Prova de inteligência nos 10s | Ausente/tardia, com promessa quebrada | `AIShowcase` reposicionada, exemplo real |
| Vaporware na primeira dobra | `LiveCameras` (4× "Em breve") | Removido da primeira dobra |
| Verbo de CTA ao longo da página | 3 verbos diferentes (Comparar/Perguntar/Pesquisar) | 1 verbo consistente ("Buscar minha melhor compra") em todos os CTAs de topo/fundo |
| Bullets do Hero | Comparador | Preço / Confiança / Recomendação |

## 12. Launch Readiness Score (Objetivo 13)

| Dimensão | Nota (0-100) | Justificativa |
|---|---|---|
| Clareza | 65 | H1 é claro; o restante da página ainda compete consigo mesmo |
| Posicionamento | 55 | Ainda contradito pelo CTA primário e pela `AIShowcase` |
| Comunicação | 60 | Boa em partes isoladas, inconsistente no conjunto (3 verbos de CTA) |
| Valor percebido | 60 | O valor real é alto; a Home não o revela antes do clique |
| Confiança | 55 | `LiveCameras` com "Em breve" na primeira dobra reduz confiança |
| Memorização | 60 | H1 é memorável; o resto da página não reforça a mesma ideia |
| Primeira impressão | 55 | CTA e vitrine de IA ainda vendem o produto errado |
| Diferenciação | 60 | Existe, mas só aparece depois do primeiro clique |
| Explicabilidade | 70 | Onde aparece (Advisor), é forte; na Home, ainda não aparece |
| Desejo de retorno | 45 | Nenhum gatilho de retorno na Home hoje |
| **Média geral** | **59** | Consistente com a auditoria anterior (Release Readiness Score 6.5/10) — o problema é comunicação, não produto |

## 13. Plano de Implementação (Objetivo 14)

| Item | Tipo | Esforço | Prioridade |
|---|---|---|---|
| Adotar subtítulo oficial do Hero | Texto | Baixo | **P0** |
| Trocar CTA primário para "Buscar minha melhor compra" (Hero + CTASection unificados) | Texto | Baixo | **P0** |
| Reescrever os 3 bullets do Hero | Texto | Baixo | **P0** |
| Remover `LiveCameras` da primeira dobra | Layout (reordenar/condicionar renderização) | Baixo | **P0** |
| Reescrever copy da `AIShowcase` (título, parágrafo, exemplos, CTA) | Texto | Baixo | **P0** |
| Reposicionar `AIShowcase` para logo após o Hero | Layout | Baixo | **P1** |
| Ligar badges de inteligência em `Offers.tsx` | UX (wiring de prop/composer já existentes) | Médio | **P1** |
| Corrigir "Garantia de economia" no `BottomCta` | Texto | Baixo | **P1** |
| Remover duplicidade entre `EconomiaDoDia` e `FlashOffersCard` | UX/Layout | Médio | **P2** |
| Reescrever Benefits/HowItWorks | Texto | Baixo | **P2** |
| Adicionar linha de contexto ao `CambioCard` | Texto | Baixo | **P2** |
| Levar a mesma linguagem para Produto/Comparação/Busca | Texto + UX, missão futura | Alto | **P3** |
| Criar um gatilho real de retorno (favorito/alerta) na Home | Feature nova — fora do escopo desta missão | Alto | **P3 (roadmap)** |
