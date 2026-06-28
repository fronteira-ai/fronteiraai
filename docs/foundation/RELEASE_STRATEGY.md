# RELEASE_STRATEGY.md
# Como o ParaguAI Evolui

**Versão**: 1.0  
**Criado**: 2026-06-27  
**Status**: Permanente — Foundation 0.8  
**Prioridade**: Oitavo e último documento do núcleo estratégico. Este documento fecha o ciclo da Foundation.

---

## Preâmbulo

Os sete documentos anteriores definem quem somos, como decidimos, como criamos valor, para onde vamos, como construímos tecnologia, como construímos produtos, e como aprovamos qualquer decisão. Juntos, formam um sistema completo de pensamento.

Este documento responde a última pergunta: **como transformamos pensamento em evolução contínua?**

Uma Release é onde o sistema de pensamento da Foundation se materializa em código, dados, documentação e aprendizado. É o momento em que identidade, estratégia, engenharia e produto se tornam realidade para os usuários da plataforma.

Por isso, uma Release bem executada não é o fim de um processo — é o início do próximo ciclo. O que aprendemos em cada Release alimenta a próxima decisão, que alimenta a próxima Release, que alimenta o próximo aprendizado. A qualidade desse ciclo determina a trajetória de longo prazo da plataforma.

---

## 1. Filosofia de Releases

**Uma Release não é um conjunto de tarefas concluídas. É uma evolução mensurável da plataforma.**

A diferença é fundamental: um conjunto de tarefas tem como critério de sucesso a conclusão de cada item. Uma evolução tem como critério de sucesso a melhoria verificável do estado da plataforma.

Uma Release que conclui todas as tarefas mas não deixa a plataforma em estado melhor do que estava é uma Release que falhou no que importa — mesmo que nenhuma task esteja incompleta.

### O que define uma evolução mensurável

**Algo que não existia agora existe**: um novo ativo, uma nova capacidade, uma nova integração, uma nova proteção.

**Algo que era frágil agora é robusto**: um contrato antes implícito agora é explícito, um processo antes manual agora é automático, um módulo antes acoplado agora é independente.

**Algo que bloqueava o próximo passo agora está resolvido**: débito técnico eliminado, decisão arquitetural tomada e documentada, dependência removida.

**Algo que gerava incerteza agora é claro**: documentação criada, comportamento observável, dado anteriormente opaco agora rastreável.

Uma Release que entrega qualquer combinação dessas quatro propriedades é uma Release bem-sucedida. Uma Release que não entrega nenhuma precisa ser reavaliada antes de ser iniciada.

### Releases não são medidas pelo que entra — são medidas pelo que fica

O código que entra numa Release é temporário — pode ser refatorado, otimizado ou substituído. O que fica é: o ativo que a Release criou, o dado que começou a ser coletado, a capacidade que passou a existir, o aprendizado que foi documentado. Esses são os critérios reais de sucesso.

---

## 2. O Ciclo Permanente

O ParaguAI evolui em um ciclo contínuo com onze estágios. Cada estágio alimenta o próximo; o último alimenta de volta o primeiro.

```
         MISSÃO
           │
           ▼
       OBSERVAÇÃO
   (sinal do problema)
           │
           ▼
       FORMULAÇÃO
   (problema específico)
           │
           ▼
     DECISION FILTER
  (aprovada? Tipo 1 ou 2?)
           │
           ▼
     ADR (se Tipo 1)
   (decisão documentada)
           │
           ▼
      PLANEJAMENTO
  (escopo, critérios, riscos)
           │
           ▼
    IMPLEMENTAÇÃO
           │
           ▼
      VALIDAÇÃO
  (Quality Gates, testes)
           │
           ▼
       RELEASE
    (merge, deploy)
           │
           ▼
     OBSERVAÇÃO
   (comportamento real)
           │
           ▼
     APRENDIZADO
  (o que mudou? o que ficou?)
           │
           ▼
        MISSÃO
    (ciclo reinicia)
```

### Os estágios em detalhe

