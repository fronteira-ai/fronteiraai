# RELEASE_1_6_BLUEPRINT.md
# Blueprint Estratégico — Merchant Growth Platform

**Versão**: 1.0  
**Criado**: 2026-06-30  
**Status**: Aguardando aprovação do CTO antes de qualquer implementação  
**Tipo de Release**: Platform + AI + Data (compounding)  
**Fase**: 3 — Merchant Intelligence  
**Número de Release**: 1.6  

---

## Preâmbulo

Este documento é a especificação estratégica completa do Release 1.6 do ParaguAI.

Nenhuma linha de código deve ser escrita, nenhuma API deve ser criada, nenhum componente deve ser implementado antes que este Blueprint seja lido, revisado e aprovado pelo CTO.

Todo desenvolvimento do Release 1.6 — arquitetura, dados, produto, UX e decisões técnicas — deve ser derivado e referenciado a este documento.

O Blueprint foi elaborado após leitura integral dos oito documentos permanentes da Foundation Empresarial (AI_CONSTITUTION, NORTH_STAR, BUSINESS_MODEL, VISION_2035, ENGINEERING_PRINCIPLES, PRODUCT_PRINCIPLES, DECISION_FILTER, RELEASE_STRATEGY), do PROJECT_STATUS.md e dos documentos de arquitetura do projeto.

---

## PRINCÍPIO MAIS IMPORTANTE

Antes de qualquer decisão de implementação dentro deste Release, cada funcionalidade proposta deve responder obrigatoriamente às cinco perguntas:

1. **Ajuda o lojista a vender mais?**
2. **Ajuda o lojista a economizar tempo ou dinheiro?**
3. **Aumenta o valor percebido do plano Premium?**
4. **Fortalece algum Asset permanente?**
5. **Fortalece algum Moat permanente?**

Se qualquer resposta for negativa, a funcionalidade deve ser descartada antes de qualquer discussão técnica.

---

## CAPÍTULO 1 — O PROBLEMA

### Contexto: o que a Release 1.5 entregou

A Release 1.5 completou o ciclo de Trust & Reputation. O ParaguAI agora possui:

- Um sistema de verificação de merchants baseado em evidências
- Trust Signals com proveniência rastreável
- Reviews verificadas com moderação
- Merchant Timeline como história pública de comportamento
- Merchant Passport como identidade unificada de confiança
- ParaguAI Brain com 31 tipos de eventos cognitivos e Knowledge Graph ativo

O comprador agora consegue saber **em quem confiar**. Esse problema está resolvido.

### O problema que permanece sem solução

Um lojista que tem confiança estabelecida dentro da plataforma enfrenta um problema diferente — e igualmente crítico:

**Ele não sabe o que fazer com essa confiança para vender mais.**

Especificamente, o maior problema que um lojista da fronteira enfrenta depois de possuir confiança dentro da plataforma é a **ausência de inteligência comercial prática para tomar decisões de negócio**.

### A anatomia do problema

**1. Perda de vendas invisível**

O lojista não sabe quantas vezes seu produto apareceu nas buscas e não foi clicado. Não sabe qual produto tem alta demanda na sua categoria que ele não está vendendo. Não sabe se perdeu uma venda porque o preço estava 12% acima da média do mercado naquela semana. As vendas perdidas são completamente invisíveis — ele só vê o que vendeu, nunca o que perdeu.

**2. Falta de informação de mercado**

O lojista da fronteira opera em um ambiente de alta concorrência e baixa transparência. Ele observa o concorrente fisicamente, visita a loja ao lado, ouve rumores de preço. Não tem acesso a dados estruturados de mercado: qual categoria está aquecida, qual marca está em queda de demanda, qual faixa de preço está vencendo as comparações. Opera com intuição onde poderia operar com dados.

**3. Decisões de precificação intuitivas**

Precificar um produto na fronteira é um exercício de intuição combinado com observação física dos concorrentes. O lojista não sabe se seu preço está acima ou abaixo da média de mercado para aquele produto específico, se a demanda por aquele produto está crescendo ou declinando, ou qual é o momento ideal para promover ou reajustar. Cada decisão de preço é um palpite qualificado, nunca uma decisão baseada em evidência.

**4. Catálogo desatualizado e incompleto sem diagnóstico**

O lojista não sabe quais dos seus produtos têm imagens ruins, descrições incompletas ou preços desatualizados que estão prejudicando sua performance. Não existe hoje nenhum mecanismo que diga a ele: "Estes 3 produtos do seu catálogo têm preço desatualizado há 14 dias e aparecem em 47 comparações por semana — você está perdendo essas oportunidades."

**5. Concorrência opaca**

O lojista não sabe como está se saindo em relação aos concorrentes da mesma categoria dentro da plataforma. Não tem visibilidade do próprio posicionamento competitivo. Não sabe se seu Merchant Score está acima ou abaixo da média da sua categoria, se seus preços estão sistematicamente acima ou abaixo, ou quais atributos de qualidade de catálogo estão diferenciando lojistas que performam melhor.

**6. Gestão de catálogo reativa, nunca proativa**

O lojista atualiza o catálogo quando tem tempo, não quando o catálogo está sinalizando oportunidade ou risco. Não existe hoje nenhum sistema que avise: "Sua categoria tem pico de buscas nas próximas 3 semanas — prepare seu estoque e atualize os preços." O catálogo é gerenciado pela disponibilidade de tempo do lojista, não pela demanda do mercado.

**7. Oportunidades perdidas sistematicamente**

Existem oportunidades que o lojista nunca vê: produtos com alta demanda de compradores que nenhum lojista da plataforma está oferecendo, nichos de categoria sem concorrência, momentos sazonais de alta de interesse que ele poderia aproveitar. Essas oportunidades existem nos dados do sistema — mas ninguém as está entregando ao lojista.

### A síntese do problema

O lojista que usou a Release 1.5 para construir confiança está, efetivamente, sentado em cima de um arsenal de inteligência comercial que não consegue acessar. Os dados sobre seu negócio existem no sistema. Os dados do mercado existem no sistema. As oportunidades existem no sistema. O que não existe é uma camada de inteligência que transforme esses dados em **decisões acionáveis**.

Essa é a lacuna que o Release 1.6 fecha.

---

## CAPÍTULO 2 — HIPÓTESE ESTRATÉGICA

### A hipótese central

> Se o ParaguAI entregar inteligência comercial prática e acionável para os lojistas — transformando dados existentes em decisões claras sobre o que fazer hoje —, então os lojistas venderão mais, permanecerão mais tempo, perceberão mais valor e migrarão naturalmente para planos superiores.

### Por que esta hipótese é sustentável

**1. O dado já existe — falta a interpretação**

O ParaguAI já acumula dados de busca, comparação, cliques, histórico de preços, Merchant Score e Brain events. Esses dados, sozinhos, não têm valor para o lojista. Interpretados e apresentados como inteligência acionável, eles se tornam o maior diferencial competitivo que um lojista pequeno da fronteira pode ter. O custo marginal de criar inteligência sobre dados que já existem é radicalmente menor do que o valor que essa inteligência entrega.

**2. O lojista que usa inteligência não precisa de mais funcionalidades — precisa de melhores decisões**

A pesquisa de comportamento de plataformas B2B mostra que o usuário de ferramenta de gestão não abandona uma plataforma porque faltam funcionalidades — abandona porque a plataforma parou de gerar resultados que ele consegue atribuir ao uso da ferramenta. Inteligência acionável cria atribuição direta: "Atualizei esse produto porque o Command Center me disse que estava perdendo buscas, e as vendas melhoraram." Essa atribuição é o maior motor de retenção que existe.

**3. A inteligência gera mais inteligência**

Quando o lojista age com base em dados do Command Center — ajusta preço, atualiza catálogo, cadastra produto em demanda —, essa ação gera novos dados no sistema, que melhoram a inteligência futura. O ciclo é autorreforçante: mais lojistas usando mais inteligência geram um sistema mais inteligente, que entrega ainda mais valor. Esse ciclo não existe em plataformas que apenas entregam dashboards passivos.

**4. Inteligência é o argumento mais forte para upgrade de plano**

