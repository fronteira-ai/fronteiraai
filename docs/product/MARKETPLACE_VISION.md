# MARKETPLACE_VISION.md
# A Visão de Produto do Marketplace — ParaguAI

**Versão**: 1.2
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation)
**Atualizado**: 2026-07-03 — cross-referência ao Program 0 (capacidade operacional), ao Exchange Intelligence Platform (Program A — Wave 1, instrumenta o Cross-Border Context Model) e ao Real-Time Commerce Engine (Program A — Wave 2, instrumenta o Live Commerce Velocity Model).
**Status**: Orienta todas as decisões de produto do Release 1.8 em diante
**Hierarquia**: Subordinado a `AI_CONSTITUTION.md`, `NORTH_STAR.md`, `BUSINESS_MODEL.md`, `VISION_2035.md`. Este documento não substitui `VISION_2035.md` — é o horizonte de 5 anos, tático e de produto, dentro do horizonte permanente que `VISION_2035.md` já define. Onde os dois divergirem, `VISION_2035.md` prevalece.

---

## Por que este documento existe agora, e não antes

Até o Release 1.7, o ParaguAI construiu **plataforma**: catálogo normalizado, identidade de produto, conectores, verificação de merchant, certificação de segurança. Nenhuma dessas Waves precisava de uma visão de marketplace específica — precisavam de rigor de engenharia. A partir do Release 1.8, o objetivo muda: "até o Release 1.7 construímos a plataforma; a partir do 1.8 construímos o negócio" (mandato do CTO, `RELEASE_1_8_BLUEPRINT.md`). Um negócio precisa de uma visão de produto que oriente decisão a decisão — este documento é essa visão.

---

## 1. Missão

**Tornar o ParaguAI o Marketplace Inteligente da Tríplice Fronteira** — o lugar onde qualquer comprador da região encontra, compara e decide com confiança, e onde qualquer lojista da fronteira, de qualquer tamanho, compete por atenção com dados, não apenas com localização física.

Esta missão é uma especialização tática da missão permanente (`AI_CONSTITUTION.md` II — eliminar a assimetria de informação) para o horizonte específico do Release 1.8: não apenas fornecer informação, mas ser o **lugar de mercado** onde essa informação se converte em decisão de compra real, sustentando o negócio como marketplace, não apenas como fonte de dado.

---

## 2. Visão

Em 5 anos, um comprador brasileiro planejando uma viagem de compras a Ciudad del Este abre o ParaguAI antes de abrir qualquer outra fonte — não porque é a única opção, mas porque é a mais completa, mais atualizada e mais confiável. Um lojista da fronteira, de qualquer porte, sabe que estar ausente do ParaguAI significa estar invisível para uma fatia crescente e já majoritária dos seus clientes potenciais.

Esta visão de 5 anos é um marco intermediário e verificável dentro da visão de 2035 (`VISION_2035.md` Capítulo 3 — "Comparador de Preços → Ecossistema de Comércio → Plataforma de Inteligência para Lojistas"). O Release 1.8 é o que efetivamente move o ParaguAI do primeiro estágio para o segundo.

---

## 3. Objetivos para 5 Anos

1. **Cobertura de catálogo que torna a comparação a norma, não a exceção** — a maioria das categorias relevantes de compra na fronteira tem múltiplas lojas comparáveis no catálogo, não apenas as poucas hoje disponíveis.
2. **Atualização de preço em minutos, não dias, para o que realmente importa** — o Live Pricing Engine (`RELEASE_1_8_BLUEPRINT.md` Capítulo 2) deixa de ser um diferencial técnico e se torna a expectativa padrão do comprador.
3. **Uma base real e crescente de lojistas Premium** — não apenas cadastrados, pagantes, com resultado demonstrável que justifica a permanência.
4. **Um funil de compradores recorrentes**, não apenas visitantes de busca única — a maturação de `C-6 Buyer Behavioral Knowledge` via o Buyer Identity Model (ADR-046) é o que torna isso mensurável e acionável.
5. **SEO como canal de aquisição dominante e sustentável**, não dependente de investimento de marketing recorrente — centenas de milhares de páginas indexadas, cada uma lastreada em dado real e único (`RELEASE_1_8_BLUEPRINT.md` Capítulo 7).
6. **Receita real e diversificada**, não apenas planos definidos — o funil Premium (Capítulo 8) fechado de ponta a ponta, incluindo billing real, algo que nunca existiu até este Release.

---

## 4. Público-Alvo

Herda a segmentação de `BUSINESS_MODEL.md` §3, com ênfase de produto específica para o horizonte do Marketplace:

**Comprador cross-border (núcleo)**: majoritariamente brasileiro, viaja para Ciudad del Este com intenção de compra definida ou parcialmente definida. Quer confiança de preço e disponibilidade antes de atravessar a fronteira — não quer surpresas.

**Comprador local/regional**: reside na região, compra com mais frequência e menor intenção de viagem planejada, mais sensível a conveniência e recorrência do que a planejamento antecipado.

