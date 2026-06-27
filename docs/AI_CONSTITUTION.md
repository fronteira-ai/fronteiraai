# AI_CONSTITUTION.md
# Constituição do ParaguAI

**Versão**: 1.1  
**Criado**: 2026-06-27  
**Revisado**: 2026-06-27  
**Status**: Permanente — não deprecar; apenas estender com revisões versionadas  
**Prioridade**: Este é o primeiro documento a ser lido antes de qualquer tarefa de desenvolvimento.

---

## Preâmbulo

Este documento não descreve o que o ParaguAI pretende ser. Descreve o que o ParaguAI **é** — seus princípios fundamentais, filosofia de engenharia, modelo de negócio e regras permanentes — sintetizados a partir de toda a história de decisões do projeto, do modelo de domínio, da arquitetura real e da visão de longo prazo.

Tecnologias mudam. Plataformas mudam. Mercados mudam. Os princípios aqui registrados devem permanecer válidos independentemente dessas mudanças. Quando um princípio parecer obsoleto, o momento certo é revisá-lo formalmente e versionar, não ignorá-lo silenciosamente.

O ParaguAI não terá um dia em que estará "pronto". É um organismo digital que aprende, melhora e expande continuamente. Esta Constituição é o sistema imunológico desse organismo — o conjunto de princípios que garante que o crescimento não destrua o que nos faz valiosos.

Todo desenvolvedor humano ou sistema de IA que trabalhar neste projeto deve ler este documento antes de iniciar qualquer tarefa.

---

## I. Identidade

### Quem somos

O ParaguAI é a **inteligência operacional da Tríplice Fronteira**.

Compras são o ponto de entrada. Mas o que construímos é mais profundo: uma camada de conhecimento estruturado sobre o maior polo de comércio informal da América do Sul — seus preços, lojas, produtos, padrões, sazonalidade e comportamento de compradores. Uma infraestrutura digital que não existia e que, uma vez construída, torna-se extremamente difícil de replicar.

Somos uma **plataforma**, não um site de comparação. A diferença é estrutural: um site de comparação agrega dados estáticos. Uma plataforma cria valor para múltiplos lados simultaneamente, gera retornos crescentes de escala a cada novo participante e acumula conhecimento que se transforma em vantagem competitiva permanente.

### O que estamos construindo

Uma infraestrutura de confiança e inteligência para um mercado com alta fragmentação, baixa transparência de preços, pouca digitalização de lojas e ausência histórica de dados estruturados.

Estamos construindo:

- A maior base de dados de produtos, preços e lojas da Tríplice Fronteira
- Um sistema de confiança e reputação verificável para lojas locais
- Ferramentas de crescimento para lojistas: visibilidade, análise, automação (Merchant OS)
- Inteligência para compradores: comparação, histórico de preços, alertas, recomendações
- Infraestrutura turística, comercial e de serviços para a região
- Uma rede que se torna mais valiosa a cada novo participante, de forma não-linear

### O que NÃO somos

Não somos um e-commerce. Não processamos pagamentos, não guardamos estoque, não fazemos logística. Somos a camada de descoberta, decisão e inteligência — não a camada de transação.

Não somos um agregador passivo. Processamos, validamos, normalizamos e enriquecemos cada dado que entra na plataforma.

Não somos um produto para o Paraguai inteiro desde o primeiro dia. Começamos em Ciudad del Este, onde a concentração de lojas e o volume de tráfego de compradores brasileiros criam a densidade necessária para o efeito de rede ignitar.

Não somos rápidos às custas de corretos. Velocidade sem fundação gera retrabalho exponencial.

Não somos um conjunto de funcionalidades. Somos um organismo que aprende. Cada dado coletado, cada interação registrada, cada decisão de compra assistida nos torna mais inteligentes do que éramos ontem.

---

## II. Missão

**O ParaguAI existe para eliminar a assimetria de informação que separa compradores de boas decisões e lojistas de crescimento real.**

A Tríplice Fronteira movimenta bilhões de dólares por ano. Compradores atravessam fronteiras sem saber qual loja tem o melhor preço, qual tem estoque real, qual é confiável. Lojistas têm produtos de qualidade mas sem visibilidade digital estruturada. Esse gap de informação é o problema que resolvemos — com dados, inteligência e automação.

---

## III. Visão 2030

Ser a principal infraestrutura digital de inteligência comercial da América do Sul, com raiz no Paraguai.

Em 2030:

- Qualquer comprador que planeje uma viagem a Ciudad del Este, uma compra online de loja paraguaia ou uma comparação de preços na fronteira consulta o ParaguAI antes de decidir.
- Qualquer loja no Paraguai que queira crescimento digital tem o ParaguAI como canal de distribuição, análise e automação.
- Turistas e viajantes de negócio usam o ParaguAI para planejar roteiros de compra, entender disponibilidade de produtos e reservar experiências comerciais antes de cruzar a fronteira.
- O ParaguAI é a referência para dados de mercado, preços e tendências de consumo da Tríplice Fronteira — consultado por jornalistas, pesquisadores, órgãos de turismo e gestores comerciais.
- A plataforma opera em todos os principais mercados do Paraguai e inicia expansão para Brasil e Argentina.
- A API pública do ParaguAI permite que terceiros construam produtos e serviços sobre a infraestrutura de dados que acumulamos.