A diferença entre plano gratuito e plano Premium nunca deveria ser "mais funcionalidades". Deveria ser "mais inteligência". Um lojista no plano gratuito vê seus próprios dados. Um lojista no plano Premium vê seus dados no contexto do mercado. Esse salto de contexto — de "como estou" para "como estou em relação a todos" — é o valor de upgrade que nenhum concorrente consegue replicar sem os dados de mercado que o ParaguAI acumulou.

**5. O momento é exato**

A Release 1.5 estabeleceu confiança. Um lojista confiável que recebe inteligência acionável tem todos os elementos para crescer. Oferecer inteligência antes de confiança seria prematuro — o lojista não teria credibilidade para agir com base nos dados. Oferecer confiança sem inteligência — o estado atual — deixa o lojista com uma fundação sólida mas sem ferramentas para crescer sobre ela. O Release 1.6 é a continuação natural e necessária do ciclo.

---

## CAPÍTULO 3 — MERCHANT COMMAND CENTER

### O que é e por que não é um Dashboard

Um **Dashboard** é passivo. Ele exibe informações. Cabe ao usuário interpretá-las, decidir o que fazer com elas e tomar ação. O dashboard delega o trabalho cognitivo mais importante — a interpretação e a decisão — inteiramente para o humano.

Um **Command Center** é ativo. Ele não exibe informações — ele entrega **inteligência**. A diferença não é semântica: é estrutural. O Command Center interpreta os dados, determina o que é significativo, prioriza o que requer ação e apresenta recomendações claras. O trabalho cognitivo de interpretação fica com o sistema. O lojista recebe o resultado, não o processo.

Um Dashboard responde à pergunta: "Quais são os números?"  
Um Command Center responde à pergunta: "O que eu devo fazer hoje?"

### A diferença na prática

| Dashboard | Command Center |
|---|---|
| "Você teve 234 visualizações esta semana" | "Seu produto X teve 234 visualizações mas 0 conversões — o preço está 18% acima da média do mercado" |
| "Seu Merchant Score é 72" | "Seu Score caiu 4 pontos porque 3 produtos estão sem preço atualizado há 21 dias — atualize agora" |
| "Você tem 47 produtos no catálogo" | "12 produtos do seu catálogo nunca apareceram em uma comparação — considere remover ou revisar" |
| "Sua categoria é Eletrônicos" | "Eletrônicos tem alta de 34% nas buscas nas últimas 2 semanas — você está posicionado para capturar esse crescimento?" |

### O que o Command Center deve comunicar

O Command Center do ParaguAI deve ser estruturado em torno de cinco perguntas que um lojista de sucesso precisa responder todo dia:

**1. Como está meu negócio?** — Visão consolidada de performance: visualizações, comparações, cliques para contato, evolução do Merchant Score, posição relativa na categoria.

**2. Onde estou perdendo dinheiro?** — Diagnóstico ativo de oportunidades perdidas: produtos com alta impressão e baixa conversão, produtos com preço fora do mercado, produtos com catálogo incompleto que prejudicam a comparação.

**3. Como vender mais?** — Recomendações proativas baseadas em dados de mercado: produtos com alta demanda sem cobertura no catálogo, momentos de sazonalidade que se aproximam, ajustes de preço com maior probabilidade de conversão.

**4. Como melhorar meu catálogo?** — Diagnóstico de qualidade: completude de dados, qualidade de imagens, atualização de preços, produtos com alta impressão e dados incompletos.

**5. O que devo fazer hoje?** — Lista de ações priorizadas pelo sistema, ordenadas por impacto estimado no negócio do lojista. Não uma lista de afazeres genérica — uma agenda de crescimento gerada por inteligência.

### O princípio de design do Command Center

O Command Center deve parecer um consultor de negócios que nunca dorme, nunca esquece um dado e nunca é influenciado por interesse pessoal. Quando o lojista entra pela manhã, o sistema já sabe o que aconteceu no mercado enquanto ele dormia e já preparou o que ele precisa saber para tomar as melhores decisões do dia.

A experiência ideal: o lojista entra no Command Center, vê três ou quatro ações priorizadas pelo sistema, executa uma ou duas, e já sente impacto mensurável. Não um painel com 40 métricas que ele precisa decifrar. Uma agenda inteligente que o direciona para o que importa.

---

## CAPÍTULO 4 — MODELO DE MONETIZAÇÃO

### Princípio

Este capítulo não define preços. Define valor percebido — o que cada plano entrega e por que o lojista desejaria avançar para o próximo.

A lógica de monetização do Release 1.6 segue o princípio da Foundation: a diferença entre planos é de capacidade e inteligência, não de acesso fundamental. Um lojista no plano gratuito consegue operar. Um lojista no plano Premium opera com vantagem competitiva. Um lojista no plano Enterprise opera com inteligência de mercado que nenhum concorrente pequeno tem acesso.

### Plano Gratuito — "Presença"

O que o lojista possui:
- Presença no catálogo com produtos, preços e Merchant Score
- Visibilidade em comparações de compradores
- Merchant Passport público com Trust Signals básicos
- Command Center com visão das métricas do próprio negócio (sem contexto de mercado)
- Diagnóstico básico de catálogo: quais produtos têm dados incompletos

**O que está faltando para crescer:** contexto de mercado. O lojista vê seus números, mas não sabe o que eles significam em relação à concorrência e ao mercado.

**Gatilho de upgrade:** o lojista percebe que tem dados mas não tem inteligência. Está navegando com instrumentos que mostram altitude mas não mostram a posição dos outros aviões.

### Plano Premium — "Inteligência"

O que o lojista possui além do gratuito:
- Benchmarking de preço em tempo real: como seus preços se comparam com a média da sua categoria
- Análise de oportunidades perdidas: buscas na sua categoria que não encontraram o produto em seu catálogo
- Inteligência competitiva de posicionamento: como seu Merchant Score e qualidade de catálogo se comparam com outros lojistas da mesma categoria
- Alertas proativos: quando um produto do seu catálogo está perdendo competitividade por preço ou dados desatualizados
- Sazonalidade de categoria: períodos históricos de alta de demanda na sua categoria específica
- Lista de ações priorizadas pelo sistema ("O que fazer hoje")

**O valor percebido:** o lojista deixa de gerenciar por intuição e passa a gerenciar por dados. Cada decisão que tomar — de preço, de catálogo, de promoção — será baseada em evidência real de mercado, não em observação do concorrente físico ao lado.

**Gatilho de upgrade para Enterprise:** o lojista percebe que tem inteligência da sua categoria mas quer entender tendências macro, oportunidades emergentes e análises preditivas.

### Plano Enterprise — "Antecipação"

O que o lojista possui além do Premium:
- Inteligência preditiva de demanda: o que está crescendo em demanda nas próximas semanas com base em padrões históricos e comportamento atual de compradores
- Análise de gaps de mercado: categorias e produtos com alta demanda e poucos fornecedores na plataforma
- Benchmarking expandido: comparação com lojistas de múltiplas categorias relacionadas
- Relatórios periódicos de inteligência de mercado gerados automaticamente
- Acesso a dados históricos de sazonalidade com granularidade maior
- Consultoria de catálogo automática: sugestões de novos produtos para incluir com base na demanda identificada

**O valor percebido:** o lojista compete com a vantagem de quem sabe o que vai acontecer antes de acontecer. Enquanto concorrentes reagem ao mercado, ele se antecipa. Essa antecipação é o maior diferencial competitivo que um lojista de médio porte pode ter em um mercado de alta concorrência.

### Recursos que aumentam retenção

- **Histórico acumulado de performance:** quanto mais tempo o lojista usa a plataforma, mais rico é o histórico de sua performance. Sair significa perder esse histórico — e a capacidade de comparar "agora" com "antes".
- **Alertas configurados:** cada alerta que o lojista cria é uma rotina que passa a depender da plataforma. Migrar para outro sistema significa reconfigurar todas as rotinas.
- **Reputação pública construída:** o Merchant Passport e os Trust Signals são públicos e pertencem ao histórico do lojista na plataforma. São irreproduzíveis em outro lugar.

### Recursos que aumentam upgrade