**Missão**: toda Release começa com um problema ligado à missão — reduzir assimetria de informação na Tríplice Fronteira. Releases sem ligação à missão não deveriam existir.

**Observação**: o problema é identificado por evidência — comportamento de usuário, dado operacional, limitação técnica encontrada, sinal do mercado. Problemas sem evidência são hipóteses, não problemas.

**Formulação**: o problema é descrito de forma específica: quem é afetado, com qual frequência, com qual custo. Um problema vago não pode ser resolvido de forma verificável.

**Decision Filter**: a iniciativa percorre o Pipeline de Decisão (DECISION_FILTER.md). É aprovada, revisada ou rejeitada. Se aprovada, é classificada como Tipo 1 ou Tipo 2.

**ADR**: para decisões Tipo 1, o ADR documenta a decisão antes da implementação — o problema, as alternativas consideradas, a decisão tomada e o raciocínio. O ADR é o registro permanente que preserva o contexto para leitores futuros.

**Planejamento**: escopo definido, critério de sucesso explícito, dependências identificadas, riscos conhecidos. O planejamento não é cerimônia — é o ato de pensar o que pode dar errado antes de começar.

**Implementação**: o código é escrito, o dado é modelado, a infraestrutura é configurada. A implementação segue os princípios do ENGINEERING_PRINCIPLES e do PRODUCT_PRINCIPLES.

**Validação**: a implementação é verificada contra os Quality Gates. Testes, build, typecheck, lint, revisão de consistência arquitetural.

**Release**: a implementação validada é integrada à plataforma principal. CHANGELOG, PROJECT_STATUS e ADRs relevantes são atualizados.

**Observação**: o comportamento real da plataforma após a Release é observado. Métricas, logs, comportamento de usuário, feedback operacional.

**Aprendizado**: o ciclo documenta o que aprendeu — o que funcionou, o que não funcionou, o que a próxima Release pode aproveitar. O aprendizado alimenta a próxima iteração da Missão.

---

## 3. O Que É uma Release

Uma Release é um conjunto coeso de mudanças que, juntas, entregam uma evolução identificável da plataforma.

**Coeso**: as mudanças na Release pertencem juntas porque resolvem o mesmo problema ou constroem a mesma capacidade. Um conjunto de mudanças não-relacionadas agrupadas por prazo não é uma Release — é um batch.

**Evolução identificável**: ao final da Release, é possível descrever em uma frase o que a plataforma consegue fazer que não conseguia antes, ou o que está mais seguro, robusto ou observável do que estava.

**Propriedades de uma Release bem definida:**

- **Problema claro**: a Release existe para resolver um problema específico para um público específico
- **Escopo limitado**: o que entra na Release é o mínimo necessário para entregar a evolução identificável, sem mais
- **Critério de sucesso explícito**: antes de começar, é possível descrever como saberemos que a Release foi bem-sucedida
- **Estado consistente**: a plataforma em qualquer ponto durante a Release está em estado utilizável — não há "meio de Release" em produção
- **Deixa ativo**: toda Release deixa ao menos um ativo reutilizável — um módulo, um dado, uma capacidade, uma documentação, um contrato

---

## 4. O Que NÃO É uma Release

**Acúmulo de tarefas**: um conjunto de itens de backlog agrupados por data de conclusão. Se o critério de grouping é "tudo que terminamos esta semana", não é uma Release.

**Entrega sem valor**: código que funciona mas não melhora nada mensurável para nenhum usuário e não cria nenhum ativo. Pode ser necessário (correção de bug crítico de segurança), mas não é uma Release — é uma correção emergencial, e deve ser tratada como tal.

**Alterações cosméticas isoladas**: mudança de cor, ajuste de espaçamento, renomeação sem impacto — a menos que façam parte de uma Release de Design System com objetivo mais amplo.

**Experimentos sem hipótese**: funcionalidades implementadas para "ver o que acontece" sem critério de avaliação definido. Experimentos são válidos — mas precisam de hipótese, método de avaliação e critério de sucesso antes de serem implementados.