---

## IV. North Star

**O número de decisões melhores que o ParaguAI tornou possíveis.**

Uma decisão melhor é aquela em que o comprador encontrou o produto certo, no preço certo, da loja certa — com confiança e contexto histórico suficiente para agir sem arrependimento. Não é simplesmente o menor preço. É a melhor decisão considerando preço, disponibilidade, confiabilidade da loja, histórico de variação e timing.

Uma decisão melhor para o lojista é aquela baseada em dados reais de mercado — não em intuição. Qual produto tem maior procura na sua categoria? Em qual período os preços dos concorrentes caem? Qual é o perfil real de quem visita sua loja?

Toda métrica técnica — uptime, latência, cobertura de catálogo, número de merchants — é um insumo para esse número. Nenhuma métrica técnica é o objetivo em si.

---

## V. Filosofia

### Como pensamos

**Dados reais antes de suposições.**  
Toda decisão de produto, engenharia e negócio começa com o estado real — do banco de dados, do código, do mercado. Documentação aspiracional que diverge do estado real é mais perigosa do que a ausência de documentação.

**Fundação antes de velocidade.**  
Uma funcionalidade construída sobre premissas incorretas multiplica o retrabalho. O custo de corrigir a fundação antes de construir é sempre menor do que o custo de reconstruir depois. Quando uma premissa incorreta é identificada, a correção dela precede qualquer nova funcionalidade.

**Um dono por decisão.**  
Cada dado tem uma fonte única de verdade. Cada mutação tem um caminho único de escrita. Duplicação de lógica não é velocidade — é débito técnico com juros.

**Degradação graciosa, sempre.**  
Nenhum ponto de falha quebra toda a experiência. Quando um dado não existe, o sistema retorna vazio com segurança. Quando um serviço externo falha, a plataforma continua funcionando com o que tem.

**Aprovação antes de destruição.**  
Ações irreversíveis — alterar schema, escrever em produção, publicar externamente — requerem aprovação explícita. A reversibilidade de uma ação determina a autonomia permitida para tomá-la.

**Estado honesto, sempre.**  
Um sistema que reporta sucesso sem verificar o resultado é pior do que um sistema que reporta falha. Falsos positivos são mais perigosos do que falsos negativos porque constroem confiança em premissas incorretas.

**Toda funcionalidade nova deve gerar conhecimento.**  
Nenhuma feature é adicionada apenas para resolver um problema pontual. Toda funcionalidade deve produzir dados que alimentam inteligência futura. Se uma feature não produz sinal útil, questionar se é a feature certa.

### O ParaguAI como organismo vivo

O ParaguAI nunca estará "pronto". Não existe versão final. Não existe estado de equilíbrio.

A plataforma aprende com cada busca. Melhora com cada loja que entra. Fica mais precisa com cada mudança de preço capturada. Torna-se mais útil com cada decisão de compra que assiste.

Esse crescimento contínuo não é um objetivo futuro — é uma propriedade do design presente. Cada componente construído hoje deve ser pensado não apenas para o que resolve agora, mas para o que alimentará amanhã.

O trabalho humano no ParaguAI é progressivamente estratégico, não operacional. À medida que a plataforma amadurece, as tarefas repetitivas migram para automação e as decisões que restam para humanos são as que exigem julgamento que a máquina ainda não tem. Esse é o modelo de maturidade que guia toda decisão de construção.

### Como tomamos decisões

Toda decisão estrutural é documentada com:
- O que foi decidido
- Por que (contexto real, não filosófico)
- Quais alternativas foram descartadas e por quê
- Qual é a consequência permanente

Uma decisão não documentada é uma decisão que se repetirá, com as mesmas análises e os mesmos erros.

O registro de decisões não é burocracia — é o mecanismo que permite ao projeto crescer sem perder coerência.

---

## VI. Dados

Todo dado que entra na plataforma é um ativo, não uma string.

**Nosso maior patrimônio não será o software. Será o conhecimento acumulado.**

Qualquer concorrente com recursos suficientes pode reproduzir nossa interface, replicar nosso pipeline e copiar nossa arquitetura. Nenhum concorrente pode comprar ou reproduzir cinco anos de histórico de preços, comportamento de compradores brasileiros na fronteira, padrões de sazonalidade por categoria e reputação verificável de centenas de lojas. Esses dados são o moat real do ParaguAI.

### Princípios de dados

**Qualidade antes de volume.**  
Um catálogo de 1.000 produtos com preços corretos, imagens reais e estoque preciso vale mais do que 100.000 produtos com dados inconsistentes. Dados incorretos destroem confiança; dados ausentes apenas limitam cobertura.

**Rastreabilidade obrigatória.**  
Todo dado que muda deve deixar rastro: quem mudou, quando, qual era o valor anterior, de que origem veio. Isso não é opcional — é a infraestrutura mínima para auditar erros, detectar fraude e construir histórico de preços confiável.

**Preço pertence à oferta, não ao produto.**  
Um produto é único e não tem preço intrínseco. Uma oferta é a combinação produto + loja + preço + condições, em um momento específico. Esta distinção não é uma convenção de código — é a realidade do mercado que modelamos. Nenhuma funcionalidade futura viola este princípio.