- **Benchmarking de mercado** é o recurso com maior poder de upgrade. Ver seus próprios números sem contexto não gera urgência. Ver que você está 15% acima do preço médio da categoria com a menor taxa de conversão do segmento — isso gera urgência imediata.
- **"O que fazer hoje"** é o segundo recurso mais poderoso. Uma agenda de crescimento gerada por IA que entrega 3 ações prioritárias com impacto estimado é impossível de ignorar — e impossível de reproduzir manualmente.
- **Análise de oportunidades perdidas** é o terceiro. Não existe recurso de upgrade mais convincente do que mostrar ao lojista quanto dinheiro ele está deixando na mesa.

---

## CAPÍTULO 5 — EPICS

### Estrutura dos Epics

Cada Epic responde exatamente uma pergunta do lojista. A pergunta é o epicentro — toda decisão de design, dado e interação deve emanar dela.

---

### EPIC 1 — "Como está meu negócio?"
**Performance Intelligence**

**Objetivo:** Dar ao lojista uma visão consolidada, honesta e acionável do estado atual do seu negócio na plataforma.

**Problema resolvido:** Hoje o lojista não tem como saber, em um único lugar, como sua loja está performando em relação ao histórico próprio. Métricas dispersas ou inexistentes não geram consciência de negócio.

**O que entrega:**
- Visão de impressões, comparações e cliques para contato por período
- Evolução do Merchant Score com fatores que o compõem
- Produtos mais vistos e menos vistos no período
- Posição percentual do lojista na sua categoria (plano Premium)
- Tendência: melhorando, estável ou piorando em relação ao período anterior

**Assets fortalecidos:**
- **Merchant Score** — passa a ser um ativo de negócio visível, não apenas um número interno
- **Histórico de dados** — cada período de uso enriquece o histórico de performance que o lojista consulta
- **Merchant OS** — o Command Center é a evolução natural do dashboard atual

**Moats fortalecidos:**
- **Custo de troca:** o lojista que acumula 12 meses de histórico de performance no Command Center não migra facilmente — perderá a base de comparação
- **Dados históricos irreplicáveis:** a série histórica de performance por lojista se torna mais valiosa a cada semana que passa

**Impacto esperado:**
- Lojistas com visão de performance atuam mais sobre o catálogo
- Atualizações mais frequentes melhoram a qualidade dos dados para compradores
- Lojistas que percebem crescimento tornam-se promotores orgânicos da plataforma

---

### EPIC 2 — "Onde estou perdendo dinheiro?"
**Opportunity Loss Detector**

**Objetivo:** Fazer o invisível visível: mostrar ao lojista exatamente onde e quanto está perdendo em vendas não realizadas, e por quê.

**Problema resolvido:** O lojista nunca vê as vendas que perdeu. Só vê o que aconteceu, nunca o que poderia ter acontecido. Essa invisibilidade torna impossível tomar decisões preventivas.

**O que entrega:**
- Produtos com alto número de impressões e baixo número de cliques (sinal de problema de preço ou dados)
- Produtos que aparecem em comparações mas perdem consistentemente para concorrentes (com diagnóstico de por quê)
- Produtos com preço significativamente acima da média da categoria no período
- Produtos com dados incompletos que penalizam a posição nas comparações
- Estimativa de impacto de cada problema identificado ("se corrigir isso, sua taxa de clique estimada aumentaria X%")

**Assets fortalecidos:**
- **Knowledge Graph** — cada padrão de oportunidade perdida detectado enriquece o grafo cognitivo do Brain
- **Catálogo normalizado** — o diagnóstico ativo incentiva os lojistas a manterem dados de alta qualidade
- **Histórico de preços** — fundamental para identificar desvio de preço em relação à média histórica da categoria

**Moats fortalecidos:**
- **Dados históricos:** para identificar oportunidade perdida, é necessário histórico. Quanto mais histórico, mais preciso o diagnóstico — e mais indefensável por um concorrente novo
- **Inteligência contextual:** o diagnóstico é específico para a fronteira paraguaia, para as categorias locais, para os padrões de comportamento dos compradores brasileiros — não é replicável com inteligência genérica

**Impacto esperado:**
- Lojistas que veem oportunidades perdidas agem imediatamente sobre preços e dados
- Melhora da qualidade geral do catálogo beneficia compradores
- Lojistas percebem ROI direto do Command Center — força de retenção e upgrade

---

### EPIC 3 — "Como vender mais?"
**Growth Recommendations Engine**

**Objetivo:** Entregar ao lojista recomendações proativas e priorizadas de crescimento — não uma lista de tarefas, mas uma agenda de decisões gerada por inteligência real de mercado.

**Problema resolvido:** O lojista não sabe o que fazer para crescer. Tem energia e disposição, mas falta direção baseada em dados. Sem inteligência, age sobre o que parece urgente, não sobre o que é mais impactante.

**O que entrega:**
- "O que fazer hoje": lista de 3 a 5 ações priorizadas por impacto estimado no negócio
- Recomendações de produtos para adicionar ao catálogo com base em demanda não atendida na sua categoria
- Alertas de sazonalidade: períodos de alta histórica na categoria que se aproximam
- Sugestões de ajuste de preço com estimativa de impacto na taxa de comparação
- Identificação de compradores que buscaram produtos que o lojista tem mas não encontraram (falhas de correspondência entre catálogo e busca)

**Assets fortalecidos:**
- **ParaguAI Brain** — cada recomendação gerada e cada ação tomada pelo lojista em resposta é um evento cognitivo que melhora a precisão futura das recomendações
- **Merchant OS** — torna-se uma ferramenta de decisão ativa, não apenas de visualização
- **Base de confiança** — lojistas que recebem recomendações úteis confiam mais na plataforma e são mais propensos a seguir futuras sugestões

**Moats fortalecidos:**
- **Efeito de rede de dados:** quanto mais lojistas atuam com base em recomendações, mais dados de comportamento respondem são gerados, que melhoram as recomendações para todos
- **Inteligência contextual não-genérica:** as recomendações são derivadas de dados específicos da Tríplice Fronteira — impossíveis de replicar com dados genéricos ou com IA de propósito geral

**Impacto esperado:**
- Aumento direto de catálogo ativo e atualizado por parte de lojistas
- Lojistas com recomendações acionadas percebem resultado mensurável e atribuem ao Command Center
- Força de upgrade: "O que fazer hoje" no plano Premium mostra recomendações com mais contexto de mercado que o plano gratuito

---

### EPIC 4 — "Como melhorar meu catálogo?"
**Catalog Intelligence**

**Objetivo:** Dar ao lojista diagnóstico preciso e priorizado do estado do seu catálogo, com ações claras para cada problema identificado.

**Problema resolvido:** O lojista não tem visibilidade de quais produtos do seu catálogo estão com problemas que prejudicam sua performance. Sabe que tem 200 produtos — não sabe que 40 deles têm imagem inadequada, 23 estão sem preço há mais de 15 dias e 12 têm descrição que impede a indexação correta nas comparações.

**O que entrega:**
- Score de saúde do catálogo: porcentagem do catálogo em estado "ideal", "atenção" e "crítico"
- Lista priorizada de produtos que precisam de atualização, com diagnóstico específico por produto
- Comparativo de completude de dados entre o catálogo do lojista e a média da categoria
- Identificação de produtos que estão aparecendo em comparações mas com dados que prejudicam a escolha pelo comprador
- Histórico de qualidade: como o catálogo evoluiu ao longo do tempo (incentivo a manter consistência)

**Assets fortalecidos:**
- **Catálogo normalizado** — a pressão ativa do diagnóstico melhora continuamente a qualidade dos dados
- **Merchant Score** — a completude e atualização do catálogo são componentes do Score — o diagnóstico torna o Score um guia ativo de melhoria
- **Knowledge Graph** — a evolução da qualidade do catálogo por categoria é registrada no Brain como conhecimento estrutural do mercado

**Moats fortalecidos:**
- **Qualidade de dados como barreira:** um catálogo com anos de dados normalizados, verificados e consistentemente atualizados é impossível de replicar por um concorrente sem o histórico de interações que produziram essa qualidade
- **Custo de troca:** um lojista que investiu em melhorar seu catálogo com base nos diagnósticos do Command Center criou um ativo dentro da plataforma que não existe em nenhum outro lugar

**Impacto esperado:**
- Melhora contínua da qualidade do catálogo melhora a experiência do comprador
- Lojistas com catálogos de alta qualidade ranqueiam melhor, vendendo mais
- O flywheel é acelerado: melhor catálogo → mais compradores → mais dados → melhores recomendações → mais upgrades