**Mudanças sem critério de sucesso**: se não é possível descrever como saberemos que a mudança funcionou antes de implementá-la, a mudança não está suficientemente pensada para ser uma Release.

**Reversão de Release anterior**: desfazer uma Release sem aprender nada é um sinal de que o processo não funcionou — não apenas a implementação. Uma reversão deve ser sempre acompanhada de documentação do que foi aprendido e como o ciclo será melhorado.

---

## 5. Tipos de Release

O ParaguAI tem categorias de Release com objetivos específicos. A categoria determina quais critérios de sucesso são aplicáveis e quais Quality Gates são obrigatórios.

### Foundation

**Objetivo**: criar ou revisar documentos permanentes do núcleo estratégico.

**Critério de sucesso**: o documento produzido pode guiar decisões durante anos sem revisão. Está alinhado com os documentos anteriores. Preenche uma lacuna que nenhum documento anterior preenchia.

**Quality Gate adicional**: leitura crítica contra todos os documentos existentes para verificar ausência de contradições.

**Exemplo**: ENGINEERING_PRINCIPLES.md, DECISION_FILTER.md.

### Architecture

**Objetivo**: tomar e documentar uma decisão arquitetural de longo prazo — modelo de dados, contrato entre módulos, padrão de integração, estratégia de segurança.

**Critério de sucesso**: o ADR documenta o problema, as alternativas, a decisão e o raciocínio de forma que leitores futuros possam entender por que a decisão foi tomada, não apenas o que foi decidido.

**Quality Gate adicional**: o ADR existe e foi revisado antes de qualquer implementação.

**Exemplo**: ADR sobre modelo de permissões, ADR sobre estratégia de cache, ADR sobre política de dados históricos.

### Platform

**Objetivo**: construir ou refatorar infraestrutura transversal — capacidades que múltiplos módulos utilizarão.

**Critério de sucesso**: ao final, outros módulos podem consumir a capacidade sem reimplementar lógica. A Release habilita futuras Releases com menor esforço.

**Quality Gate adicional**: ao menos um consumidor além do módulo que criou a capacidade está identificado e pode integrar sem mudança no módulo.

**Exemplo**: pipeline de importação universal, sistema de scoring compartilhado, motor de busca reutilizável.

### Feature

**Objetivo**: entregar nova funcionalidade perceptível para pelo menos um público.

**Critério de sucesso**: o público identifica uma melhoria na sua capacidade de tomar decisões ou de operar dentro da plataforma.

**Quality Gate adicional**: o comportamento é observável (logs, métricas, ou dado gerado pela funcionalidade).

**Exemplo**: histórico de preços visível para compradores, dashboard analítico para lojistas, planejador de viagem para turistas.

### Quality

**Objetivo**: melhorar qualidade interna sem mudança de comportamento visível — refatoração, melhoria de cobertura, eliminação de débito técnico.

**Critério de sucesso**: a plataforma é mais fácil de modificar ao final do que era no início. O débito eliminado está documentado; o débito restante está mapeado.

**Quality Gate adicional**: nenhuma regressão de comportamento. O sistema funciona exatamente como antes — mas é mais fácil de trabalhar.

**Exemplo**: extração de lógica duplicada em módulo compartilhado, melhoria de contratos entre módulos, remoção de dependência circular.

### Infrastructure

**Objetivo**: melhorar a base operacional da plataforma — deploy, monitoramento, observabilidade, resiliência, automação operacional.

**Critério de sucesso**: a operação é mais previsível, mais rápida de diagnosticar em caso de problema, ou mais resistente a falhas.

**Quality Gate adicional**: todos os comportamentos críticos da infraestrutura são observáveis após a Release.

**Exemplo**: pipeline de deploy com validações automáticas, sistema de alertas de anomalia, automação de backup e restauração.

### Security

**Objetivo**: reforçar a postura de segurança — autenticação, autorização, validação de entrada, auditoria, proteção de dados.

**Critério de sucesso**: a superfície de ataque é menor ou mais bem-defendida. O que foi protegido pode ser verificado.