**Normalização antes de persistência.**  
Dados de origens diversas chegam em formatos diferentes. Todo dado passa por validação, normalização e deduplicação antes de chegar ao banco. O banco armazena dados limpos, não dados brutos.

**Dados geram inteligência.**  
Cada produto indexado, cada oferta registrada, cada mudança de preço capturada e cada interação do usuário é um sinal que alimenta modelos de recomendação, detecção de oportunidade e ranking de lojas. Dados nunca são apenas armazenamento — são o insumo da inteligência da plataforma.

**O banco é a fonte de verdade.**  
Tipos de dado, contratos de API e documentação devem refletir o banco real. Uma divergência entre o que o código afirma e o que o banco armazena é um bug silencioso esperando por dados reais para se manifestar.

**Dados são acumulativos, não substituíveis.**  
Diferente do código, que pode ser reescrito, dados históricos não podem ser recriados retroativamente. Um ano de histórico de preços não tem equivalente. Isso significa que a decisão de começar a coletar um tipo de dado tem impacto crescente ao longo do tempo — a melhor hora para começar sempre foi no passado, a segunda melhor é agora.

---

## VII. Ativos

**O ParaguAI não desenvolve funcionalidades. Desenvolve ativos.**

A distinção não é semântica. Uma funcionalidade resolve um problema. Um ativo resolve um problema e, simultaneamente, torna-se insumo para dezenas de outros módulos, hoje e no futuro.

### O que são ativos no ParaguAI

**Merchant Score** — um número (0-100) que sintetiza a qualidade de um lojista. Usado no ranking de lojas, no dashboard do merchant, nas páginas públicas, nas recomendações de compradores e, futuramente, em modelos de crédito e priorização de exibição.

**Catálogo normalizado** — cada produto, marca e categoria com slug único, imagem, especificações e histórico. A fundação de toda comparação, busca semântica e recomendação.

**Histórico de preços** — séries temporais de preço por oferta. Insumo para alertas, detecção de manipulação, predição de tendência e análise de mercado. Quanto mais tempo acumula, mais valioso se torna.

**Sistema de reputação de lojas** — combinação de score, verificação, avaliações e histórico de comportamento. Substitui a assimetria de informação entre comprador e loja por um sistema de confiança verificável.

**Merchant OS** — as ferramentas de gestão de lojistas (dashboard, importação, analytics, recomendações). Um ativo de retenção: um lojista que usa o Merchant OS para gerir seu catálogo não muda de plataforma facilmente.

**Rede de conectores** — cada conector de loja (Shopping China, Nissei, Cellshop, etc.) é um ativo de aquisição de dados. O custo marginal de adicionar uma nova loja cai com cada conector implementado.

**ParaguAI Brain** — a camada de inteligência que conecta todos os ativos acima. Ver Seção IX.

### O critério de um ativo

Antes de iniciar qualquer implementação, responder: **Este módulo, além de resolver seu problema imediato, produz dados que reutilizaremos em outros módulos?**

Se a resposta for não, reconsiderar o design antes de construir. Funcionalidades descartáveis acumulam; ativos compõem.

---

## VIII. Automação

**Tudo que puder ser automatizado deve ser automatizado.** A plataforma não escala com esforço manual.

### O princípio de automação

Qualquer processo que se repete — importação de catálogos, atualização de preços, geração de recomendações, envio de alertas, validação de dados, recálculo de scores — é um candidato imediato à automação.

O critério de automação não é a frequência da tarefa, mas o custo de não automatizá-la em escala. Uma rede com 1.000 lojas e 10 milhões de produtos não pode depender de nenhuma intervenção humana em operações rotineiras.

**O papel humano é estratégico, não operacional.**  
À medida que a automação avança, o trabalho humano no ParaguAI concentra-se em decisões que exigem julgamento contextual, criatividade ou responsabilidade moral: definição de estratégia, curadoria de casos-limite que a IA não cobre, decisões com impacto irreversível. Toda tarefa operacional que um humano executa repetidamente é uma automação pendente.

Agentes de IA devem progressivamente assumir tarefas de: moderação de dados, resposta a lojistas com padrões conhecidos, detecção de anomalias, publicação de novos produtos, e geração de relatórios periódicos. Não como substituição humana — como ampliação da capacidade humana.

### Requisitos de qualquer automação

Todo processo automatizado deve ser:

- **Idempotente**: executar duas vezes produz o mesmo resultado que executar uma.
- **Rastreável**: cada execução gera relatório com entradas, saídas, erros e métricas.
- **Reversível quando possível**: o estado anterior deve ser recuperável.
- **Dry-run por padrão**: nenhuma automação escreve em produção sem modo de simulação disponível e executado primeiro.
- **Falha explícita**: erros são reportados com clareza, nunca silenciados.

A automação não substitui aprovação para ações de alto impacto. Um sistema que automatiza sem limite de escopo é um sistema que cria risco sem controle.

---

## IX. Inteligência Artificial

A IA não é uma feature do ParaguAI — é a direção de todas as features.

**Toda interação deve alimentar IA. Todo dado deve melhorar decisões futuras. Nenhuma funcionalidade é neutra — ou gera conhecimento, ou é um custo sem retorno.**

### Papel atual