---

### EPIC 5 — "O que devo fazer hoje?"
**Daily Intelligence Brief**

**Objetivo:** Entregar ao lojista, a cada sessão, uma agenda de decisões gerada por inteligência — consolidando os insights de todos os Epics em um único ponto de entrada acionável.

**Problema resolvido:** Mesmo com acesso a informações de negócio, mercado e catálogo, o lojista precisa sintetizá-las em decisões. Esse trabalho cognitivo de síntese — o mais difícil — é hoje feito inteiramente pelo lojista. O Epic 5 faz esse trabalho pelo lojista.

**O que entrega:**
- Briefing diário: 3 a 5 ações priorizadas pelo sistema com estimativa de impacto
- Alertas urgentes: quando algo mudou no mercado que afeta diretamente o lojista (um concorrente baixou preço 20% em um produto que o lojista tem, por exemplo)
- Resumo de mercado: o que aconteceu ontem na categoria do lojista que é relevante para ele saber
- Próximo passo de crescimento de longo prazo: baseado no Merchant Level atual e no histórico do lojista
- Confirmação de ações: quando o lojista toma ação recomendada e o sistema detecta impacto positivo, confirma — criando o ciclo de confiança na inteligência

**Assets fortalecidos:**
- **ParaguAI Brain** — o Daily Brief é a expressão mais direta do Brain como consultor de negócios — cada briefing é um evento cognitivo rico que alimenta o sistema
- **Merchant OS** — transforma-se de portal administrativo em parceiro de negócio diário
- **Base de confiança** — a confiança na plataforma aumenta cada vez que uma recomendação do Brief se comprova correta

**Moats fortalecidos:**
- **Hábito como barreira:** um lojista que começa o dia abrindo o Daily Brief cria uma rotina de negócio que depende da plataforma. Romper esse hábito tem custo comportamental e de negócio alto
- **Inteligência acumulada:** o Brief fica mais preciso com o tempo, porque o histórico de ações e resultados do lojista alimenta o sistema. Depois de 6 meses, o Brief do lojista X é personalizado para o padrão de comportamento específico dele — impossível de replicar em outro lugar

**Impacto esperado:**
- Aumento drástico na frequência de acesso ao Command Center (de eventual para diário)
- Aumento de ações tomadas por lojistas em resposta a recomendações
- O ciclo de feedback de ação → resultado → confirmação cria dependência positiva na plataforma
- Força de upgrade mais poderosa: no plano Premium, o Brief inclui contexto de mercado; no plano gratuito, só dados do próprio negócio

---

## CAPÍTULO 6 — ASSETS

### Quais Assets crescerão e como

O Release 1.6 não cria novos Assets do zero. Ele **amplifica Assets que já existem**, transformando dados que já estão sendo coletados em inteligência que gera valor ativo.

---

**Asset 1: Merchant OS**
*Crescimento: de portal de gestão para sistema nervoso operacional do lojista*

O Merchant OS, até a Release 1.5, era um portal administrativo: o lojista entrava para verificar métricas, atualizar catálogo e acompanhar seu Score. Com o Release 1.6, o Merchant OS passa a ser **proativo**: ele avisa o lojista, prioriza ações e entrega inteligência sem que o lojista precise procurar.

Relacionamento com Epics: todos os cinco Epics são expressos dentro do Merchant OS. O Command Center é a nova face do Merchant OS.

**Como medir o crescimento:** frequência de acesso diário, número de ações tomadas em resposta a recomendações, taxa de retenção de lojistas que usam o Command Center vs. os que não usam.

---

**Asset 2: Merchant Score**
*Crescimento: de métrica interna para instrumento de navegação de negócio*

O Merchant Score era calculado e exibido, mas sem contexto para o lojista agir sobre ele. Com o Release 1.6, o Score passa a ter dois novos atributos: **decomposição visível** (o lojista vê exatamente o que compõe seu Score e qual fator tem mais impacto) e **contexto competitivo** (plano Premium: como seu Score se compara com outros da mesma categoria).

A decomposição transforma o Score de número opaco em agenda de melhoria. O contexto competitivo transforma o Score em instrumento de posicionamento de mercado.

Relacionamento com Epics: Epic 1 (performance), Epic 4 (catálogo), Epic 5 (ações recomendadas).

---

**Asset 3: Histórico de Preços**
*Crescimento: de dado de arquivo para inteligência competitiva ativa*

O histórico de preços era acumulado e disponível para análise interna, mas não entregue ao lojista de forma interpretada. Com o Release 1.6, o histórico de preços da **categoria** — agregado e anonimizado — passa a ser inteligência de benchmarking que o lojista recebe ativamente.

O lojista não precisa mais visitar o concorrente fisicamente para saber se seu preço está fora do mercado. Recebe esse diagnóstico diretamente no Command Center.

Relacionamento com Epics: Epic 2 (oportunidades perdidas), Epic 3 (recomendações de crescimento), Epic 5 (Daily Brief).

---

**Asset 4: Catálogo Normalizado**
*Crescimento: de banco de dados passivo para sistema de qualidade ativo*

O catálogo era normalizado e indexado, mas sem feedback ativo para lojistas sobre a qualidade dos seus dados. Com o Release 1.6, o catálogo normalizado torna-se um sistema de qualidade com diagnóstico ativo: o lojista recebe alertas quando produtos do seu catálogo têm problemas que reduzem sua performance.

A consequência de segunda ordem: a qualidade média do catálogo da plataforma melhora continuamente, melhorando a experiência do comprador e o SEO footprint.

Relacionamento com Epics: Epic 4 (catalog intelligence), Epic 2 (opportunity loss), Epic 5 (Daily Brief).

---

**Asset 5: ParaguAI Brain**
*Crescimento: de repositório cognitivo para motor de inteligência comercial*

O Brain acumulou 31 tipos de eventos e um Knowledge Graph com relações entre Buyer, Merchant, Signal e Review. Com o Release 1.6, o Brain passa a ter uma função ativa nova: **síntese e recomendação**. Os eventos e relações acumulados passam a ser interpretados para gerar recomendações específicas por lojista.

O Brain não muda estruturalmente — ele ganha novos eventos (ver Capítulo 8) e passa a ser consultado ativamente pelo Command Center para gerar as recomendações dos Epics 3, 4 e 5.

Relacionamento com Epics: todos os Epics alimentam o Brain com novos eventos; o Brain é a fonte de inteligência dos Epics 3, 4 e 5.

---

**Asset 6: Rede de dados comportamentais de lojistas**
*Crescimento: primeiro aparecimento — nasce neste Release*

O Release 1.6 inaugura um novo tipo de dado: **padrões de comportamento de lojistas**. Que ações os lojistas tomam quando recebem uma recomendação? Quais recomendações têm maior taxa de aceitação? Quais ações tomadas têm maior impacto no Score e nas métricas? 

Esses dados de comportamento de lojistas, agregados, permitem que o sistema aprenda quais recomendações realmente funcionam — e melhore a precisão das próximas. É o equivalente do "data network effect" no lado B2B da plataforma.

---

## CAPÍTULO 7 — MOATS

### Por que cada Epic aumenta a dificuldade de ser copiado

O moat do ParaguAI não é tecnologia. É a combinação de dados acumulados, contexto local e confiança construída. Cada Epic do Release 1.6 aprofunda um ou mais vetores desse moat.

---

**Moat 1: Dados históricos irreplicáveis**

*Como o Release 1.6 o fortalece:*

O histórico de preços por categoria da Tríplice Fronteira já é um dado que nenhum concorrente pode comprar retroativamente. O Release 1.6 acrescenta duas novas camadas de dados históricos irreplicáveis:

1. **Histórico de performance por lojista:** cada semana de uso do Command Center gera dados de impressões, comparações e cliques que nenhum sistema externo tem. Depois de 12 meses, esse histórico é um ativo de negócio que pertence ao lojista dentro da plataforma — e não pode ser transferido para outro lugar.

2. **Histórico de respostas a recomendações:** quando um lojista recebe uma recomendação e age (ou não age), esse evento é registrado. Depois de centenas de ciclos de recomendação-ação-resultado, o sistema sabe quais tipos de recomendação funcionam para quais tipos de lojista. Esse dado de calibração é impossível de replicar sem o histórico de interações.