**Quality Gate adicional**: revisão explícita do modelo de menor privilégio. Nenhuma credencial ou dado sensível foi exposto durante o desenvolvimento.

**Exemplo**: implementação de RLS, auditoria de acesso a dados sensíveis, validação de entrada em fronteiras de sistema.

### Performance

**Objetivo**: melhorar velocidade, eficiência ou capacidade de processamento de forma mensurável.

**Critério de sucesso**: há uma métrica de antes e depois que demonstra a melhoria. A melhoria beneficia um caso de uso real — não apenas um benchmark sintético.

**Quality Gate adicional**: a métrica de referência existe antes da implementação e é medida após.

**Exemplo**: otimização de queries de busca, redução de latência em importação de catálogos, melhoria de tempo de carregamento de páginas críticas.

### Data

**Objetivo**: melhorar a qualidade, cobertura, estrutura ou acesso a dados — incluindo novos tipos de dado e novas fontes.

**Critério de sucesso**: os dados produzidos estão disponíveis para outros módulos, com contrato explícito de forma e frescor.

**Quality Gate adicional**: o dado tem origem documentada, ciclo de vida definido e responsável de qualidade identificado.

**Exemplo**: nova tabela de histórico de preços, pipeline de normalização de catálogo, conector de nova fonte de dados de loja.

### AI

**Objetivo**: criar ou melhorar capacidade de inteligência — modelos, embeddings, rankings algorítmicos, sugestões.

**Critério de sucesso**: a qualidade de alguma decisão ou experiência é mensurável melhor por causa da Release. Os dados que alimentam a capacidade têm qualidade verificada.

**Quality Gate adicional**: o modelo tem contrato explícito (entrada, saída, comportamento em borda). Qualidade de dados de input está verificada antes de qualquer avaliação do modelo.

**Exemplo**: sistema de ranking de relevância por comportamento, recomendações contextuais de produto, sugestões de query para busca semântica.

---

## 6. Critérios para Criar uma Nova Release

Nem toda mudança merece uma Release formal. Calibrar o nível de formalidade ao impacto da mudança evita burocracia sem sacrificar rastreabilidade.

### Quando uma mudança merece Release formal

**Impacto em múltiplos módulos**: a mudança afeta contratos entre módulos ou muda comportamento observável em mais de um lugar.

**Decisão arquitetural**: a mudança representa uma escolha de design que outros devem respeitar no futuro.

**Novo ativo ou capacidade**: a plataforma pode fazer algo que não podia antes.

**Mudança de comportamento para usuário**: qualquer usuário (comprador, lojista, turista, parceiro) experimenta algo diferente.

**Mudança de dados**: novos tipos de dado são coletados, processados ou expostos.

### Quando basta um ajuste

**Correção localizada**: um bug em um módulo, sem impacto em contratos externos.

**Atualização de conteúdo**: texto, tradução, configuração — sem mudança de comportamento.

**Melhoria de legibilidade**: refatoração interna que não muda o comportamento observável.

Ajustes podem ser agrupados na próxima Release quando há ganho de rastreabilidade em fazê-lo, ou entregues diretamente quando a urgência justifica.

### Quando criar um ADR

Sempre que a decisão for Tipo 1 (irreversível ou de reversão cara): modelo de dados, contrato entre módulos, identidade da plataforma, estratégia de segurança, escolha que outros devem respeitar no futuro.

### Quando agrupar iniciativas

Quando as iniciativas resolvem o mesmo problema ou constroem a mesma capacidade, e a coesão é real — não imposta por prazo. Agrupar por coesão cria Releases com identidade clara. Agrupar por prazo cria batches.

---

## 7. Planejamento

O planejamento de uma Release não é uma cerimônia. É o ato de pensar o que pode dar errado antes de começar — e de ser específico o suficiente sobre o que "sucesso" significa para que possa ser verificado depois.

### O mínimo necessário antes de começar

**Problema**: qual problema esta Release resolve? Para quem? Com qual evidência?