Atualmente, a IA do ParaguAI existe como infraestrutura: catálogo normalizado, histórico de preços rastreado, ranking de ofertas calculado por score composto, reputação de lojas consolidada em Merchant Score. Esses dados são o combustível da inteligência futura, não um produto em si.

### Papel futuro

A IA do ParaguAI deve, progressivamente, responder a perguntas que nenhum humano consegue responder manualmente:

- "Qual é o melhor momento para comprar este produto, baseado em 18 meses de histórico desta categoria?"
- "Esta loja tem padrão histórico de inflacionar preços 30 dias antes de feriados comerciais?"
- "Qual loja tem a menor variação de preço ao longo do tempo, mesmo que não tenha o menor preço hoje?"
- "O que comprar nesta viagem, dado meu orçamento, minhas compras anteriores e o que está com preço abaixo da média desta semana?"
- "Qual categoria de produto tem maior demanda de compradores brasileiros neste período do ano?"

### Como cada módulo alimenta inteligência

**Catálogo de produtos** — base de entidades normalizadas. Sem catálogo limpo, não há comparação confiável.

**Histórico de preços** — séries temporais que alimentam detecção de padrão e predição. O preço de hoje sem contexto histórico não tem valor analítico.

**Merchant Score** — reputação calculada a partir de comportamento observável: volume, atualização, completude, verificação. É o primeiro modelo de ranking do ParaguAI e o precursor de modelos de recomendação B2B.

**Interações de compradores** — buscas, cliques, comparações, favoritos, alertas. Cada ação é um sinal de intenção que melhora as recomendações futuras. Cada busca que não encontra resultado é um dado de gap de catálogo.

**Dados de lojistas** — importações, plano, qualidade do catálogo, frequência de atualização. Alimentam segmentação, recomendações B2B e modelos de churn prevention.

**Padrões turísticos** — períodos de alta de compradores brasileiros, categorias com pico sazonal, perfil de intenção de compra por período do ano. Alimentam tanto o lado do comprador (quando ir, o que comprar) quanto o do lojista (quando e como se preparar).

### ParaguAI Brain

O ParaguAI Brain é a camada de inteligência central que conecta todos esses ativos. Não é um produto separado — é o resultado arquitetural de conectar catálogo, histórico, reputação, comportamento e modelos de linguagem em um sistema coeso.

O Brain não é apenas um chatbot. É o sistema nervoso central da plataforma: interpreta dados, gera insights, responde perguntas, detecta anomalias, personaliza experiências e progressivamente reduz a necessidade de intervenção humana em operações rotineiras.

O Brain deve:
- Entender linguagem natural de compradores brasileiros e paraguaios, com contexto local real
- Contextualizar produtos dentro de categorias, marcas, faixas de preço históricas e padrões sazonais
- Personalizar recomendações com base no histórico do usuário, não em preferências declaradas
- Detectar anomalias de preço: inflação artificial, fraude, divergência de catálogo, outliers estatísticos
- Responder perguntas sobre o mercado com dados próprios, não dados genéricos de terceiros
- Conectar demanda de compradores com oferta de lojistas de forma proativa — antes que o comprador saiba que precisa da conexão
- Sugerir ações de crescimento para lojistas baseadas em dados reais de comportamento de compradores em sua categoria

**A qualidade da inteligência é diretamente proporcional à qualidade dos dados que a alimentam.** O Brain não substitui o catálogo, o histórico e o ranking — depende completamente deles. Investir em dados é investir em inteligência.

O Brain não terá uma data de lançamento. Evoluirá continuamente, com cada novo módulo de dados ampliando sua capacidade. O critério de evolução não é a sofisticação do modelo — é a melhora mensurável nas decisões que assiste.

---

## X. Efeito de Rede

O efeito de rede é o principal ativo estratégico do ParaguAI. Não o código. Não a interface. Não os conectores. A rede que se autoperpetua.

### O Flywheel

```
Mais lojas cadastradas
        ↓
Mais produtos e ofertas
        ↓
Mais compradores atraídos
        ↓
Mais dados de comportamento
        ↓
IA mais precisa e relevante
        ↓
Experiência melhor para todos
        ↓
Mais valor percebido
        ↓
Mais lojas querem estar presentes
        ↓
(volta ao início, em escala maior)
```

Cada volta desse ciclo é mais rápida e poderosa que a anterior. Este é o mecanismo pelo qual o ParaguAI se torna progressivamente mais difícil de competir — não porque a tecnologia fica mais complexa, mas porque a rede fica mais densa.

### Por que o efeito de rede do ParaguAI é defensável

A maioria das plataformas de comparação de preços tem efeito de rede fraco — o usuário vai à plataforma com maior cobertura, independente da história. O ParaguAI constrói camadas adicionais de defensabilidade:

**Dados históricos acumulados** — nenhum entrante tem acesso ao histórico de preços que acumulamos. Um ano de dados vale mais que um. Cinco anos valem exponencialmente mais.

**Confiança de lojistas** — um lojista que integra seu catálogo, recebe análises, monitora sua reputação e usa o Merchant OS tem custo de troca alto. Não é locked-in por contrato — é locked-in por valor real.

**Inteligência contextual** — o Brain é treinado com dados locais específicos da Tríplice Fronteira. Não é replicável com dados genéricos.

**Reputação verificável** — o sistema de verificação de lojas cria uma marca de confiança que novos entrantes precisam de anos para construir.

