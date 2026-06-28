# DECISION_FILTER.md
# Como Aprovamos Qualquer Decisão

**Versão**: 1.0  
**Criado**: 2026-06-27  
**Status**: Permanente — Foundation 0.7  
**Prioridade**: Sétimo documento do núcleo estratégico. Leia os seis documentos anteriores da Foundation antes deste.

---

## Preâmbulo

Os seis documentos anteriores da Foundation definem quem somos, como decidimos, como criamos valor, para onde vamos, como construímos tecnologia e como construímos produtos. Juntos, formam um sistema de princípios completo.

Este documento transforma esses princípios em processo.

Princípios sem processo são aspirações. Processo sem princípios é burocracia. Este documento existe na interseção: um processo enxuto que garante que princípios sejam consultados antes de decisões — e que acelere decisões ao fazê-lo de forma estruturada.

**A finalidade deste documento não é dificultar decisões. É eliminar deliberação desnecessária.** Quando o processo é claro, o tempo gasto em dúvida — "deveríamos fazer isso?" — é substituído por tempo gasto em execução — "como fazemos isso bem?"

---

## 1. O Papel do Decision Filter

Decisões tomadas por impulso — ou por pressão de prazo, ou por familiaridade com uma solução, ou por empolgação com uma tecnologia — frequentemente passam no teste de curto prazo e falham no teste de longo prazo. O Decision Filter existe para introduzir o teste de longo prazo antes da implementação, não depois.

**O Filter não cria novos critérios.** Todos os critérios já existem nos seis documentos anteriores. O Filter os organiza em uma sequência que pode ser percorrida em minutos para decisões simples, e em horas para decisões estratégicas.

### O que o Decision Filter aplica

Toda decisão que passa pelo Filter é comparada com quatro propriedades derivadas dos documentos anteriores:

**Alinhamento**: a iniciativa vai na direção da missão? (AI_CONSTITUTION + NORTH_STAR)

**Valor**: cria ativo ou apenas resolve problema imediato? (BUSINESS_MODEL + ENGINEERING_PRINCIPLES)

**Coerência**: é consistente com as decisões anteriores? (VISION_2035 + DECISIONS)

**Experiência**: como impacta o usuário final? (PRODUCT_PRINCIPLES)

Uma iniciativa que passa em todas as quatro tem luz verde. Uma que falha em qualquer uma precisa ser revista — ou o Filter precisa ser atualizado com novo aprendizado (o que também é válido, desde que seja explícito).

### Quem usa o Decision Filter

O Filter é usado por:
- Qualquer engenheiro ou IA avaliando se deve iniciar uma implementação
- Qualquer release antes de ser iniciado
- Qualquer ADR antes de ser escrito
- Qualquer funcionalidade antes de ser especificada
- Qualquer integração antes de ser construída

O Filter escala com a importância da decisão: uma decisão operacional pode passar pelo Filter em dois minutos. Uma decisão estratégica pode levar uma sessão completa de análise.

---

## 2. A Pergunta Fundamental

Antes de qualquer etapa do processo, uma pergunta simples que filtra a maioria das decisões ruins:

> **Esta iniciativa reduz a assimetria de informação ou fortalece a infraestrutura que reduz a assimetria de informação?**

Se a resposta for "sim" — direto ou indireto —, continuar o processo.

Se a resposta for "não" ou "talvez" — parar e reformular antes de continuar. Uma iniciativa que não tem resposta clara a esta pergunta não está suficientemente articulada para ser avaliada.

Esta pergunta é mais específica do que "aproxima da missão?" por uma razão: qualquer iniciativa pode ser descrita como "próxima da missão" com argumento suficientemente criativo. A pergunta da assimetria de informação é testável — ela exige que a iniciativa articule um mecanismo específico pelo qual reduz a desvantagem de alguém (comprador, lojista, turista, parceiro) frente a uma informação que hoje está fora do alcance.