*Por que um concorrente não consegue copiar:* Para ter esses dados, um concorrente precisaria de lojistas reais usando um Command Center real por meses. Sem os lojistas, sem os dados. Sem os dados, sem a inteligência. Sem a inteligência, sem os lojistas. É um ciclo que só o primeiro participante a construir pode iniciar.

---

**Moat 2: Inteligência contextual não-genérica**

*Como o Release 1.6 o fortalece:*

Os Epics 2, 3 e 5 entregam inteligência que só é possível com dados específicos da Tríplice Fronteira:
- Sazonalidade de categorias específicas do comércio fronteiriço
- Padrões de comportamento de compradores brasileiros visitando Ciudad del Este
- Benchmarking de preço em categorias de produtos paraguaios
- Padrões de demanda por categoria específicos do mercado local

Um modelo de IA genérico ou uma plataforma de analytics genérica não tem esses dados. Não é possível comprar essa inteligência de terceiros porque ela nunca foi estruturada antes. Ela só existe porque o ParaguAI acumulou os dados primários que a tornam possível.

*Por que um concorrente não consegue copiar:* Precisaria de 2 a 5 anos de dados locais antes de conseguir gerar inteligência de qualidade comparável — e durante esses anos, o ParaguAI terá 2 a 5 anos a mais de histórico.

---

**Moat 3: Custo de troca do lojista**

*Como o Release 1.6 o fortalece:*

A Release 1.5 já havia aumentado o custo de troca via Merchant Passport e Trust Signals. O Release 1.6 adiciona três novas camadas:

1. **Histórico de performance acumulado:** depois de 6 meses de Command Center, o lojista tem uma série histórica de sua performance que não existe em nenhum outro lugar. Migrar para outro sistema significa começar do zero, sem base de comparação.

2. **Recomendações calibradas:** o sistema aprende o perfil do lojista ao longo do tempo — que categorias ele vende, como responde a recomendações, quais ações têm mais impacto para ele. Essa calibração pessoal não é transferível.

3. **Rotinas operacionais dependentes:** o lojista que passa a começar o dia pelo Daily Brief cria uma rotina que depende da plataforma. Romper uma rotina operacional de negócio tem custo comportamental real.

*Por que um concorrente não consegue copiar:* Mesmo que um concorrente clone exatamente as funcionalidades do Command Center, não consegue clonar o histórico acumulado nem a calibração pessoal do sistema para cada lojista. O lojista migrante começaria do zero — sem história, sem calibração, sem contexto.

---

**Moat 4: Efeito de rede de dados B2B**

*Como o Release 1.6 o fortalece:*

Até a Release 1.5, o efeito de rede do ParaguAI era primariamente B2C (compradores trazem compradores) e B2B básico (mais lojistas atraem mais compradores). O Release 1.6 inaugura um novo tipo de efeito de rede: **B2B de dados**.

Quando um lojista age com base em uma recomendação e o sistema registra o resultado, esse dado melhora as recomendações para todos os lojistas da mesma categoria. Quanto mais lojistas usam o Command Center, mais preciso ele fica para cada um. Um concorrente com 10 lojistas nunca conseguirá gerar recomendações tão precisas quanto um sistema com 500 — mesmo com a mesma tecnologia.

*Por que um concorrente não consegue copiar:* Sem massa crítica de lojistas, o sistema de recomendação não tem dados suficientes para ser preciso. E sem um sistema preciso, os lojistas não confiam nas recomendações. É um chicken-and-egg que só pode ser resolvido com o histórico que já existe.

---

**Moat 5: Confiança acumulada + inteligência comercial = indispensabilidade**

*Como o Release 1.6 o fortalece:*

A Release 1.5 construiu confiança verificável. O Release 1.6 acrescenta inteligência comercial. A combinação dos dois cria **indispensabilidade** — o estado em que o lojista não consegue imaginar operar sem a plataforma porque ela conhece seu negócio melhor do que qualquer ferramenta alternativa.

Um lojista que tem confiança pública + histórico de performance + diagnóstico de catálogo + benchmarking de preço + recomendações calibradas não é um usuário de software — é um parceiro de negócio com a plataforma. Parceiros não migram para alternativas que custam menos. Parceiros permanecem porque o custo de perder o parceiro é maior do que qualquer saving de custo de ferramenta.

---

## CAPÍTULO 8 — PARAGUAI BRAIN

### Novos eventos cognitivos

O Release 1.6 acrescenta uma nova camada ao Brain: eventos de inteligência comercial gerados tanto pelo comportamento do lojista quanto pelo sistema de recomendação. Cada interação com o Command Center é um evento cognitivo que alimenta o Knowledge Graph.

**Eventos de performance do Command Center:**

- `merchant_command_center_accessed` — lojista abriu o Command Center
- `performance_report_viewed` — lojista visualizou relatório de performance (Epic 1)
- `opportunity_loss_viewed` — lojista visualizou diagnóstico de oportunidades perdidas (Epic 2)
- `opportunity_loss_acknowledged` — lojista confirmou que viu uma oportunidade perdida específica
- `growth_recommendation_received` — sistema gerou uma recomendação para o lojista (Epic 3)
- `growth_recommendation_acted` — lojista tomou ação em resposta a uma recomendação
- `growth_recommendation_dismissed` — lojista descartou uma recomendação (dado de calibração)
- `catalog_health_score_viewed` — lojista visualizou score de saúde do catálogo (Epic 4)
- `catalog_issue_resolved` — lojista corrigiu um problema de catálogo identificado pelo sistema
- `catalog_issue_ignored` — lojista não agiu sobre um problema identificado (dado de calibração)
- `daily_brief_opened` — lojista abriu o Daily Brief (Epic 5)
- `daily_brief_action_taken` — lojista executou uma ação a partir do Daily Brief
- `price_benchmark_viewed` — lojista visualizou benchmarking de preço da categoria (Premium)
- `price_adjusted_after_benchmark` — lojista ajustou preço após visualizar benchmarking
- `market_opportunity_identified` — sistema identificou oportunidade de mercado para o lojista
- `market_opportunity_acted` — lojista agiu sobre oportunidade de mercado identificada

### Novos conhecimentos acumulados

O Knowledge Graph do Brain deve acumular novos tipos de conhecimento estruturado a partir dos eventos acima:

**Conhecimento sobre padrões de lojistas:**
- Que tipos de recomendação têm maior taxa de aceitação por tipo de lojista (categoria, tamanho de catálogo, plano)
- Quais problemas de catálogo são mais frequentes por categoria de produto
- Com que frequência os lojistas abrem o Command Center e em quais dias/horários
- Qual é o tempo médio entre receber uma recomendação e agir sobre ela

**Conhecimento sobre impacto de ações:**
- Quais ações de catálogo geram maior impacto no Merchant Score
- Quais ajustes de preço resultam em maior aumento de taxa de comparação
- Quais categorias de problema têm maior impacto quando resolvidas
- Qual é o impacto médio no clique de resolver um problema de imagem vs. um problema de preço

**Conhecimento sobre o mercado:**
- Padrões de demanda por categoria com granularidade semanal
- Correlação entre comportamento de compradores e ações de lojistas de alta performance
- Identificação de gaps de oferta: categorias com alta demanda e poucos fornecedores

### Novas relações no Knowledge Graph

As relações existentes (Buyer ↔ Merchant, Merchant ↔ Signal, Signal ↔ Review) ganham novas dimensões:

- **Merchant ↔ Recommendation:** relação bidirecional entre lojistas e recomendações recebidas/executadas
- **Recommendation ↔ Outcome:** relação entre recomendações específicas e resultados mensuráveis
- **Merchant ↔ MarketOpportunity:** relação entre lojistas e oportunidades de mercado identificadas para eles
- **Category ↔ DemandPattern:** relação entre categorias e padrões históricos de demanda
- **Merchant ↔ PriceBenchmark:** relação entre o lojista e a posição de seus preços no mercado da categoria

### Arquitetura cognitiva: o que o Brain "sabe" ao final do Release 1.6

Ao final do Release 1.6, o Brain será capaz de responder, com dados reais, às seguintes perguntas:

- "Qual é o padrão de comportamento de lojistas de alta performance na categoria X?"
- "Quais recomendações têm maior impacto para lojistas com perfil similar ao Lojista Y?"
- "Que oportunidades de mercado existem na categoria Z que nenhum lojista atual está aproveitando?"
- "Quando um lojista ignora uma recomendação de ajuste de preço, qual é o impacto médio nos 30 dias seguintes?"
- "Qual é a correlação entre score de saúde de catálogo e taxa de conversão de comparações para cliques de contato?"

---

## CAPÍTULO 9 — EXPERIÊNCIA DO LOJISTA

### A jornada ideal: do primeiro login à decisão diária baseada em inteligência

#### Estágio 1: Primeiro login (estado atual após Release 1.5)

O lojista chega ao Command Center com um cadastro completo, Trust Signals verificados e Merchant Passport público. Tem confiança estabelecida. O que não tem: clareza sobre o que fazer a seguir para crescer.

A experiência de entrada no Release 1.6 deve ser imediatamente diferente: ao entrar pela primeira vez no Command Center, o lojista não vê uma tela vazia ou um conjunto de métricas a decifrar. Vê um **diagnóstico de boas-vindas**: "Aqui está o estado atual do seu negócio, os 3 problemas mais urgentes e as 3 oportunidades que você pode explorar hoje."

#### Estágio 2: Primeira semana — estabelecimento de linha de base

Durante a primeira semana, o Command Center coleta dados de comportamento do lojista e refina seu perfil cognitivo no Brain. O lojista recebe diagnósticos progressivamente mais precisos conforme usa a plataforma e age sobre recomendações.

A experiência percebida: "Esse sistema parece que está aprendendo sobre meu negócio." Isso não é percepção — é realidade. O Brain está, de fato, calibrando as recomendações com base no comportamento do lojista.

#### Estágio 3: Primeiro mês — o hábito do Daily Brief

Após 2 semanas de uso, o lojista começa a abrir o Command Center diariamente para verificar o Daily Brief. Não por disciplina — por valor percebido. O Brief entrega 3 a 5 ações priorizadas que o lojista pode executar em 10 a 15 minutos, com estimativa clara de impacto.

A experiência percebida: "Se eu executar o que o sistema me pede, meu negócio melhora. Eu vejo isso acontecendo." Esse é o momento em que o Command Center deixa de ser uma ferramenta e passa a ser um parceiro.

#### Estágio 4: Primeiro trimestre — decisões baseadas em inteligência

Após 90 dias de uso, o lojista não toma mais decisões de catálogo, preço ou estoque sem verificar o Command Center primeiro. O benchmarking de preço da categoria tornou-se parte natural do processo de precificação. As oportunidades de mercado identificadas pelo sistema tornaram-se parte do planejamento de catálogo.

A experiência percebida: "Antes eu atualizava o catálogo quando lembrava. Agora atualizo quando o sistema me avisa que preciso. Antes eu precificava por intuição. Agora verifico como estou em relação ao mercado antes de decidir."

#### Estágio 5: Seis meses — o consultor que conhece seu negócio

Após 6 meses, o sistema acumulou histórico suficiente para que as recomendações sejam altamente personalizadas. O lojista percebe que o Command Center "conhece" seu negócio: lembra de padrões sazonais que ele viveu, reconhece o tipo de ação que ele responde melhor, antecipa situações antes que se tornem problemas.

A experiência percebida: "É como ter um consultor de negócio disponível 24 horas, que nunca esquece nada sobre o meu negócio e sempre está olhando para o mercado por mim."

Esse é o estado ao qual o Release 1.6 deve conduzir o lojista. A plataforma deixa de ser um software que ele usa. Passa a ser um consultor em que ele confia.

### Como a plataforma parece um consultor, não um software

**Linguagem:** O Command Center não fala em "métricas" ou "KPIs". Fala em "vendas", "oportunidades", "problemas". Usa a linguagem do negócio do lojista, não a linguagem de tecnologia.

**Proatividade:** O consultor não espera que o lojista venha perguntar. Ele avisa quando algo mudou, quando uma oportunidade apareceu, quando um problema está se agravando. O Command Center faz o mesmo.

**Contexto:** O consultor conhece o histórico do cliente. Quando faz uma recomendação, explica: "No mês passado, quando você ajustou o preço do produto X para perto da média do mercado, seus cliques para contato aumentaram 23%. Esta semana, o produto Y está na mesma situação. Considere o mesmo ajuste." O Command Center faz o mesmo.

**Clareza:** O consultor não entrega relatórios de 40 páginas. Entrega 3 decisões claras com contexto suficiente para agir. O Command Center faz o mesmo.

**Confiança progressiva:** O consultor ganha confiança com o tempo, à medida que suas recomendações se provam corretas. O Command Center deve ter o mesmo mecanismo: quando uma ação recomendada resulta em impacto positivo, o sistema confirma e registra — construindo confiança ativamente.

---

## CAPÍTULO 10 — COPY RESISTANCE

### Por que ainda estaremos na frente quando um concorrente copiar

Para cada Epic, a análise do que torna nossa posição sustentável mesmo diante de imitação em 6 meses.

---

**EPIC 1 — Performance Intelligence**

Se um concorrente lançar "relatórios de performance para lojistas" em 6 meses, ainda estaremos na frente porque:

- Nosso histórico de performance por lojista tem 12 meses a mais que o deles. "Como estou hoje" sem "como estive no mesmo período do ano passado" é um relatório sem contexto.
- Nossa base de comparação é o mercado real da Tríplice Fronteira — construída com dados de dezenas ou centenas de lojistas reais. O concorrente entrante não tem essa base de comparação, porque não tem os outros lojistas.
- Nosso Merchant Score foi calibrado ao longo de Releases — tem legitimidade estabelecida com os lojistas que já estão na plataforma. Um score novo, de um sistema novo, não tem essa credibilidade imediata.

---

**EPIC 2 — Opportunity Loss Detector**

Se um concorrente lançar "diagnóstico de oportunidades perdidas" em 6 meses, ainda estaremos na frente porque:

- Para identificar "você perdeu essa venda porque estava 15% acima da média da categoria", é necessário ter a média da categoria — que requer dados de todos os lojistas da categoria ao longo de um período. Sem esse histórico de mercado, o diagnóstico é genérico e inútil.
- O contexto é local: o comportamento de compradores brasileiros visitando Ciudad del Este, os padrões de sazonalidade da fronteira, as categorias de produto específicas do mercado paraguaio — esses dados não existem em nenhum sistema genérico.
- A precisão do diagnóstico cresce com o histórico. Depois de 12 meses acumulando dados, nosso diagnóstico será muito mais preciso do que o de um sistema com 3 meses de dados. Essa vantagem de precisão cresce com o tempo, não diminui.

---

**EPIC 3 — Growth Recommendations Engine**

Se um concorrente lançar "recomendações de crescimento para lojistas" em 6 meses, ainda estaremos na frente porque:

- Nossas recomendações são calibradas por histórico de aceitação e resultado: sabemos quais recomendações funcionam para quais tipos de lojista, porque monitoramos o resultado de cada ação tomada. Um sistema novo não tem essa calibração.
- O dado de demanda de compradores que informa as recomendações ("existe alta demanda por categoria X que nenhum lojista está atendendo") vem do comportamento de compradores reais na plataforma — um concorrente sem essa massa de compradores não tem esse dado.
- A confiança do lojista nas recomendações é construída com o tempo. "O Command Center me recomendou ajustar o preço do produto X há 3 meses e eu vi os resultados" é uma prova social que um sistema novo não pode fabricar.

---

**EPIC 4 — Catalog Intelligence**

Se um concorrente lançar "diagnóstico de catálogo" em 6 meses, ainda estaremos na frente porque:

- Nosso diagnóstico compara o catálogo do lojista com o benchmark de qualidade da categoria — que requer dados de todos os catálogos da categoria para definir o benchmark. Sem os lojistas, sem o benchmark.
- O catálogo normalizado do ParaguAI foi construído ao longo de múltiplas Releases e tem qualidade de dados que leva tempo para replicar. O diagnóstico de um sistema sem catálogo normalizado é superficial.
- O histórico de evolução de qualidade do catálogo por lojista — que permite mostrar "sua qualidade melhorou 23% nos últimos 6 meses" — só existe se você tinha o dado 6 meses atrás. Um sistema novo começa do zero.