### Implicações para o produto

O efeito de rede define a ordem de prioridade de desenvolvimento:

1. **Cobertura de catálogo** é mais urgente do que profundidade de feature. Um comprador que não encontra o produto que procura vai embora — e talvez não volte.
2. **Retenção de lojistas** é mais valiosa do que aquisição. Um lojista que sai leva seu catálogo e impacta negativamente a cobertura.
3. **Qualidade de dados** é mais importante que velocidade de indexação. Um produto com preço errado quebra a confiança de ambos os lados.
4. **Densidade local** precede expansão geográfica. Ciudad del Este com 200 lojas indexadas é mais valioso que Ciudad del Este + Assunção com 50 cada.

---

## XI. Engenharia

### Princípios permanentes de arquitetura

**Uma camada, uma responsabilidade.**  
O fluxo de dados é unidirecional e estrito: tipos definem contratos, services encapsulam acesso a dados, componentes apresentam. Nenhuma camada acessa a próxima sem passar pela intermediária. Componentes nunca consultam bancos de dados diretamente.

**Services nunca lançam exceção.**  
Toda função que consulta uma fonte externa retorna um valor seguro — vazio ou nulo — em caso de falha, loga o erro e segue. O sistema nunca quebra por erro de dado; apenas degrada com segurança.

**Configuração centralizada em um único ponto.**  
Variáveis de ambiente, constantes de configuração, credenciais — cada um tem um único arquivo de origem. Lê-los em múltiplos pontos do código cria divergência; centralizar elimina a divergência por design.

**Acesso mínimo necessário.**  
Dados públicos são servidos com credencial pública. Dados protegidos — dados privados de terceiros, registros com política de acesso restrito — são acessados exclusivamente via credencial privilegiada, em contextos de servidor, nunca expostos ao cliente.

**Schema como contrato, não como detalhe.**  
O banco de dados é a fonte de verdade do modelo de domínio. Os tipos da aplicação devem refletir o schema real. Uma divergência entre tipo e banco é um bug silencioso esperando por dados reais.

**Um caminho único para cada mutação.**  
Toda alteração de dado importante tem exatamente um ponto de entrada no sistema. Múltiplos pontos de escrita para a mesma entidade criam inconsistência inevitável em escala.

### Escalabilidade

**Toda implementação deve funcionar hoje e ser pensada para milhões.**  
Não "escalar prematuramente" não significa ignorar escala — significa não otimizar o que não é gargalo. Mas significa também nunca construir algo que, por design, não possa escalar. A diferença entre uma query O(1) e O(N) é uma decisão de design, não de otimização posterior.

Decisões de design que determinam escalabilidade:

- **Queries ao banco devem ser O(1) em relação ao volume de dados**, não O(N). Agregações, filtros e paginação pertencem ao banco, não à memória da aplicação.
- **Desacoplamento entre aquisição e apresentação.** O pipeline de importação de dados é independente da aplicação de consumo. Um pode evoluir sem bloquear o outro.
- **Idempotência em operações em lote.** Qualquer operação que processa múltiplos itens deve ser segura para reexecução parcial.
- **Automação substituível.** Qualquer conector de dados pode ser substituído sem alterar o pipeline. O contrato de entrada é o que importa, não a implementação.
- **Dados nunca são apagados, apenas desativados.** Registros históricos têm valor crescente. A exclusão permanente é uma exceção que requer justificativa, não o comportamento padrão.

### Qualidade

**O projeto deve sempre compilar, passar typecheck e passar lint.** Essas três verificações são o piso mínimo, não o teto.

**Nenhuma funcionalidade é entregue incompleta.** Uma feature com estado de dados vazio ausente, sem tratamento de erro, sem validação de entrada — é uma feature incompleta, não uma feature entregue.

**Código duplicado é débito técnico imediato.** Quando o mesmo padrão aparece em dois lugares, um é candidato a extração. Quando aparece em três, a extração é obrigatória.

**Placeholders intencionais são reservas, não esquecimentos.** Um arquivo vazio significa trabalho planejado. Antes de assumir que algo está implementado, verificar o conteúdo real do arquivo.

### Documentação

**Documentação de estado real, não de intenção.**  
A diferença entre o que o código faz e o que a documentação diz é a principal fonte de confusão para novos desenvolvedores e sistemas de IA. Documentação aspiracional marcada como tal é aceitável; documentação que confunde intenção com realidade não é.

**Decisões arquiteturais são documentadas no momento da decisão.**  
O contexto que levou a uma decisão evapora rapidamente. Uma decisão arquitetural documentada uma semana depois é uma decisão com metade do valor — o "por quê" é o que mais importa e o que mais se perde.

**Changelog reflete o que mudou de fato, não o que estava planejado.**  
A diferença entre o planejado e o entregue é informação. Esconder essa diferença cria uma visão distorcida do projeto.

### Testes

**Testes contra dados reais sempre que possível.**  
Mocks testam a implementação atual, não o comportamento esperado. Quando o banco muda, mocks passam; testes reais falham — exatamente o comportamento correto.

**Critério de aceitação verificável é obrigatório.**  
Toda funcionalidade crítica tem um conjunto de afirmações verificáveis que, quando todas passam, declaram a funcionalidade completa. O critério de aceitação é o substituto de testes automatizados quando estes não existem — e é inegociável.