---

## 3. O Pipeline de Decisão

Para qualquer iniciativa — funcionalidade, integração, refatoração, mudança arquitetural, decisão de produto — percorrer o Pipeline antes de implementar.

O Pipeline tem dez estágios. Para decisões simples, cada estágio leva um parágrafo. Para decisões estratégicas, cada estágio pode levar uma análise. O investimento é proporcional ao impacto da decisão.

---

```
IDEIA
   │
   ▼
[1] PROBLEMA REAL
   Que problema específico esta iniciativa resolve?
   Para quem? Com qual frequência? Com qual custo atual?
   │
   ▼
[2] VALOR GERADO
   Qual melhora concreta resulta da resolução deste problema?
   Melhora uma decisão? Produz um dado? Fortalece um ativo?
   │
   ▼
[3] ALINHAMENTO COM MISSÃO
   Reduz assimetria de informação, direta ou indiretamente?
   Está alinhado com quem servimos? (AI_CONSTITUTION — Identidade e Missão)
   │
   ▼
[4] FILTROS NORTH STAR
   Passa pelos 10 filtros permanentes? Score de priorização?
   É Tipo 1 ou Tipo 2? Requer ADR? (NORTH_STAR)
   │
   ▼
[5] IMPACTO NO MODELO DE NEGÓCIO
   Fortalece qual pilar de monetização? Qual network effect?
   Qual camada do moat? Ou tem impacto neutro? (BUSINESS_MODEL)
   │
   ▼
[6] COERÊNCIA COM A VISÃO
   Ainda fará sentido em dez anos? Está na direção dos 6 estágios?
   Fortalece o Brain? O ecossistema? (VISION_2035)
   │
   ▼
[7] PRINCÍPIOS DE ENGENHARIA
   Produz ativo? Mantém contratos? Respeita acoplamento?
   Adiciona observabilidade? É idempotente? (ENGINEERING_PRINCIPLES)
   │
   ▼
[8] PRINCÍPIOS DE PRODUTO
   Melhora decisão do usuário? Mantém simplicidade?
   Produz dados além de consumir? Não compromete confiança? (PRODUCT_PRINCIPLES)
   │
   ▼
[9] CUSTO E REVERSIBILIDADE
   Qual o esforço real? É reversível se errado?
   Qual o custo de não fazer?
   │
   ▼
[10] DECISÃO
   ✅ Implementar — alinhado, claro, reversível ou analisado em profundidade
   ⏸ Revisar — falhou em 1-2 estágios; reformular antes de prosseguir
   ❌ Não implementar — não passa no Filter; documentar por quê
```

---

### Estágio 1: Problema Real

Nenhuma iniciativa começa com uma solução. Começa com um problema.

O problema deve ser descrito em termos de: quem tem o problema, com qual frequência, e qual é o custo atual de não ter solução. Um problema vago ("usuários querem uma experiência melhor") não é um problema — é uma aspiração. Um problema específico ("compradores que visitam a loja sem verificar o preço atual encontram preço diferente do exibido na plataforma em X% dos casos") é um problema que pode ser resolvido.

Se o problema não pode ser descrito de forma específica, a iniciativa não está pronta para avaliação.

### Estágio 2: Valor Gerado

O valor de uma iniciativa não é descrito pela iniciativa em si, mas pelo que muda quando ela existe.

Três formas de valor no ParaguAI, em ordem decrescente de permanência:

**Ativo criado**: a iniciativa produz algo reutilizável que outros módulos podem consumir. Valor permanente.

**Dado produzido**: a iniciativa gera dados que enriquecem o sistema ao longo do tempo. Valor crescente.

**Problema resolvido**: a iniciativa elimina um atrito específico para um público específico. Valor presente — importante, mas não compounding.

Iniciativas de nível 3 são válidas; iniciativas que também atingem nível 1 ou 2 são priorizadas.

### Estágio 3: Alinhamento com Missão