**Objetivo**: qual é o estado da plataforma ao final da Release? O que é verdadeiro no final que não era verdadeiro no início?

**Escopo**: o que está dentro desta Release e o que está fora? O que está fora está fora por razão específica — não apenas porque não houve tempo.

**Critério de sucesso**: como saberemos que a Release foi bem-sucedida? A resposta deve ser verificável antes do merge, não uma interpretação subjetiva após.

**Dependências**: o que esta Release precisa que ainda não existe? Se a dependência está dentro da Release, está ordenada. Se está fora, está bloqueante ou contornável?

**Riscos identificados**: o que pode dar errado? Para cada risco significativo, existe estratégia de mitigação ou plano de reversão?

### O que não pertence ao planejamento

Estimativas de prazo em calendário. Estimativas de esforço são úteis para priorização; compromissos com datas são frequentemente contraproducentes porque criam pressão para sacrificar qualidade de planejamento quando o tempo é curto.

Aprovações de múltiplas partes para decisões Tipo 2. Releases de baixo impacto e alta reversibilidade devem ser planejadas e executadas com o mínimo de atrito.

---

## 8. Compounding Releases

Este é o princípio mais importante da estratégia de Releases do ParaguAI.

**Toda Release deve deixar a plataforma em estado que torna a próxima Release mais fácil.**

Não é suficiente que a Release entregue o que prometeu. Ela também deve contribuir para que o trabalho futuro seja menos custoso do que seria sem ela.

### O que significa "mais fácil"

**Mais fácil de escalar**: a Release eliminou um gargalo que cresceria com o volume, ou adicionou capacidade sem adicionar complexidade proporcional.

**Mais fácil de estender**: a Release criou um módulo que outras capacidades podem reutilizar, ou estabeleceu um contrato que pode ser consumido sem conhecimento da implementação.

**Mais fácil de observar**: a Release adicionou observabilidade a um comportamento que antes era opaco, tornando diagnósticos futuros mais rápidos.

**Mais fácil de entender**: a Release documentou uma decisão que estava implícita, ou clarificou o propósito de um módulo que estava vago.

**Mais fácil de confiar**: a Release eliminou um comportamento imprevisível, adicionou validação em uma fronteira não-validada, ou tornou um processo frágil mais robusto.

### Os ativos de uma Compounding Release

Toda Release que faz compounding deixa ao menos um dos seguintes:

**Motor reutilizável**: lógica que pode ser invocada por múltiplos consumidores sem reimplementação. O pipeline de importação é um motor: cada novo conector custa uma fração do primeiro porque reutiliza o motor.

**Dados acumuláveis**: um tipo de dado que, quanto mais coletado, mais valioso. Histórico de preços é um ativo acumulável — o décimo mês de histórico é mais valioso do que o primeiro.

**Contrato estabilizado**: uma interface entre módulos que foi tornado explícita e pode ser consumida de forma confiável. Cada consumidor futuro custo zero em redefinição de contrato.

**Capacidade de IA alimentada**: dados estruturados de uma forma que alimenta modelos de inteligência futuros. Cada novo tipo de dado estruturado amplia o que o Brain poderá responder.

**Conhecimento documentado**: uma decisão que estava na cabeça de quem a tomou agora está em ADR. Cada ADR reduz o custo de onboarding de futuros colaboradores e o custo de tomar a decisão errada por ignorância de contexto.

### A pergunta de compounding

Antes de encerrar qualquer Release, responder: **o que esta Release deixa que a próxima Release poderá aproveitar sem reimplementar?** Se a resposta for "nada", a Release foi correta no que resolveu mas incompleta no que deixou. Isso é válido em situações específicas (correção emergencial, ajuste urgente) — mas nunca deve ser a norma.

---

## 9. Definition of Ready

Uma Release está pronta para começar quando todas as seguintes condições são verdadeiras.

**Problema definido**: o problema que a Release resolve foi descrito com especificidade — quem é afetado, com qual frequência, com qual custo atual.

**Objetivo claro**: o estado da plataforma ao final da Release pode ser descrito em uma ou duas frases.