**Validação com as credenciais que o sistema real usa.**  
Testar com credenciais privilegiadas quando o sistema usa credenciais públicas é um teste que não testa o que importa.

---

## XII. Produto

### Princípios de UX

**Compradores não devem precisar entender como a plataforma funciona para usá-la.**  
A complexidade da infraestrutura — pipeline de importação, Merchant Score, normalização de dados, políticas de acesso — é invisível para o usuário final.

**Estado vazio é parte da experiência, não uma exceção.**  
Uma busca sem resultado, uma loja sem produtos, um produto sem histórico de preço — cada estado vazio deve comunicar claramente o que falta e como o usuário pode avançar.

**Confiança é construída, não declarada.**  
Badges de verificação, score de reputação, histórico de preços visível — todos são mecanismos que mostram evidência, não afirmam credibilidade. "Loja verificada" sem critério claro não tem valor. "Loja verificada, com score de X, Y produtos ativos e Z% de preços atualizados nos últimos 30 dias" tem.

**Performance é parte do produto.**  
Uma página lenta é uma feature quebrada. Latência percebida, carregamento progressivo e estados de skeleton são decisões de produto, não de engenharia.

### Simplicidade

**Cada feature deve ter o menor número de estados possível.**  
Um filtro com doze opções é um filtro que ninguém usa. Uma página com seis calls-to-action é uma página sem call-to-action nenhum.

**Remover é mais difícil do que adicionar.**  
Antes de adicionar uma nova opção, avaliar se o problema pode ser resolvido melhorando o que já existe.

### Reutilização

**Componentes são construídos para serem reutilizados, não para serem usados uma vez.**  
Um componente que resolve um problema específico demais não é um componente — é código inline com nome. O critério de um componente bem feito: um desenvolvedor novo consegue usá-lo em um contexto diferente sem ler o código fonte.

**Padrões visuais são definidos uma vez e aplicados consistentemente.**  
Cores, espaçamentos, tipografia e estilos de interação são tokens, não repetições. Hardcoding de valores visuais cria divergência que cresce com o projeto.

---

## XIII. Negócio

### Crescimento

O crescimento do ParaguAI é fundamentalmente de efeito de rede — tratado em profundidade na Seção X. As decisões de negócio derivam diretamente desse mecanismo.

A consequência direta: as primeiras 100 lojas e os primeiros 10.000 usuários têm impacto desproporcional. A densidade inicial determina se o efeito de rede ignita ou não. Qualquer decisão de produto ou comercial que comprometa a qualidade da experiência para acelerar a quantidade de lojas ou usuários é uma decisão que destrói o flywheel.

### Monetização

A monetização do ParaguAI é B2B primeiro: lojistas pagam por visibilidade, ferramentas de gestão e dados de inteligência. Compradores não pagam — eles são o lado que gera valor para o lojista.

Princípios permanentes de monetização:

- A experiência do comprador nunca é degradada por monetização. Resultados patrocinados que substituem resultados orgânicos destroem a confiança que é a base da plataforma.
- O plano gratuito para lojistas sempre oferece valor real, não apenas um preview. Um merchant no plano gratuito com loja cadastrada, catálogo ativo e acesso ao ranking já tem motivo para permanecer.
- A diferença entre planos é de capacidade e inteligência, não de acesso fundamental. Um merchant no plano básico acessa seus dados; um merchant no plano avançado acessa seus dados mais os do mercado.
- Cobrança só começa quando o valor entregue é verificável. Planos pagos precedem métricas de resultado — o produto prova valor antes de cobrar por ele.

### Expansão

A expansão geográfica segue densidade, não ambição. Entrar em Assunção antes de Ciudad del Este ter cobertura robusta dilui o flywheel sem criar um novo. Cada mercado novo deve ser tratado como uma ignição de efeito de rede independente — com massa crítica de lojas antes do lançamento público.

---

## XIV. Moat

**Por que o ParaguAI será extremamente difícil de copiar.**

A resposta não é tecnologia. Tecnologia é replicável. O moat real do ParaguAI é composto por cinco camadas que se reforçam mutuamente:

**1. Dados históricos irreplicáveis**  
O histórico de preços, comportamento de compradores, padrões sazonais e reputação de lojas que acumulamos não pode ser comprado nem recriado retroativamente. Cada dia que passa, nossa vantagem em dados cresce. Um concorrente que entrar em 2028 começará sem os dados de 2026 e 2027.

**2. Efeito de rede de dois lados com camada de dados**  
Plataformas de efeito de rede de dois lados já são difíceis de competir. O ParaguAI adiciona uma terceira camada — dados — que se torna mais valiosa com cada interação de ambos os lados. O entrante não apenas precisa de lojas E compradores — precisa também dos dados acumulados que tornam a experiência superior.

**3. Inteligência contextual não-genérica**  
O ParaguAI Brain é treinado com dados específicos da Tríplice Fronteira: preços locais, comportamento de compradores brasileiros, sazonalidade do comércio fronteiriço, catálogos de lojas paraguaias. Modelos de IA genéricos não têm esse contexto. Replicar nossa inteligência requer replicar nossos dados — que são o item 1 desta lista.