Verificar contra a Constituição: a iniciativa é coerente com a identidade do ParaguAI? Serve a pelo menos um dos públicos? Não viola nenhuma das 14 Regras Permanentes?

Este estágio não precisa ser exaustivo para decisões simples. Para decisões com implicações de identidade — que tocam em neutralidade, em dados de usuários, em modelo de monetização, em parcerias estratégicas — este estágio requer leitura explícita dos capítulos relevantes da Constituição.

### Estágio 4: Filtros North Star

Aplicar os 10 Filtros Permanentes do NORTH_STAR. Calcular o score de priorização se a decisão envolve escolha entre iniciativas concorrentes.

Determinar: é decisão Tipo 1 (irreversível — schema, contratos, identidade, arquitetura) ou Tipo 2 (reversível — layout, copy, UX, componentes)? Decisões Tipo 1 exigem análise profunda e ADR. Decisões Tipo 2 exigem execução rápida e iteração.

### Estágio 5: Impacto no Modelo de Negócio

Identificar qual pilar de monetização é afetado, qual network effect é reforçado, qual camada do moat é fortalecida. Uma iniciativa que não toca nenhum desses pilares pode ser válida (reduz débito técnico, melhora experiência), mas é prioridade secundária em relação a iniciativas que fortalecem a estrutura econômica da plataforma.

### Estágio 6: Coerência com a Visão

Perguntar: se o ParaguAI em 2035 existisse como descrito no VISION_2035, esta iniciativa seria parte dele? Estaria alinhada com os estágios evolutivos? Com o Brain? Com o ecossistema aberto?

Uma iniciativa que não passa neste estágio não é necessariamente inválida — pode ser uma solução de curto prazo legítima. Mas deve ser implementada com consciência de que será substituída, e projetada para não bloquear a substituição.

### Estágio 7: Princípios de Engenharia

Verificar as questões técnicas fundamentais: a iniciativa produz ativo ou apenas resolve problema? Mantém contratos existentes ou os quebra? Adiciona observabilidade ou a reduz? É idempotente onde deve ser? Está no nível correto de acoplamento?

### Estágio 8: Princípios de Produto

Verificar as questões de produto fundamentais: melhora a decisão de algum usuário? Adiciona ou remove complexidade da experiência? Produz dados além de consumir? Não compromete confiança ou neutralidade?

### Estágio 9: Custo e Reversibilidade

Estimar o esforço real — não o esforço otimista. Determinar o grau de reversibilidade: se a iniciativa for implementada e se provar errada, qual é o custo de desfazê-la?

Também perguntar: qual é o custo de **não** implementar? Algumas iniciativas têm custo de oportunidade alto — não implementá-las hoje significa implementá-las com mais custo amanhã, ou perder uma janela de mercado.

### Estágio 10: Decisão

Após percorrer os estágios, a decisão se enquadra em uma de três categorias:

**✅ Implementar**: a iniciativa passou pelo Filter com respostas claras e positivas nos estágios críticos. Prosseguir.

**⏸ Revisar**: a iniciativa falhou em um ou dois estágios com respostas negativas ou vagas. Reformular — redefinir o escopo, o problema ou a abordagem — antes de reiniciar o Pipeline.

**❌ Não implementar**: a iniciativa não passa no Filter de forma consistente. Documentar por que — esse registro é valioso para evitar que a mesma iniciativa seja reapresentada sem nova evidência.

---

## 4. Os 12 Filtros Permanentes

Toda iniciativa, independentemente do tipo ou tamanho, deve ser capaz de responder "sim" às seguintes perguntas. Respostas "não" em filtros marcados como **[crítico]** devem bloquear a iniciativa até que sejam resolvidas. Respostas "não" em filtros não-críticos são alertas — devem ser avaliadas no contexto da iniciativa.

**[crítico] Resolve um problema real?** O problema está identificado, quantificado em impacto, e pertence a um dos públicos do ParaguAI.