---

**EPIC 5 — Daily Intelligence Brief**

Se um concorrente lançar "briefing diário para lojistas" em 6 meses, ainda estaremos na frente porque:

- A qualidade do Brief depende da qualidade e profundidade dos dados que o alimentam: histórico de performance, benchmarking de mercado, padrões de demanda, calibração de recomendações. Todas essas fontes dependem de histórico e massa de participantes que um sistema novo não tem.
- O Brief ganha precisão com o tempo — ele aprende o perfil do lojista ao longo de meses de interações. Um Brief de um sistema novo é genérico. O nosso, depois de 6 meses, é personalizado.
- A confiança no Brief é o fator mais importante e mais difícil de replicar. Um lojista que confia no Brief porque teve 20 recomendações corretas consecutivas não muda para um sistema novo que ainda não provou nada.

### O princípio geral da Copy Resistance

A resposta para cada Epic não envolve tecnologia porque tecnologia é replicável. Envolve:
- **Histórico:** dados acumulados que não existiam antes de o ciclo começar
- **Dados:** informações de mercado que só existem se você tem a massa de participantes
- **Contexto:** inteligência específica da Tríplice Fronteira que não pode ser generalizada
- **Inteligência:** calibração de recomendações que depende de ciclos de feedback ao longo do tempo
- **Ativos acumulados:** confiança, histórico e rotinas operacionais que pertencem ao lojista dentro da plataforma

---

## CAPÍTULO 11 — RELEASE SCORECARD

### Critérios de Readiness

O Release 1.6 somente poderá **iniciar** se todos os critérios abaixo forem atendidos.

---

**✓ Valor para lojistas**

- [ ] Cada Epic responde a uma pergunta real que um lojista da fronteira faria
- [ ] Cada funcionalidade passou pelas 5 perguntas obrigatórias do PRINCÍPIO MAIS IMPORTANTE
- [ ] Existe hipótese clara e verificável de que as funcionalidades aumentarão vendas ou reduzirão tempo/custo operacional do lojista
- [ ] O Command Center tem identidade clara: não é um dashboard, é uma ferramenta de decisão

---

**✓ Monetização**

- [ ] Cada Epic tem clareza sobre o que vai para o plano gratuito e o que vai para o Premium
- [ ] Existe pelo menos um recurso por Epic que cria gatilho natural de upgrade
- [ ] Os recursos de retenção estão identificados e são consequência do uso, não de lock-in artificial
- [ ] O modelo segue o princípio Foundation: a diferença entre planos é de capacidade e inteligência, nunca de acesso fundamental

---

**✓ Assets**

- [ ] Cada Epic fortalece pelo menos um Asset permanente identificado no Capítulo 6
- [ ] Nenhum Epic cria funcionalidade que não produz dados reutilizáveis por outros módulos
- [ ] O Asset "Rede de dados comportamentais de lojistas" foi planejado para coletar dados desde o primeiro dia
- [ ] Merchant OS, Merchant Score e Histórico de Preços têm crescimento mensurável projetado neste Release

---

**✓ Moats**

- [ ] Cada Epic tem resposta clara à pergunta "se um concorrente copiar em 6 meses, por que ainda estaremos na frente?"
- [ ] A resposta a essa pergunta envolve dados, histórico, contexto ou ativos acumulados — nunca tecnologia
- [ ] O custo de troca do lojista aumenta com cada mês de uso do Command Center
- [ ] O efeito de rede de dados B2B foi planejado como consequência arquitetural, não como feature opcional

---

**✓ Brain**

- [ ] Os 16 novos eventos cognitivos do Capítulo 8 foram planejados para registro desde o início
- [ ] As 5 novas relações do Knowledge Graph foram mapeadas e são deriváveis dos eventos
- [ ] O Brain tem pelo menos 5 perguntas de negócio que conseguirá responder ao final do Release
- [ ] Nenhuma funcionalidade do Release deixa de gerar eventos cognitivos

---

**✓ Escalabilidade**

- [ ] As queries de benchmarking de mercado são planejadas como O(1) em relação ao volume de dados, não O(N)
- [ ] O sistema de recomendação é projetado para funcionar com 10 lojistas e com 10.000 lojistas
- [ ] O Daily Brief pode ser gerado de forma assíncrona, não bloqueando a sessão do lojista
- [ ] O diagnóstico de catálogo pode processar catálogos de 10 produtos e de 10.000 produtos sem degradação

---

**✓ Simplicidade**

- [ ] Cada Epic tem no máximo uma pergunta central que responde
- [ ] O Command Center tem no máximo 5 seções primárias (os 5 Epics)
- [ ] O Daily Brief tem no máximo 5 ações priorizadas por sessão
- [ ] Nenhuma funcionalidade foi incluída porque "parece útil" — cada uma passou pelos 5 filtros obrigatórios

---

**✓ Foundation**

- [ ] O Blueprint foi lido integralmente por quem vai implementar o Release
- [ ] Cada decisão arquitetural será documentada como ADR no momento da decisão
- [ ] Nenhuma implementação começa antes de todos os critérios deste Scorecard estarem atendidos
- [ ] O Release tem Definition of Ready e Definition of Done derivados da RELEASE_STRATEGY.md

---

**✓ Engineering**

- [ ] A arquitetura respeita o fluxo de camadas: types → services → hooks → components → app
- [ ] Services não lançam exceção — retornam valores seguros com logging estruturado
- [ ] Todas as novas funcionalidades têm estado vazio, estado de carregamento e estado de erro
- [ ] Novos dados gerados têm rastreabilidade: quem gerou, quando, com qual origem

---

**✓ Product Principles**

- [ ] A linguagem do Command Center usa termos de negócio do lojista, não termos de tecnologia
- [ ] Nenhuma funcionalidade maximiza tempo de permanência artificialmente — o objetivo é decisão rápida e correta
- [ ] O Daily Brief respeita o princípio de velocidade de decisão: entrega 3 a 5 ações, não 40 métricas
- [ ] Transparência algorítmica: quando o sistema recomenda algo, o lojista pode ver por quê

---

## CAPÍTULO 12 — ROADMAP INTERNO

### Sequência dos Epics e justificativa

A ordem de implementação não é arbitrária. Segue o princípio de compounding: cada Epic entrega valor imediato E deixa fundação para o próximo.

---

**FASE 1 — Foundation de Inteligência (Pré-Epics)**

*Antes de qualquer Epic:*

O Release 1.6 depende de dados de performance que precisam começar a ser coletados o quanto antes. Antes de implementar qualquer Epic, é necessário garantir que:
- Eventos de performance (impressões, comparações, cliques para contato) estão sendo registrados por produto e por lojista
- O benchmarking de preço por categoria está sendo calculado e armazenado periodicamente
- O Score de saúde de catálogo por produto tem critérios definidos e está sendo calculado

**Por que primeiro:** Sem esses dados, os Epics 1, 2 e 4 não têm nada para exibir. Implementar a UI antes dos dados é construir sobre fundação vazia. Dados primeiro, sempre.

**Risco:** os dados de performance podem exigir instrumentação que não existe hoje. Esse é o risco técnico mais importante do Release — deve ser o primeiro a ser investigado.

---

**FASE 2 — EPIC 1: Performance Intelligence**

*"Como está meu negócio?"*

**Por que segundo:** é o Epic mais direto e com menor risco de dados. Usa dados que já existem (Merchant Score, eventos do Brain) combinados com a nova instrumentação de performance. Entrega valor imediato com menor complexidade de implementação.

**Dependência:** dados de performance (Fase 1).

**O que desbloqueia:** a visão de performance com contexto de mercado (comparação com a categoria) é a justificativa mais natural para upgrade de plano — o lojista vê seus dados mas não vê onde está em relação aos concorrentes. Cria o gatilho para EPIC 2 e EPIC 3.

**Ganho rápido:** lojistas passam a ter clareza sobre o estado atual do negócio — algo que não existia antes. Mesmo sem benchmarking, a visão consolidada de performance é imediatamente valioso.

---

**FASE 3 — EPIC 4: Catalog Intelligence**

*"Como melhorar meu catálogo?"*