**4. Confiança acumulada**  
Confiança não é transferível e não é rápida de construir. Lojas verificadas, scores de reputação com histórico, compradores que tomaram boas decisões baseadas nos nossos dados — esses são ativos de confiança que um concorrente novo não possui. A confiança do comprador na plataforma e do lojista no Merchant OS são barreiras de troca reais.

**5. Custo de troca do lojista**  
Um lojista com catálogo integrado, histórico de importações, análises de performance e reputação pública construída no ParaguAI tem custo de troca alto. Não por lock-in contratual — por custo real de recriar valor. Isso é um moat legítimo e ético: construído sobre valor entregue, não sobre aprisionamento.

**O que não é moat**  
Tecnologia, design, domínio e nome de marca são facilmente replicáveis com recursos. Não contamos com eles como diferenciação competitiva permanente. Contamos com o que não pode ser comprado: dados, rede, confiança, tempo e conhecimento acumulado.

---

## XV. Autonomia

À medida que a plataforma amadurece, mais decisões são tomadas pelo sistema, não por humanos.

### Graus de autonomia

**Automação total, sem revisão humana**:  
Recálculo de scores de reputação, atualização de métricas agregadas, envio de alertas de preço a usuários que os solicitaram, geração de relatórios de performance para merchants, detecção de anomalias de preço, recálculo de rankings.

**Automação com revisão**:  
Publicação de novos produtos oriundos de crawlers (validação automática, publicação após intervalo de revisão configurável), alterações de dados mestre como nome de produto, categoria ou marca vindas de fontes externas, moderação de avaliações com patterns conhecidos.

**Aprovação obrigatória, sempre**:  
Alterações de schema de banco de dados, escrita em produção por processos novos não validados, ações que afetam múltiplos merchants ou usuários de forma irrecuperável, integração com sistemas externos de pagamento ou dados financeiros, exclusão permanente de dados.

O aumento de autonomia do sistema segue o aumento de confiança nos dados e nos modelos. Autonomia não é delegação cega — é confiança construída sobre histórico verificável.

---

## XVI. Regras Permanentes

As seguintes regras não têm exceção contextual. Se uma exceção parecer necessária, a regra deve ser revisada formalmente e versionada — não contornada silenciosamente.

1. **Schema de banco de dados não muda sem aprovação explícita.** Nenhum processo automatizado executa alterações estruturais em produção.

2. **Credenciais privilegiadas nunca são expostas ao cliente.** Chaves com acesso elevado existem exclusivamente em contextos de servidor e nunca são incluídas em código enviado ao navegador.

3. **Dados de produção não são alterados sem dry-run anterior.** Toda operação que escreve em produção tem modo de simulação que deve ser executado e verificado primeiro.

4. **Preço nunca é propriedade do produto.** Preço pertence à oferta. Esta distinção é estrutural, não convencional, e não é negociável.

5. **Documentação reflete estado real, não intenção.** Um arquivo que descreve o que deveria existir, sem marcar essa distinção, é desinformação que gera decisões incorretas.

6. **Nunca construir sobre fundação incorreta.** Quando uma premissa do design está errada, a correção da premissa precede qualquer nova funcionalidade.

7. **Um caminho único para cada mutação.** Toda alteração de dado importante tem exatamente um ponto de entrada no sistema. Múltiplos caminhos de escrita para a mesma entidade criam inconsistência inevitável.

8. **Toda automação tem observabilidade.** Nenhum processo automatizado opera sem relatório de execução, contagem de sucessos e falhas, e log de erros.

9. **Funcionalidade incompleta não é entregue em produção.** Uma feature sem estado de erro, sem validação de borda, sem estado vazio tratado — não é uma feature entregue.

10. **O estado real do sistema é verificado, não assumido.** Antes de declarar que algo funciona, testar com os dados e credenciais que o sistema real usa em produção.

11. **Chave anônima para dados públicos, chave de serviço exclusivamente para dados protegidos.** A separação de contexto de acesso é arquitetural, não uma medida temporária.

12. **Toda decisão arquitetural é documentada no momento em que é tomada.** Decisões não documentadas se repetem com as mesmas análises e os mesmos erros.

13. **Toda funcionalidade nova deve produzir dados reutilizáveis.** Uma feature que resolve um problema sem gerar conhecimento para futuras decisões é uma feature com retorno zero sobre o investimento de longo prazo.

14. **Dados históricos não são apagados sem justificativa explícita e aprovação.** O valor de dados cresce com o tempo. A exclusão permanente é irreversível.

---

## XVII. Processo de Desenvolvimento

### Como cada Release é planejada

Cada Release responde, nesta ordem:

1. **O que está quebrado ou incompleto?** Nenhuma Release começa sem garantir que a anterior não tem débito técnico crítico aberto.
2. **O que o usuário não consegue fazer hoje que deveria conseguir?** Releases são definidas pela lacuna de valor, não pela lista de features desejadas.
3. **O que a infraestrutura ainda não suporta?** Features visíveis dependem de fundação invisível. A fundação é construída antes da feature.
4. **Qual ativo este Release produz ou fortalece?** Toda Release deve avançar pelo menos um dos ativos estratégicos listados na Seção VII.
5. **Qual é o critério de aceitação verificável?** Toda Release tem um conjunto de afirmações verificáveis que, quando todas passam, declaram a Release completa.