**[crítico] Melhora a decisão de algum usuário?** O resultado final — direto ou indireto — é que alguém toma uma decisão melhor por causa desta iniciativa.

**[crítico] Mantém ou fortalece a confiança dos usuários?** A iniciativa não compromete dados, neutralidade, transparência ou consistência da plataforma.

**[crítico] Não viola nenhuma Regra Permanente da Constituição?** As 14 Regras são invioláveis. Uma iniciativa que exige violá-las não é a iniciativa errada — é um sinal de que a regra deve ser revisada formalmente, não contornada.

**Gera valor claro para pelo menos um público?** Comprador, lojista, turista ou parceiro.

**Produz algum dado novo ou enriquece dados existentes?** Mesmo que não seja o objetivo principal.

**Fortalece algum ativo estratégico?** Catálogo, histórico, Merchant Score, Brain, SEO, conector, reputação, API.

**Reforça pelo menos uma camada do moat?** Dados históricos, confiança acumulada, custo de troca para lojistas, inteligência contextual, densidade de rede.

**É reutilizável além do contexto imediato?** O que esta iniciativa produz pode ser aproveitado por outros módulos futuros?

**Escala naturalmente?** A solução funciona hoje e não se tornará um bloqueio com 100x o volume.

**Ainda fará sentido em dez anos?** O problema que resolve existirá independentemente de como o contexto tecnológico e de mercado evoluir?

**Reduz ou elimina algum trabalho manual recorrente?** Não obrigatório, mas iniciativas que o fazem têm valor sistêmico além do valor imediato.

---

## 5. Critérios de Priorização

Quando múltiplas iniciativas competem por capacidade, a ordem de prioridade é determinada pelo raciocínio — não por uma fórmula. O raciocínio percorre as seguintes dimensões:

### Valor

**Valor para a missão**: quanto esta iniciativa contribui para reduzir assimetria de informação? (Peso maior)

**Valor para o ecossistema**: fortalece quantos pilares simultâneos? Uma iniciativa que fortalece dados, Brain e experiência do lojista ao mesmo tempo tem valor multiplicado.

**Valor para o usuário**: qual público se beneficia, com qual intensidade, com qual frequência?

### Impacto Sistêmico

**Compounding**: o valor desta iniciativa cresce com o tempo, ou é constante? Iniciativas com valor crescente (que produzem ativos, dados ou efeitos de rede) são priorizadas sobre iniciativas com valor constante.

**Habilitadora**: esta iniciativa desbloqueia outras iniciativas? Uma iniciativa que habilita dez outras tem valor maior do que a soma dos dez valores individuais.

**Fundacional**: remove débito técnico que bloqueia evolução ou substitui solução frágil por solução sólida? Iniciativas fundacionais têm valor difícil de quantificar no presente, mas alto no futuro.

### Esforço e Risco

**Esforço real**: estimativa honesta, não otimista. Incluir incertezas.

**Reversibilidade**: iniciativas irreversíveis exigem análise mais profunda antes da aprovação — não porque sejam piores, mas porque têm custo de erro maior.

**Risco de esperar**: qual é o custo de não fazer agora? Algumas iniciativas se tornam mais difíceis — ou impossíveis — se adiadas.

### A decisão de priorização

Quando os critérios apontam em direções diferentes, a hierarquia é:

1. Valor para a missão (sempre primeiro)
2. Impacto fundacional (habilita outros; remove bloqueios)
3. Valor compounding (cresce com tempo)
4. Valor para o usuário (impacto imediato e direto)
5. Esforço e risco (contexto de execução)

---

## 6. Tipos de Decisão

Decisões têm impacto diferente e exigem processo diferente. Classificar antes de processar.

### Nível 1 — Decisões Operacionais

**Características**: baixo impacto, facilmente reversíveis, não afetam contratos ou arquitetura, não criam ativos permanentes.