**Lojista pequeno/médio da fronteira**: hoje invisível digitalmente ou visível apenas por presença física — é quem mais ganha com o Marketplace, e quem mais precisa que "valor antes de venda" (`PRODUCT_POLICY.md`) seja verdade na prática, não apenas princípio.

**Lojista já digitalizado/maior**: já tem alguma presença online própria — para este público, o diferencial do ParaguAI não é "existir online", é a inteligência de mercado (Merchant Intelligence, benchmarking, Growth Engine) que nenhuma vitrine própria oferece sozinha.

---

## 5. Proposta de Valor

**Para o comprador**: decisão de compra informada antes de sair de casa — preço confiável, atualizado, comparável entre lojas, na moeda que faz sentido, sem precisar visitar fisicamente para descobrir se a informação era real.

**Para o lojista**: visibilidade para compradores que nunca chegariam à loja de outra forma, mais inteligência de mercado do que a operação sozinha jamais produziria, e um caminho de crescimento onde o ParaguAI só ganha quando o lojista genuinamente vende mais.

Nenhuma das duas proposta é nova — ambas já existiam na Foundation (`BUSINESS_MODEL.md` §3). O que o Release 1.8 muda é a **credibilidade operacional** dessas propostas: até agora, "preço atualizado" e "inteligência de mercado" eram promessas de arquitetura; a partir deste Release, tornam-se experiências reais que o usuário sente.

---

## 6. Diferenciais Competitivos

Herdados diretamente do catálogo de Moats já permanente (`MOAT_STRATEGY.md`), expressos aqui na linguagem de produto/marketplace:

- **Preço que já era antigo em qualquer outro lugar, atualizado em minutos aqui** (Live Pricing Engine + Freshness Score, visível e nomeado, não apenas um fator de ranking invisível — o Real-Time Commerce Engine, Program A Wave 2, já detecta e classifica cada mudança de preço/estoque em tempo quase real; falta a superfície visível ao comprador, ainda não construída).
- **Câmbio que nunca engana** — preço original nunca escondido atrás de uma conversão, cotação sempre auditável (Exchange Engine).
- **Histórico que nenhum concorrente que comece hoje pode ter** (Moat 1 — Historical Data) — visível ao comprador como contexto de decisão, não apenas um ativo interno.
- **Reputação de loja verificável, não autodeclarada** (Moat 2 — Merchant Trust Network, Progressive Verification).
- **A única fonte que conhece este mercado específico** — câmbio, sazonalidade, comportamento de comprador cross-border — porque nenhum player genérico opera aqui com a mesma profundidade (Moat 4 — Cross-Border Context Intelligence).

Nenhum diferencial listado aqui é aspiracional — todos já têm arquitetura definida (Release 1.7 certificado, `RELEASE_1_8_BLUEPRINT.md` para o que falta). A diferença deste documento é declarar, em linguagem de produto, o que a arquitetura já habilita.

---

## 7. Princípios Permanentes desta Visão

**Marketplace não é volume — é comparabilidade real.** Mil lojas sem categorias sobrepostas não criam comparação; cem lojas com categorias sobrepostas criam. A priorização de expansão de catálogo (`RELEASE_1_8_BLUEPRINT.md` Capítulo 1) segue este princípio, não contagem bruta.

**Velocidade de dado é o produto, não uma feature do produto.** Um comparador de preço desatualizado é apenas um diretório. O Live Pricing Engine é o que separa as duas categorias — este princípio nunca deve ser rebaixado a "nice to have" em favor de outra prioridade.

**Confiança de comprador e confiança de lojista se sustentam mutuamente, nunca uma às custas da outra.** Um Freshness Score que mente para parecer melhor destruiria a confiança do comprador para inflar métricas de lojista — nunca aceitável (`PRODUCT_POLICY.md`).

**Cada capacidade nova é avaliada pelo mesmo teste**: fortalece comprador, fortalece lojista, ou fortalece patrimônio estratégico? Se a resposta for nenhuma das três, a capacidade não pertence a este horizonte de produto, por mais interessante que seja tecnicamente.

**O Marketplace nunca compete em preço de anúncio — compete em relevância.** Publicidade contextual (`BUSINESS_MODEL.md` §6) nunca substitui ranking orgânico. Isso não é apenas um princípio ético herdado — é a razão estrutural pela qual o comprador confia na plataforma o suficiente para nunca precisar verificar fisicamente antes de decidir.

---

## Como este documento se relaciona com os outros documentos de produto

| Documento | Relação |
|---|---|
| `VISION_2035.md` | O horizonte permanente — este documento é o marco de 5 anos dentro dele |
| `PRODUCT_POLICY.md` | As decisões já aprovadas que operacionalizam esta visão |
| `MARKETPLACE_STRATEGY.md` | Como, taticamente, esta visão se torna realidade — aquisição, SEO, monetização, Network Effects |
| `RELEASE_1_8_BLUEPRINT.md` | A arquitetura técnica que constrói o que esta visão descreve |
| `KPIS.md` | Como medimos se esta visão está de fato se concretizando |
| `ROADMAP_1_8.md` (Program 0) | A capacidade operacional (Marketplace Operations Platform) que garante que esta visão seja administrável em escala, não apenas construída |