**Critério de sucesso explícito**: existe ao menos um indicador verificável de que a Release foi bem-sucedida. O indicador pode ser verificado antes do merge.

**Tipo classificado**: a Release foi classificada como Tipo 1 ou Tipo 2. Se Tipo 1, o ADR existe antes de qualquer implementação.

**Escopo validado pelo Decision Filter**: a iniciativa percorreu o Pipeline de Decisão e foi aprovada. Não há itens no escopo que falharam nos filtros críticos.

**Dependências identificadas**: tudo que a Release precisa de fora de si mesma foi identificado. Dependências bloqueantes estão resolvidas ou têm plano de resolução.

**Ativo de compounding identificado**: o que esta Release vai deixar para as próximas foi identificado. Se ainda não há resposta, o planejamento está incompleto.

**Riscos conhecidos**: os principais riscos foram listados. Para cada risco significativo, existe estratégia de mitigação ou plano de reversão.

---

## 10. Definition of Done

Uma Release está pronta para merge quando todas as seguintes condições são verdadeiras.

**Implementação concluída**: todos os itens do escopo foram implementados conforme o objetivo definido.

**Quality Gates aprovados**: todos os Quality Gates obrigatórios para o tipo de Release passaram.

**Critério de sucesso verificado**: o indicador definido no planejamento foi verificado e é positivo.

**Regressões conhecidas: nenhuma**: nenhum comportamento que funcionava antes da Release deixou de funcionar.

**Documentação atualizada**: todo comportamento novo ou mudado está documentado onde é necessário.

**CHANGELOG atualizado**: a Release tem entrada no CHANGELOG com descrição do que mudou e por quê.

**PROJECT_STATUS atualizado**: o estado atual da plataforma reflete a Release.

**ADRs atualizados**: se a Release tomou ou implementou decisão Tipo 1, o ADR correspondente está criado ou atualizado.

**Ativo de compounding entregue**: o ativo identificado no planejamento existe e pode ser consumido por outros módulos.

**Aprendizado documentado**: o que a Release ensinou — sobre o problema, sobre a solução, sobre o processo — foi registrado onde ficará acessível para próximas Releases.

---

## 11. Quality Gates

Os Quality Gates são verificações obrigatórias que toda Release deve passar antes de ser integrada. São passagem/falha — não há "passou parcialmente".

### Gates Universais (toda Release)

**Build**: a plataforma compila sem erro.

**Typecheck**: o sistema de tipos não encontra inconsistências.

**Lint**: o linter não reporta violações configuradas como erro.

**Consistência arquitetural**: a implementação respeita os contratos de módulo existentes. Nenhuma dependência circular foi introduzida. O fluxo de dados segue a direção definida (interfaces consomem dados; dados não pertencem a interfaces).

**Consistência com a Foundation**: a Release não viola nenhuma Regra Permanente da Constituição. Se a Release toca uma área sensível (dados de usuário, neutralidade, segurança, identidade da plataforma), a verificação é explícita — não implícita.

**Sem regressões conhecidas**: testes existentes passam. Comportamentos documentados funcionam como documentados.

### Gates Adicionais por Tipo

**Para Releases Architecture**: ADR existe e foi revisado antes da implementação.

**Para Releases Security**: modelo de menor privilégio verificado. Credenciais e dados sensíveis não expostos. Validação em todas as fronteiras tocadas.

**Para Releases Data**: dado tem origem, ciclo de vida e responsável documentados. Contrato de dados (forma e frescor) está explícito para consumidores.

**Para Releases AI**: dados de input têm qualidade verificada. O modelo tem contrato explícito (entrada, saída, comportamento em borda). O comportamento é observável — logs suficientes para diagnosticar resultado inesperado.

**Para Releases Platform**: ao menos um consumidor além do módulo criador pode integrar sem mudança no módulo. A capacidade é reutilizável sem reimplementação.

---

## 12. Versionamento

O versionamento do ParaguAI reflete a natureza das mudanças, não apenas sua magnitude. A versão é um comunicado — ela diz ao leitor que tipo de evolução aconteceu.