**Exemplos**: ajuste de copy, mudança de layout de componente, atualização de estilo visual, refatoração de função interna, correção de bug sem impacto em contrato.

**Processo**: Filter simplificado — apenas a Pergunta Fundamental e os 4 filtros críticos. Decisão em minutos. Execução imediata.

**ADR**: não requerido.

### Nível 2 — Decisões de Produto

**Características**: impacto moderado, afetam a experiência do usuário de forma mensurável, podem criar ou remover comportamento visível, são reversíveis mas com custo de reversão não-trivial.

**Exemplos**: nova funcionalidade, mudança de fluxo de usuário, integração com serviço externo, nova página ou seção, mudança em como dados são apresentados.

**Processo**: Pipeline completo. Avaliação dos 12 Filtros. Decisão documentada (pode ser em thread, documento de spec, ou nota no PR). Tempo proporcional ao impacto.

**ADR**: recomendado quando envolve decisão de design que outros deverão respeitar.

### Nível 3 — Decisões Estratégicas

**Características**: impacto alto, alteram a arquitetura, o modelo de dados, os contratos entre módulos, o modelo de negócio, ou a identidade da plataforma. São irreversíveis ou de reversão cara.

**Exemplos**: mudança em schema de tabela existente, novo pilar de monetização, nova categoria de público, mudança em política de dados ou privacidade, substituição de componente central, nova parceria que altera posicionamento.

**Processo**: Pipeline completo com análise profunda em cada estágio. Consulta explícita aos documentos da Foundation relevantes. Decisão documentada em ADR antes de qualquer implementação. Revisão antes de merge.

**ADR**: obrigatório.

---

## 7. Critérios para Dizer "Não"

Uma decisão de "não" bem fundamentada é tão valiosa quanto uma decisão de "sim". Ela preserva capacidade para iniciativas corretas e evita débito — técnico, de produto e estratégico — acumulado por iniciativas erradas.

Rejeitar quando:

**Não há problema identificável.** A iniciativa começa com uma solução e procura um problema para justificá-la. "Seria interessante ter" não é um problema.

**Copia concorrente sem propósito.** Implementar porque "os outros têm" ou "os usuários podem esperar que tenhamos" sem evidência de que resolve um problema real do ParaguAI especificamente.

**Nenhum público se beneficia de forma clara.** Uma funcionalidade que pode ser usada por todos mas não é claramente útil para nenhum específico tem proposta de valor vaga.

**Adiciona complexidade à experiência sem reduzir incerteza.** Mais opções, mais configurações, mais passos num fluxo — sem que nenhum deles reduza a incerteza que o usuário tem.

**Compromete neutralidade.** Qualquer iniciativa que, mesmo indiretamente, favorece um participante sobre outro por razão que não seja qualidade verificável.

**Gera débito técnico sem plano de resolução.** Débito intencional é aceitável com plano documentado. Débito sem plano é inaceitável.

**Viola uma Regra Permanente da Constituição.** As Regras são invioláveis enquanto vigentes. Violar silenciosamente é diferente de revisar formalmente — a primeira é proibida, a segunda é o processo correto.

**Não tem usuário real.** Uma funcionalidade desenvolvida sem um usuário específico em mente é uma funcionalidade que existe para o time, não para a plataforma.

**O custo supera o valor de forma clara.** Algumas iniciativas são certas no direção mas custosas demais para o momento. "Sim, mas não agora" é uma resposta válida.

---

## 8. Critérios para Dizer "Sim"

Acelerar quando:

**Fortalece um ativo estratégico de forma compounding.** Catálogo, histórico, Merchant Score, Brain, SEO — iniciativas que enriquecem um desses ativos crescem em valor ao longo do tempo.

**Habilita múltiplas iniciativas futuras.** Um módulo que desbloqueia dez outras funcionalidades tem valor multiplicado pelo conjunto que habilita.