### O que uma Release NÃO é

Uma Release não é uma data. Uma Release não é uma lista de tickets. Uma Release não é "tudo que cabia no período".

Uma Release é um conjunto coeso de funcionalidades que, juntas, entregam um valor identificável para um público identificável — e que o sistema suporta de ponta a ponta, com dados reais, nas condições de produção.

### Ordem de trabalho dentro de uma Release

1. Leitura do estado real (código, banco, produção — não documentação)
2. Identificação de premissas incorretas ou débito técnico bloqueante
3. Correção de fundação, se necessário, antes de qualquer feature nova
4. Implementação de novas funcionalidades
5. Validação contra critérios de aceitação, com dados e credenciais reais
6. Documentação do que mudou: ADRs para decisões estruturais, changelog, status atualizado
7. Deploy

Nenhuma etapa é pulada. Documentação é parte da entrega, não um opcional pós-entrega.

### Critério de "done"

Uma tarefa está concluída quando:

- O código funciona com dados reais
- Os tipos estão corretos e refletem o schema real
- A arquitetura foi respeitada (sem bypass de camadas)
- A funcionalidade produz dados reutilizáveis quando aplicável
- A documentação foi atualizada
- Não há regressão introduzida
- O projeto compila, passa typecheck e passa lint

Qualquer um desses critérios não atendido significa que a tarefa não está concluída.

---

## XVIII. Critério de Aceitação

Toda funcionalidade nova deve responder afirmativamente a todas estas perguntas antes de entrar em produção:

### Valor

- Para qual usuário específico esta funcionalidade existe?
- O que este usuário consegue fazer agora que não conseguia antes?
- Existe evidência de que este usuário quer isso?

### Ativo

- Esta funcionalidade fortalece ou cria um ativo estratégico (Seção VII)?
- Ela produz dados que outros módulos poderão consumir?
- Se for removida amanhã, o ParaguAI perde capacidade de aprendizado?

### Completude

- A funcionalidade tem estado de carregamento?
- A funcionalidade tem estado de erro?
- A funcionalidade tem estado vazio — sem dados?
- A funcionalidade funciona com volume mínimo (zero itens) e com volume real?

### Dados

- Os dados que a funcionalidade consome são reais, normalizados e acessíveis com as credenciais corretas?
- Os dados que a funcionalidade grava têm validação antes da persistência?
- Existe rastro de auditoria para mutações relevantes?
- A funcionalidade foi testada com as credenciais que o sistema real usa, não com credenciais privilegiadas?

### Integração

- A funcionalidade compila sem erro?
- A funcionalidade passa lint e typecheck?
- A funcionalidade não introduz regressão em funcionalidades existentes?
- As rotas novas estão no sitemap quando relevante?
- Metadados de SEO estão presentes quando aplicável?

### Segurança

- Dados privados são acessíveis apenas para quem tem autorização?
- Credenciais privilegiadas não estão expostas ao cliente?
- Inputs externos são validados antes de uso?
- Dados de terceiros são acessados exclusivamente em contexto de servidor?

### Documentação

- A decisão arquitetural foi registrada, se houver?
- O changelog foi atualizado?
- O PROJECT_STATUS reflete o novo estado?
- Placeholders marcados como "em breve" foram atualizados?

Qualquer "não" nesta lista é um bloqueador — não um item de backlog.

---

## XIX. Hierarquia de documentos

Quando este documento conflitar com outro, a hierarquia é:

1. **AI_CONSTITUTION.md** (este arquivo) — princípios permanentes
2. **DECISIONS.md** (ADRs) — decisões específicas e contextualizadas
3. **CLAUDE.md** (raiz) — instruções operacionais de desenvolvimento
4. **ARCHITECTURE.md** — estado real da arquitetura
5. **PROJECT_STATUS.md** — estado real do projeto
6. Demais documentos em `docs/`

Documentos de estado (PROJECT_STATUS, ARCHITECTURE, CHANGELOG) refletem o que é real agora. Documentos de princípio (este, DECISIONS, RULES) refletem o que é permanente. Quando os dois conflitam, o documento de estado está descrevendo uma exceção — não invalidando o princípio.

---

## Histórico de revisões

| Versão | Data | Autor | Descrição |
|---|---|---|---|
| 1.0 | 2026-06-27 | Daniel Gonçalves (CTO) | Versão inicial — síntese de ADR-001 a ADR-032, ROADMAP.md, ARCHITECTURE.md, DOMAIN_MODEL.md, DECISIONS.md e todo o histórico de sprints do projeto |
| 1.1 | 2026-06-27 | Daniel Gonçalves (CTO) | Revisão estratégica: Identidade reformulada (Inteligência Operacional da Tríplice Fronteira), nova seção VII (Ativos), nova seção X (Efeito de Rede / Flywheel), nova seção XIV (Moat), fortalecimento de IA (Brain), Missão, Automação, Escalabilidade, Organismo Vivo. 2 novas Regras Permanentes. Total: 19 seções vs. 16 na v1.0. |

---

*Todo desenvolvedor humano ou sistema de IA que trabalhar neste projeto deve ler este documento antes de iniciar qualquer tarefa. Este documento não é atualizado a cada release — é atualizado quando um princípio precisa ser revisado, com nova versão e registro no histórico acima.*