### A hierarquia de versões

**Foundation (F.x)**: mudanças nos documentos permanentes do núcleo estratégico. A Foundation é a camada mais estável — versões Foundation são raras e significativas. `F.0.1` → `F.0.8` nesta sessão inaugural.

**Major Release (x.0)**: mudanças que alteram o contrato fundamental da plataforma com seus usuários — nova categoria de público servida, nova forma de monetização, nova camada de dados ou inteligência. Major Releases são marcos de fase (ver MASTER_ROADMAP: Fase 1, Fase 2, Fase 3).

**Minor Release (x.y)**: capacidades novas que não alteram o contrato fundamental — nova funcionalidade para público existente, novo módulo que amplifica capacidades existentes, nova integração. A maioria das Releases cai aqui.

**Patch (x.y.z)**: correções, ajustes, melhorias de qualidade sem mudança de comportamento observável pelo usuário.

### O número não é o significado — o CHANGELOG é

A versão comunica a escala da mudança. O CHANGELOG comunica o que mudou e por quê. Os dois juntos permitem que qualquer colaborador — humano ou IA — reconstrua o contexto de qualquer estado da plataforma a partir do histórico.

### Versões de Foundation como âncora

As versões Foundation são âncoras permanentes. Quando qualquer documento posterior referenciar "a Foundation vigente", é possível determinar exatamente qual versão de cada documento estava em vigor.

---

## 13. Comunicação

Toda Release produz registro rastreável em quatro lugares.

### CHANGELOG

O CHANGELOG é o registro narrativo da evolução da plataforma. Cada entrada inclui: data, tipo de Release, o que mudou, e por quê mudou (o problema que resolveu ou a capacidade que criou). Entradas de CHANGELOG sem "por quê" são incompletas — o "o quê" está no código; o "por quê" está no CHANGELOG.

Formato de entrada:
- O que foi criado, modificado ou removido (com nome do arquivo ou módulo)
- O que essa mudança entrega (a evolução identificável)
- Referência ao ADR quando relevante

### PROJECT_STATUS

O PROJECT_STATUS descreve o estado atual da plataforma — o que existe, o que está planejado, o que está em construção. É uma fotografia do presente, não uma narrativa histórica.

Após cada Release, o PROJECT_STATUS é atualizado para refletir o novo estado: capacidades que passaram a existir, débitos que foram eliminados, capacidades que estão em planejamento.

### ADRs

Os ADRs são o repositório de decisões Tipo 1 — as que são difíceis ou caras de reverter. Um ADR não descreve o que foi implementado; descreve por que a decisão foi tomada dessa forma e não de outra. O contexto documentado no ADR é o que torna a decisão compreensível para alguém que a encontra anos depois, sem o contexto que existia no momento.

### NEXT_STEPS

O NEXT_STEPS captura o que foi aprendido na Release e o que isso implica para as próximas iniciativas. Não é um backlog — é um registro de direção emergente. O NEXT_STEPS é uma entrada do ciclo permanente: o aprendizado de uma Release alimenta a observação que inicia a próxima.

---

## 14. Aprendizado Contínuo

Uma Release que não produz aprendizado foi uma oportunidade perdida — mesmo que tenha entregado tudo o que prometeu.

**O que aprendemos** sobre o problema: ele era o que pensávamos? Era mais difícil, mais simples, mais nuançado? O que a implementação revelou sobre o problema que não estava visível antes?

**O que aprendemos** sobre a solução: a abordagem escolhida funcionou? Houve trade-offs não antecipados? O que faríamos diferente?

**O que aprendemos** sobre o processo: o planejamento foi suficiente? Os critérios de sucesso eram os corretos? Os Quality Gates capturaram o que deveriam capturar?

**O que a próxima Release pode reutilizar**: módulos criados, padrões estabelecidos, dados acumulados, conhecimento documentado.

**O que a próxima Release deve evitar**: débito identificado, decisão que se mostrou errada, abordagem que não funcionou para este contexto.