**Reduz assimetria de informação de forma mensurável.** O comprador sabe algo que não sabia. O lojista vê algo que não via. O turista planeja algo que seria improvável sem a plataforma.

**Remove gargalo que cresce com o volume.** Uma solução que funciona com 1.000 produtos mas começa a falhar com 100.000 é um gargalo que cresce com o sucesso — remover isso antecipadamente tem alto valor.

**Fortalece o efeito de rede.** Mais lojas tornam o produto melhor para compradores, que atraem mais lojas. Qualquer iniciativa que fortaleça esse ciclo tem valor sistêmico.

**É reversível com baixo custo.** Iniciativas de baixo risco e alto potencial devem ser aprovadas rapidamente para aprender. A velocidade de aprendizado é um ativo.

**Existe evidência de comportamento que a demanda.** Buscas sem resultado, fluxos abandonados, dados de engajamento — evidência comportamental de demanda real.

**Cria vantagem que não pode ser copiada rapidamente.** Dados históricos acumulados, confiança de lojistas estabelecida, integração profunda com fluxos de trabalho — vantagens que dependem de tempo e não podem ser replicadas em semanas.

---

## 9. Conflitos Entre Critérios

Nenhum sistema de critérios elimina conflito. Quando critérios colidem, a resolução segue uma hierarquia clara.

### Velocidade versus Qualidade

**Resolução**: velocidade em decisões Tipo 2 (reversíveis); qualidade em decisões Tipo 1 (irreversíveis). O critério de classificação é "qual é o custo real de voltar atrás?" — não o tamanho da iniciativa ou o prazo disponível.

Uma mudança de layout pode ser feita rápido e corrigida rápido. Um schema de dados que muda o modelo de ofertas exige análise profunda independentemente do prazo.

### Curto Prazo versus Longo Prazo

**Resolução**: longo prazo prevalece em decisões arquiteturais e de dados. Curto prazo pode prevalecer em decisões de experiência, desde que a solução de curto prazo não bloqueie a de longo prazo.

A pergunta-chave: a solução de curto prazo pode ser substituída pela de longo prazo sem custo de migração? Se sim, implementar agora. Se não — se a solução de curto prazo se tornará legacy que bloqueia a evolução — projetar com o longo prazo desde o início.

### Receita versus Confiança

**Resolução**: confiança sempre. Sem exceção.

A assimetria é fundamental: receita perdida pode ser recuperada com novos modelos de monetização. Confiança perdida — com usuários que descobriram manipulação, com lojistas que foram prejudicados, com o mercado que perdeu a percepção de neutralidade — não tem caminho de recuperação equivalente.

Esta não é uma posição ingênua sobre modelos de negócio. É uma posição estratégica: a plataforma vale o que vale porque é confiável. Uma plataforma que maximiza receita no curto prazo sacrificando confiança está destruindo o ativo que a torna valiosa.

### Automação versus Controle Humano

**Resolução**: automatizar quando o resultado pode ser determinado por dados e regras verificáveis. Preservar controle quando o resultado depende de contexto que só o humano tem.

Quando há dúvida sobre qual dos dois casos se aplica, preservar o controle humano com auditabilidade. Uma automação que pode ser revisada e corrigida é melhor do que uma que não pode.

### Completude versus Entrega

**Resolução**: entregar incrementos que funcionam de forma coerente, não fragmentos que prometem coerência futura. Uma funcionalidade incompleta que entrega valor real é melhor do que uma promessa de funcionalidade completa futura.

A exceção: funcionalidades de infraestrutura que não têm valor visível até que estejam completas. Essas exigem compromisso de conclusão antes de qualquer uso em produção — funcionalidade de infraestrutura pela metade é pior do que nenhuma.

### Foundation versus Circunstância

**Resolução**: a Foundation prevalece. Circunstâncias excepcionais (prazo de negócio, pressão competitiva, oportunidade de mercado) podem justificar prioridade diferente — mas nunca justificam violar os princípios permanentes.