**Por que terceiro (antes dos Epics 2 e 3):** o diagnóstico de catálogo usa dados que já existem (o catálogo em si, o Merchant Score, os critérios de qualidade) e não depende de benchmarking de mercado complexo. Pode ser implementado com menor dependência de dados externos.

**Dependência:** critérios de qualidade de catálogo por categoria (podem ser definidos internamente, sem necessitar de dados externos).

**O que desbloqueia:** melhora a qualidade do catálogo antes de amplificar visibilidade. É a fundação correta — não adianta gerar mais tráfego para produtos com dados ruins. Catálogo de qualidade primeiro, crescimento depois.

**Ganho rápido:** lojistas com problemas óbvios de catálogo (imagens ausentes, preços desatualizados) recebem diagnóstico imediato e podem agir. O impacto no Merchant Score é rápido e mensurável — retenção imediata.

---

**FASE 4 — EPIC 2: Opportunity Loss Detector**

*"Onde estou perdendo dinheiro?"*

**Por que quarto:** depende de dados de performance (Fase 1) e de benchmarking de preço por categoria. Requer mais acumulação de dados para ser preciso — implementado antes do Epic 3 porque é o diagnóstico (problema) que antecede a recomendação (solução).

**Dependência:** dados de performance (Fase 1), benchmarking de preço por categoria.

**O que desbloqueia:** o lojista que vê onde está perdendo dinheiro já está motivado a buscar como vender mais. O Epic 2 cria a demanda natural para o Epic 3.

**Ganho rápido:** mesmo com poucos meses de dados, a identificação de produtos com preço fora do mercado é imediatamente acionável. O lojista não precisa esperar 12 meses de histórico para ver que está 25% acima da média do mercado naquele produto.

---

**FASE 5 — EPIC 3: Growth Recommendations Engine**

*"Como vender mais?"*

**Por que quinto:** é o Epic mais dependente de dados e de calibração. Para que as recomendações sejam úteis (e não genéricas), precisa de:
- Histórico de performance por lojista (Fase 1)
- Análise de oportunidade de mercado (dados de demanda vs. oferta)
- Calibração mínima de padrões de recomendação (aprende com os primeiros meses de uso dos Epics anteriores)

**Dependência:** todos os Epics anteriores, dados de demanda de compradores, histórico mínimo de comportamento de lojistas no Command Center.

**O que desbloqueia:** o Epic mais poderoso em termos de crescimento do lojista. Quando bem calibrado, é o motor principal de retenção e upgrade.

**Ganho rápido:** mesmo sem calibração completa, identificar "produtos com alta demanda na sua categoria que você não tem no catálogo" é imediatamente acionável e de alto impacto.

---

**FASE 6 — EPIC 5: Daily Intelligence Brief**

*"O que devo fazer hoje?"*

**Por que sexto (último):** é a síntese de todos os Epics anteriores. Só pode ser implementado quando os outros quatro estão funcionando — porque o Brief consolida inteligência de performance, diagnóstico de catálogo, oportunidades perdidas e recomendações de crescimento em um único ponto de entrada.

**Dependência:** todos os quatro Epics anteriores funcionando com qualidade suficiente para gerar ações prioritárias.

**O que desbloqueia:** o momento em que o Command Center passa de "ferramenta que o lojista usa" para "parceiro que o lojista consulta todo dia". É o ponto de transformação da experiência.

**Ganho rápido:** mesmo com a implementação inicial, o Brief pode entregar 2 a 3 ações de alta precisão baseadas nos Epics já implementados. A precisão aumenta com o tempo — mas o hábito começa a se formar desde o primeiro Brief.

---

### Dependências críticas

| Dependência | Bloqueia | Risco |
|---|---|---|
| Instrumentação de eventos de performance | Epics 1, 2, 5 | Alto — pode requerer mudanças de arquitetura |
| Cálculo de benchmarking de preço por categoria | Epics 2, 3, 5 | Médio — dado existe, requer agregação |
| Definição de critérios de qualidade de catálogo | Epic 4 | Baixo — critérios podem ser definidos internamente |
| Acumulação mínima de dados (30-60 dias) | Epics 2, 3, 5 (com qualidade) | Médio — solucionável com valores mínimos na fase inicial |
| Calibração de recomendações | Epic 3 (com qualidade), Epic 5 | Baixo — melhora com o tempo, pode começar com regras simples |

### Riscos identificados

**Risco 1 (Alto): Ausência de dados de performance em granularidade necessária**

Se os eventos de performance (impressões, comparações por produto e por lojista) não existem hoje no sistema, o prazo do Release precisa incluir um período de coleta antes de qualquer Epic ser exibido ao lojista. Apresentar um Command Center vazio é pior do que não apresentar nenhum.

*Mitigação:* validar, antes de qualquer implementação, quais dados de performance já existem no sistema e quais precisam ser instrumentados.

**Risco 2 (Médio): Recomendações imprecisas na fase inicial**

Com poucos meses de dados, as recomendações do Epic 3 podem ser genéricas. Recomendações genéricas não geram confiança — e confiança é o produto mais importante do Command Center.

*Mitigação:* na fase inicial, priorizar recomendações de alta precisão e baixo risco de erro (como diagnóstico de dados incompletos) sobre recomendações que requerem mais calibração (como predição de demanda). Qualidade antes de volume de recomendações.

**Risco 3 (Baixo): Sobrecarga de informação no Command Center**

Se cada Epic gerar sua própria seção com métricas, o Command Center pode se tornar o dashboard sobrecarregado que o nome justamente rejeita.

*Mitigação:* o Epic 5 (Daily Brief) deve ser o ponto de entrada, não as seções individuais. O lojista começa pelo Brief e aprofunda apenas o que o Brief indica. As seções dos Epics 1-4 são o detalhe; o Brief é a síntese.

---

## QUALITY GATE

Este Blueprint atende aos critérios do QUALITY GATE declarado na missão:

✓ **Fortalece o ParaguAI como empresa** — cada Epic aumenta retenção, upgrade e custo de troca

✓ **Aumenta receita** — o modelo de monetização do Capítulo 4 é claro sobre quais recursos pertencem a cada plano e por que o lojista pagará mais

✓ **Fortalece Assets** — seis Assets foram identificados e seu crescimento foi detalhado no Capítulo 6

✓ **Fortalece Moats** — cinco Moats foram analisados com mecanismos específicos no Capítulo 7

✓ **Respeita integralmente a Foundation** — o Blueprint foi derivado dos 8 documentos permanentes da Foundation Empresarial; cada princípio da AI_CONSTITUTION, NORTH_STAR e BUSINESS_MODEL foi aplicado

✓ **Serve como guia para toda a implementação** — os Capítulos 5 a 12 fornecem especificação suficiente para derivar todas as decisões de implementação

✓ **Permanece válido durante muitos anos** — os princípios, a lógica de monetização, a análise de moat e a arquitetura cognitiva são independentes de tecnologia específica

✓ **É completamente independente de tecnologia específica** — nenhuma tecnologia, linguagem, framework, API ou biblioteca foi mencionada; o Blueprint descreve o que o sistema deve fazer, não como deve fazer

---

## DECLARAÇÃO FINAL

O Release 1.6 representa a transição mais estratégica da história do ParaguAI.

Não é uma transição de tamanho — não adicionamos mais lojas, mais produtos ou mais usuários.

É uma transição de profundidade — transformamos dados que já existem em inteligência que gera resultado, e inteligência em relacionamento, e relacionamento em indispensabilidade.

Quando o Release 1.6 estiver completo, o ParaguAI não será mais uma plataforma que lojistas usam para existir no digital.

Será uma plataforma que lojistas precisam para crescer.

Essa diferença — de ferramenta necessária para parceiro indispensável — é o que separa plataformas que sobrevivem de plataformas que definem mercados.

O Release 1.6 é o passo que cruza essa linha.

---

## Histórico de revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | 2026-06-30 | Daniel Gonçalves (CTO) | Versão inicial — Blueprint completo do Release 1.6, Merchant Growth Platform. 12 capítulos. Derivado dos 8 documentos Foundation + PROJECT_STATUS + contexto completo do Release 1.5. |

---

*Este documento não deve ser alterado durante a implementação. Mudanças de escopo requerem nova versão do Blueprint aprovada pelo CTO antes de qualquer implementação derivada da mudança.*