### Aprendizado que alimenta o ciclo

O aprendizado de uma Release não existe para ser arquivado. Existe para alimentar a próxima observação — o segundo estágio do Ciclo Permanente.

Uma plataforma que aprende de cada Release é uma plataforma que fica mais inteligente com o tempo. Não por acumulação de código — por acumulação de aprendizado que melhora a qualidade das próximas decisões.

---

## 15. O Compromisso

Toda Release — independentemente de tipo, tamanho ou urgência — carrega os seguintes compromissos:

**Fortalecer a Foundation**: a Release não contradiz nenhum documento permanente. Se parece contradizer, o processo correto é revisar o documento — não ignorá-lo.

**Fortalecer a arquitetura**: a Release deixa os contratos mais explícitos, o acoplamento mais baixo, a coesão mais alta, a observabilidade maior do que encontrou.

**Fortalecer os ativos**: a Release contribui para ao menos um dos ativos estratégicos — catálogo, histórico, Merchant Score, Brain, conector, SEO, reputação, API.

**Fortalecer a inteligência**: a Release produz dados que ampliam o que o ParaguAI pode saber, aprender ou responder no futuro.

**Fortalecer o ecossistema**: a Release cria capacidade que outros módulos, outros públicos ou outros parceiros podem aproveitar sem que ela precise ser reimplementada.

**Aproximar da Vision 2035**: a Release é coerente com a direção de longo prazo descrita na Vision — com os seis estágios evolutivos, com o Brain, com o ecossistema aberto, com a infraestrutura de inteligência regional.

**Nunca apenas adicionar código**: código que entra é temporário. O que fica — o ativo, o dado, o contrato, o aprendizado — é permanente. Toda Release é avaliada pelo que fica, não pelo que entra.

---

## O Sistema Completo da Foundation

Com este documento, a Foundation Empresarial do ParaguAI está completa em oito pilares:

| Documento | Responde | Posição no Ciclo |
|---|---|---|
| `AI_CONSTITUTION.md` | Quem somos | Ancora toda decisão à identidade |
| `NORTH_STAR.md` | Como decidimos | Filtros e critérios de priorização |
| `BUSINESS_MODEL.md` | Como criamos valor | Valida alinhamento econômico |
| `VISION_2035.md` | Para onde vamos | Valida coerência de longo prazo |
| `ENGINEERING_PRINCIPLES.md` | Como construímos | Guia a implementação |
| `PRODUCT_PRINCIPLES.md` | Como fazemos produto | Guia a experiência do usuário |
| `DECISION_FILTER.md` | Como aprovamos | Ponto de entrada operacional |
| `RELEASE_STRATEGY.md` | Como evoluímos | Fecha o ciclo; alimenta o próximo |

### O Ciclo Fechado

```
IDENTIDADE (AI_CONSTITUTION)
      ↓
DECISÃO (NORTH_STAR + DECISION_FILTER)
      ↓
VALOR (BUSINESS_MODEL)
      ↓
VISÃO (VISION_2035)
      ↓
ENGENHARIA (ENGINEERING_PRINCIPLES)
      ↓
PRODUTO (PRODUCT_PRINCIPLES)
      ↓
RELEASE (RELEASE_STRATEGY)
      ↓
APRENDIZADO
      ↓
IDENTIDADE (ciclo reinicia)
```

A Foundation não é uma lista de documentos. É um sistema onde cada elemento alimenta o próximo. O RELEASE_STRATEGY fecha o ciclo ao garantir que o aprendizado de cada Release alimenta de volta a missão — que alimenta a próxima observação, que alimenta a próxima decisão, que alimenta a próxima Release.

---

*Uma plataforma que evolui bem não é uma plataforma que adiciona mais rápido. É uma plataforma que aprende melhor. Cada Release é uma oportunidade de aprender — sobre o problema, sobre a solução, sobre o processo, sobre o usuário. Plataformas que aproveitam essa oportunidade ficam mais inteligentes com o tempo. Plataformas que não aproveitam ficam apenas maiores.*