Quando a circunstância parecer justificar uma exceção a um princípio, o processo correto é: documentar explicitamente a exceção e por que foi feita, não implementar silenciosamente como se a exceção não existisse. Exceções documentadas são aprendizado. Exceções silenciosas são erosão.

---

## 10. Checklist Obrigatório

Para qualquer iniciativa significativa — Release, ADR, funcionalidade de Nível 2 ou 3, integração, mudança arquitetural — preencher este checklist antes de iniciar a implementação.

O checklist é um documento, não uma aprovação burocrática. Preenchê-lo é o ato de pensar a decisão de forma estruturada.

---

**CHECKLIST DE DECISÃO — ParaguAI**

**Iniciativa**: [descrever em uma frase]  
**Tipo**: [ ] Nível 1 — Operacional / [ ] Nível 2 — Produto / [ ] Nível 3 — Estratégico  
**Data**: ____

---

**Filtros Críticos** (resposta "não" bloqueia)

- [ ] Resolve um problema real e identificável?
- [ ] Melhora a decisão de algum usuário?
- [ ] Não compromete a confiança dos usuários?
- [ ] Não viola nenhuma Regra Permanente da Constituição?

**Pergunta Fundamental**

- [ ] Reduz assimetria de informação ou fortalece a infraestrutura que reduz?

**Pipeline** (para Nível 2 e 3)

- [ ] Problema descrito com especificidade (quem, frequência, custo atual)?
- [ ] Valor gerado identificado (ativo / dado / problema resolvido)?
- [ ] Alinhado com a missão da Constituição?
- [ ] Passou pelos filtros da North Star?
- [ ] Impacto no Business Model avaliado?
- [ ] Coerente com a Vision 2035?
- [ ] Alinhado com Engineering Principles?
- [ ] Alinhado com Product Principles?
- [ ] Custo real estimado? Reversibilidade avaliada?

**Decisão**

- [ ] ✅ Implementar — motivo: ____
- [ ] ⏸ Revisar — o que precisa mudar: ____
- [ ] ❌ Não implementar — motivo: ____

**ADR necessário?** [ ] Sim (Nível 3 ou decisão de design que outros devem respeitar) / [ ] Não

---

## 11. Anti-Patterns de Decisão

Anti-Patterns são erros de processo que produzem decisões aparentemente razoáveis mas estruturalmente erradas. São mais difíceis de detectar do que os critérios do Filter — porque frequentemente parecem positivos no momento em que acontecem.

**Feature por vaidade.** Implementar porque é impressionante, não porque resolve um problema. Sintoma: a iniciativa é descrita em termos do que faz, não do problema que resolve. Correção: forçar a descrição do problema antes de qualquer discussão sobre solução.

**Arquitetura por moda.** Adotar padrão arquitetural porque é atual ou porque "todo mundo está usando", sem verificar se resolve um problema real no contexto específico do ParaguAI. Correção: o problema que o padrão resolve deve ser articulado antes de avaliar se o padrão é adequado.

**Escalonamento prematuro.** Projetar para um volume que não existe e que pode nunca existir, adicionando complexidade que reduz velocidade presente para um benefício futuro hipotético. Correção: escalar a solução existente até que o problema de escala seja real e mensurável.

**Automação desnecessária.** Automatizar um processo porque é tecnicamente possível, não porque o custo de não automatizar justifica o custo de implementar e manter a automação. Correção: calcular o custo real do processo manual antes de propor automação.

**Duplicação de solução.** Implementar uma segunda solução para um problema que já tem solução, porque a primeira é inconveniente de usar ou estender. Correção: investir na melhoria da solução existente antes de criar uma segunda.

**Tecnologia acima do problema.** Escolher a abordagem técnica antes de entender o problema, e então forçar o problema a caber na abordagem escolhida. Correção: o problema define a solução, nunca o contrário.

**Consenso por exaustão.** Tomar uma decisão porque todos pararam de questionar, não porque a melhor resposta foi encontrada. Sintoma: a decisão "emergiu" sem que o Pipeline tenha sido percorrido. Correção: toda decisão significativa tem uma decisão explícita com raciocínio documentado.

**Urgência fabricada.** Justificar a ausência de processo com "não temos tempo" para decisões que, se tomadas erradas, custarão muito mais tempo para desfazer do que o processo economizaria. Correção: o custo de fazer errado é sempre maior do que o custo do Filter.

**Exceção que vira regra.** Fazer uma exceção documentada para uma circunstância específica, e então tratar a exceção como precedente para situações diferentes. Correção: exceções são documentadas com seus motivos específicos; um motivo diferente exige nova avaliação, não invocação do precedente.

**Decisão pela ausência de questionamento.** "Ninguém objetou, então vamos em frente" — em contextos onde o silêncio pode representar deferência, falta de contexto ou falta de segurança para questionar. Correção: para decisões Nível 3, o processo inclui verificação explícita dos estágios do Pipeline — não depende de objeção espontânea.

---

## 12. O Compromisso

O Decision Filter existe porque boas intenções não garantem boas decisões. Equipas com boas intenções tomam decisões ruins sob pressão, sob empolgação, sob influência de incentivos de curto prazo. O Filter é o mecanismo pelo qual o compromisso com a Foundation se mantém mesmo quando é inconveniente.

O compromisso permanente de qualquer engenheiro, produto ou IA trabalhando no ParaguAI:

**Nenhuma decisão importante é tomada impulsivamente.** O Pipeline existe para ser percorrido, mesmo que rapidamente. Seu valor não está em ser exaustivo — está em introduzir o teste de longo prazo antes da implementação.

**"Não" é tão válido quanto "Sim".** Uma decisão de não implementar, bem fundamentada, protege a capacidade da plataforma de evoluir na direção certa. Não é conservadorismo — é fidelidade à missão.

**Exceções são documentadas, nunca silenciosas.** Quando a circunstância justifica exceção a um princípio, a exceção é registrada com seu motivo. A Foundation evolui por revisão formal — não por erosão silenciosa.

**O ParaguAI nunca cresce sacrificando confiança, simplicidade, neutralidade, qualidade ou visão de longo prazo.** Quando qualquer dessas propriedades entra em conflito com crescimento de curto prazo, as propriedades prevalecem. Não como regra rígida — como estratégia de longo prazo.

---

## O Sistema Completo da Foundation

Com este documento, a Foundation do ParaguAI forma um sistema de decisão completo:

| Documento | Responde | Quando consultar |
|---|---|---|
| `AI_CONSTITUTION.md` | Quem somos | Sempre que uma decisão toca identidade, missão ou regras |
| `NORTH_STAR.md` | Como decidimos | Sempre que há trade-off ou priorização |
| `BUSINESS_MODEL.md` | Como criamos valor | Quando a decisão toca monetização, crescimento ou moat |
| `VISION_2035.md` | Para onde vamos | Quando a decisão tem implicações de longo prazo |
| `ENGINEERING_PRINCIPLES.md` | Como construímos | Quando a decisão é técnica ou arquitetural |
| `PRODUCT_PRINCIPLES.md` | Como construímos produtos | Quando a decisão toca experiência ou funcionalidade |
| `DECISION_FILTER.md` | Como aprovamos decisões | Antes de qualquer iniciativa significativa |

O Decision Filter é o ponto de entrada operacional da Foundation. Não substitui nenhum dos seis documentos anteriores — os invoca, na sequência correta, para a decisão específica em análise.

---

*Este documento não existe para dificultar decisões. Existe para garantir que as decisões que tomamos são as que queríamos tomar — depois de verificar o que sabemos sobre quem somos, o que valorizamos e para onde estamos indo.*
