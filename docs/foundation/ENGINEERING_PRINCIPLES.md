# ENGINEERING_PRINCIPLES.md
# Como Construímos Tecnologia

**Versão**: 1.0  
**Criado**: 2026-06-27  
**Status**: Permanente — Foundation 0.5  
**Prioridade**: Quinto documento do núcleo estratégico. Leia os quatro documentos anteriores da Foundation antes deste.

---

## Preâmbulo

A Constituição estabelece regras operacionais de engenharia. Este documento estabelece algo diferente: a **filosofia** que as gera.

Regras descrevem o que fazer. Filosofia explica por que — e permite derivar as regras certas quando surgem situações que as regras existentes não cobrem. Um engenheiro que entende apenas as regras para quando o caso novo aparece. Um engenheiro que entende a filosofia sabe como pensar o caso novo.

Este documento não cita tecnologias específicas. Qualquer tecnologia que usamos hoje pode ser substituída. Os princípios que guiam como escolhemos e usamos tecnologias devem sobreviver a essas substituições.

---

## 1. Filosofia de Engenharia

**Tecnologia é um meio. Nunca um fim.**

A plataforma existe para reduzir a assimetria de informação na Tríplice Fronteira. Cada decisão técnica é julgada por quanto aproxima ou afasta essa missão — não por quanto é tecnicamente elegante, atual ou sofisticada.

Engenharia de qualidade não é engenharia que usa as melhores tecnologias do mercado. É engenharia que permite evolução contínua da plataforma com custo decrescente ao longo do tempo. Um sistema que exige esforço heroico para manter é um sistema mal projetado — independentemente de quão impressionante é sua stack.

A medida correta de uma decisão técnica é: **este sistema estará mais fácil ou mais difícil de mudar em dois anos?** Decisões que tornam o sistema mais difícil de mudar acumulam débito. Decisões que mantêm ou aumentam a capacidade de mudança compõem.

**O paradoxo da velocidade:** sistemas construídos rapidamente com pouca atenção a fundação ficam lentos ao longo do tempo. Sistemas construídos com atenção a contratos, modularidade e qualidade ficam mais rápidos — porque cada Release aproveita a fundação da anterior. Velocidade sustentada é consequência de arquitetura, não de urgência.

---

## 2. Arquitetura Evolutiva

Um sistema bem projetado deve ser **mais fácil de mudar em três anos do que é hoje**.

Isso não é uma expectativa utópica — é uma consequência de decisões específicas de design: módulos com responsabilidades bem delimitadas, contratos explícitos entre eles, e ausência de acoplamento implícito.

### Composição sobre configuração

Sistemas compostos de partes pequenas e coesas podem crescer em qualquer direção sem reescrever o que já funciona. Sistemas construídos como monolitos configuráveis tornam-se frágeis quando os casos de uso crescem além da configuração prevista.

Um novo módulo deve poder ser adicionado ao sistema sem modificar os módulos existentes. Quando adicionar uma nova peça exige modificar várias partes existentes, é um sinal de que os contratos entre módulos estão mal definidos.

### Baixo acoplamento, alta coesão

Baixo acoplamento: um módulo pode mudar sua implementação interna sem que seus consumidores precisem saber ou se adaptar.

Alta coesão: tudo que pertence a uma responsabilidade está no mesmo lugar. Lógica distribuída entre módulos que deveriam ser um só é débito de localização — quando o comportamento precisa mudar, é difícil saber onde mudá-lo.

O teste de acoplamento: **se mudar a implementação interna de um módulo exigir mudança nos consumidores, o contrato está vazando detalhes de implementação.**

### Contratos são mais importantes que implementações

A implementação de um módulo pode ser reescrita. O contrato que ele expõe aos consumidores é muito mais difícil de mudar sem impacto em cascata. Por isso, contratos merecem mais atenção de design do que implementações.

Um contrato mal definido hoje é uma restrição permanente amanhã. Um contrato bem definido hoje permite que a implementação evolua livremente enquanto os consumidores permanecem estáveis.

---

## 3. Simplicidade como Estratégia

**A solução mais simples que permanece correta é a preferida.**

Complexidade deve ser conquistada — e somente adotada quando a solução simples prova ser insuficiente. A tendência de adicionar complexidade preventiva (para casos que podem nunca acontecer) é um dos principais geradores de débito técnico.

### O custo composto da complexidade

Toda complexidade adicionada a um sistema tem custo permanente: tempo de onboarding para novos engenheiros, superfície de bug expandida, dificuldade de teste, lentidão de modificação. Esses custos não são pagos uma vez — são pagos em cada interação futura com o sistema.

Complexidade é justificada quando os custos que evita superam os que introduz. O problema é que os custos que evita são hipotéticos e futuros; os custos que introduz são reais e imediatos. O viés natural é subestimar o custo da complexidade.

### Complexidade legítima vs. complexidade acidental

Complexidade legítima existe porque o problema é genuinamente complexo. O algoritmo de ranking de ofertas tem que balancear múltiplas dimensões com pesos diferentes — isso é complexidade do problema, não do código.

Complexidade acidental existe porque a solução foi mal projetada, acrescentada incrementalmente sem revisão, ou copiada de um contexto diferente sem adaptação. Essa é a complexidade que deve ser ativamente eliminada.

### Critério de eliminação

Antes de aceitar complexidade em qualquer sistema, responder:
1. Que problema específico esta complexidade resolve que a versão simples não resolvia?
2. A complexidade fica contida dentro de um módulo ou se espalha para consumidores?
3. Existe uma caminho claro para simplificar quando o problema crescer além desta solução?

Se a resposta ao item 1 for vaga, a complexidade é acidental.

---

## 4. Sistemas Orientados a Ativos

**Módulos não existem apenas para resolver problemas. Existem para produzir ativos.**

Um módulo que resolve um problema mas não deixa nada reutilizável tem retorno de curto prazo. Um módulo que resolve um problema e produz um ativo que outros módulos consomem tem retorno composto.

### O que é um ativo de sistema

Um ativo de sistema é uma abstração — um catálogo normalizado, um mecanismo de scoring, um pipeline de importação, um motor de busca, um sistema de rastreabilidade de preços — que pode ser consumido por múltiplos módulos sem que cada um precise reimplementar a lógica.

O catálogo de produtos é um ativo: criado uma vez, consumido pela busca, pela comparação, pelas recomendações, pelo SEO, pelo Brain e pelo Merchant OS. O custo marginal de um novo módulo que usa o catálogo é próximo de zero.

O pipeline de importação é um ativo: implementado uma vez, cada novo conector de loja custa uma fração do primeiro porque reutiliza validação, normalização, deduplicação e escrita.

### O critério de design para ativos

Antes de implementar qualquer módulo, responder: **quais são os dois ou três outros módulos que poderão consumir o que este módulo produz, sem que precisem reimplementar nada?**

Se a resposta for "nenhum", o módulo provavelmente está sendo projetado como solução específica quando deveria ser projetado como ativo. Redesenhar antes de implementar é sempre mais barato do que refatorar depois.

### Ativos compõem; features somam

Uma plataforma construída de ativos que compõem cresce em capacidade de forma não-linear: cada novo ativo amplifica todos os anteriores. Uma plataforma construída de features que somam cresce linearmente — cada nova feature é um item independente que não melhora os outros.

A diferença entre as duas não é filosófica — é mensurável. Qual é o custo de implementar a décima feature comparado com a primeira? Em uma plataforma de ativos, o custo cai. Em uma plataforma de features, permanece constante ou cresce.

---

## 5. Dados como Contrato

**Dados não pertencem às interfaces. Interfaces consomem dados.**

Esta inversão de perspectiva tem consequências profundas. Quando a interface "possui" os dados que exibe, cada mudança de interface requer mudança nos dados. Quando os dados têm forma, ciclo de vida e propriedade independentes da interface, interfaces podem ser substituídas sem que os dados precisem mudar.

### Propriedades permanentes de um dado

**Origem**: todo dado tem uma fonte. Dados derivados têm uma cadeia de transformações rastreável até a fonte primária. Quando um preço muda, é possível responder: de onde veio esse preço, quando chegou, e o que era antes.

**Ciclo de vida**: dados nascem, são transformados, tornam-se histórico e eventualmente são arquivados. Cada fase tem propriedades diferentes. Dados ativos são diferentes de dados históricos — que são diferentes de dados arquivados. O sistema trata cada fase de forma apropriada, nunca confundindo as três.

**Propriedade**: todo dado tem exatamente um módulo responsável por sua validade. Múltiplos módulos podem ler um dado; apenas um é responsável por garantir sua correção. Quando um dado está incorreto, é sempre claro quem deve corrigi-lo.

**Imutabilidade histórica**: dados que representam algo que aconteceu no passado não são sobrescritos — são sucedidos. Um preço de ontem não é deletado quando o preço de hoje chega; ele torna-se histórico. Histórico não apagável é um princípio, não uma convenção.

### O contrato de dados entre módulos

Quando um módulo produz um dado que outro consume, esse dado é um contrato. O módulo produtor garante: forma, frescor e completude. O módulo consumidor espera exatamente isso — nem mais, nem menos.

Contratos de dados que não são explicitados tornam-se acoplamento implícito: o módulo consumidor depende de detalhes de implementação do produtor que nunca foram documentados como contrato. Esse acoplamento só é descoberto quando a implementação do produtor muda e o consumidor quebra.

O schema do banco é o contrato mais fundamental de todos — mudá-lo é uma decisão de engenharia com o mesmo rigor de qualquer outro contrato. Ver `docs/engineering/DATABASE_ENGINEERING.md` (Database Migration System V2) para o padrão permanente de migrations, verificação, rollback e automação via Supabase CLI.

---

## 6. APIs e Fronteiras de Módulo

**As fronteiras entre módulos são as decisões arquiteturais mais importantes.**

O que vai dentro de um módulo vs. o que cruza sua fronteira determina quanto o sistema pode evoluir sem reescrita. Fronteiras mal colocadas — que expõem detalhes de implementação, que acoplam módulos por comportamento interno, que criam dependências circulares — tornam-se restrições permanentes.

### Princípios de fronteiras

**Fronteiras estáveis, implementações mutáveis.** Um consumidor de um módulo não deve precisar mudar quando a implementação interna do módulo muda. Se muda, a fronteira está vazando implementação.

**Contrato explícito antes de implementação.** O contrato de um módulo — o que ele recebe, o que retorna, quais erros produz — é definido antes de sua implementação. Isso força clareza sobre responsabilidades antes que o código torne os limites difíceis de mudar.

**Evolução compatível.** Contratos evoluem — novas capacidades são adicionadas, comportamentos anteriores são depreciados. A regra: adições são não-breaking; remoções exigem período de depreciação que respeita o tempo dos consumidores para migrar.

**Falha explícita na fronteira.** Um módulo que falha em satisfazer seu contrato deve comunicar isso explicitamente — com tipo de falha, contexto e, quando possível, dado de entrada que causou a falha. Falhas silenciosas que cruzam fronteiras produzem comportamentos impossíveis de diagnosticar.

### Dependência unidirecional

Módulos de alto nível não dependem de módulos de baixo nível — ambos dependem de abstrações. Inversões de dependência que parecem convenientes a curto prazo criam acoplamento circular que impede que qualquer dos dois módulos seja modificado ou substituído independentemente.

O teste de dependência unidirecional: se o módulo A depende do módulo B, é possível substituir B por uma implementação diferente sem que A saiba? Se não, a dependência está em nível errado de abstração.

---

## 7. Escalabilidade

**Toda solução deve funcionar hoje e ser desenhada para uma escala que parece impossível agora.**

Isso não é premature optimization. É a distinção entre decisões de design que são O(1) ou O(log n) em relação ao crescimento vs. decisões que são O(n) ou O(n²). Essa diferença raramente importa no início; é determinante quando o volume chega.

### O que escala e o que não escala

**Não escala:** lógica de negócio dentro de loops sobre todos os registros. Queries que buscam tudo e filtram na aplicação. Dependências síncronas em cadeia onde cada passo espera pelo anterior. Cache que cresce sem limite. Processos que assumem que dados cabem em memória.

**Escala:** operações que o banco de dados executa (filtros, ordenações, agregações). Lotes com tamanho máximo definido. Processamento assíncrono onde o trabalho pode ser distribuído. Paginação que limita o volume de dado por operação. Índices que tornam buscas O(log n) independentemente do volume.

### Desacoplamento como pré-condição de escala

Componentes acoplados escalam juntos — e as restrições do mais lento determinam o limite de todo o sistema. Componentes desacoplados escalam independentemente: o pipeline de importação pode processar sem bloquear a API de leitura; a geração de analytics pode rodar sem impactar a experiência do usuário em tempo real.

Desacoplamento também permite recuperação parcial: quando um componente falha, os outros continuam operando com o que têm, degradando graciosamente em vez de falhar completamente.

### Idempotência como pré-condição de scale-out

Qualquer operação que pode ser distribuída ou reprocessada deve ser idempotente — executar duas vezes produz o mesmo resultado que executar uma. Operações não-idempotentes em sistemas distribuídos produzem estados inconsistentes quando o processamento é retomado após falha.

Idempotência não é uma propriedade que se adiciona depois. É uma propriedade que se projeta na operação desde o início, porque adicioná-la retroativamente exige revisão completa de como o estado é gerenciado.

---

## 8. Observabilidade

**Um sistema que não pode ser observado não pode ser confiado.**

Observabilidade não é logging de erros. É a capacidade de entender o comportamento do sistema em qualquer estado — incluindo estados que não foram antecipados — sem precisar modificar o código para investigar.

### Os três pilares

**Logs**: registro narrativo de eventos. O que aconteceu, em que ordem, com que contexto. Logs úteis têm estrutura (não apenas texto livre), têm nível de severidade consistente e incluem contexto suficiente para investigação sem acesso adicional ao código.

**Métricas**: medições numéricas ao longo do tempo. Taxa de processamento, latência de operações, volume de erros por tipo, tamanho de filas. Métricas permitem responder "como o sistema está se comportando agora?" e "como esse comportamento mudou ao longo do tempo?"

**Rastreabilidade**: capacidade de seguir um evento específico — uma importação, uma mudança de preço, uma busca de usuário — através de todos os componentes que o processaram. Sem rastreabilidade, é impossível diagnosticar por que um comportamento específico aconteceu.

### Observabilidade de automações

Automações que operam sem observabilidade são automações que falham silenciosamente. Todo processo automatizado deve emitir: quantidade de itens processados com sucesso, quantidade de falhas com contexto de cada uma, tempo total de execução, e estado final do sistema após a execução.

Automação sem observabilidade não é automação — é uma caixa preta que eventualmente vai produzir surpresas desagradáveis em produção.

### Design para investigação

Quando um comportamento inesperado acontece em produção, a primeira pergunta é: "quais dados temos para investigar isso sem modificar o sistema?" Se a resposta for "poucos", o sistema não foi projetado para observabilidade.

Projetar para investigação significa: estruturar logs para que sejam consultáveis, emitir métricas antes que seja necessário debugar, e garantir que o contexto de uma operação pode ser reconstruído post-hoc a partir dos dados disponíveis.

---

## 9. Automação

**Todo processo manual é uma automação pendente.**

Não uma meta futura vaga — uma dívida específica que cresce a cada vez que o processo manual é executado. O custo de manter um processo manual inclui: tempo humano, risco de erro, variabilidade de resultado e ausência de rastreabilidade automática.

### Quando automatizar

A decisão de automatizar não é binária e não depende apenas de frequência. Um processo executado raramente mas com alto risco de erro humano é candidato a automação. Um processo executado com frequência mas que gera dados insubstituíveis de contexto humano pode ser mantido manual com augmentation.

O critério: **este processo pode ser executado de forma confiável, a qualquer hora, sem supervisão humana, produzindo resultado verificável?** Se sim, é candidato a automação total. Se não, identificar o que impede isso e resolver uma barreira de cada vez.

### Propriedades de automações bem projetadas

**Idempotente**: executar duas vezes produz o mesmo estado que executar uma. Sem isso, reexecução após falha cria estado inconsistente.

**Dry-run como padrão**: toda automação que escreve estado deve ter modo de simulação que descreve o que faria sem efetivamente fazê-lo. Dry-run não é uma feature adicional — é um requisito de qualidade.

**Falha explícita e ruidosa**: quando uma automação falha, falha alto. Logs claros, métricas de falha, alertas quando relevante. Uma automação que falha silenciosamente é mais perigosa do que nenhuma automação.

**Rollback ou compensação**: operações irreversíveis requerem estratégia de compensação caso falhem no meio. O estado deve sempre ser recuperável a um ponto consistente anterior.

**Escopo delimitado**: cada automação tem exatamente o mínimo de permissão necessário para sua função. Uma automação que atualiza preços não precisa de acesso a dados de usuários.

---

## 10. Inteligência Artificial

**IA não é um módulo. É uma capacidade transversal.**

Isso tem implicações de design que diferem fundamentalmente de como outros módulos são tratados. Um módulo de busca é adicionado ao sistema; a capacidade de IA é tecida em todos os módulos existentes.

### Dados como insumo de inteligência

Todo componente que processa dados deve ser projetado com a pergunta: **que conhecimento único este componente tem, e como esse conhecimento pode ser exposto para alimentar inteligência futura?**

O pipeline de importação sabe quando dados chegaram, de qual fonte, com qual qualidade inicial e quais transformações foram necessárias — esses metadados alimentam modelos de confiança de fonte. O motor de busca sabe o que foi buscado, o que foi encontrado e o que não foi — esses dados alimentam modelos de gap de catálogo e de intenção de compra.

Um componente que processa dados sem expor o conhecimento que adquire está deixando inteligência potencial inutilizada.

### IA como camada de amplificação, não substituição

IA amplifica o que o sistema já faz bem — torna a busca mais relevante, o ranking mais preciso, as recomendações mais personalizadas. Não substitui a qualidade dos dados subjacentes.

Um modelo de recomendação sobre dados de baixa qualidade produz recomendações de baixa qualidade com alta confiança — que é pior do que recomendações explicitamente incertas. A qualidade da inteligência é limitada pela qualidade dos dados que a alimentam.

**Consequência de design**: investimento em qualidade de dados nunca é competição com investimento em IA — é pré-requisito para que o investimento em IA tenha retorno.

### Modelos como contratos

Modelos de IA têm entradas e saídas. As entradas são dados produzidos por outros módulos; as saídas são dados consumidos por outros módulos. Isso significa que modelos têm contratos — assim como qualquer outro componente do sistema.

Um modelo que muda seu comportamento sem comunicar a mudança aos consumidores é um módulo sem contrato definido. A mesma disciplina aplicada a APIs deve ser aplicada a modelos: contratos explícitos, evolução comunicada, depreciação respeitosa.

---

## 11. Evolução Contínua

**Cada Release deve deixar a arquitetura em melhor estado do que a encontrou.**

Isso não é uma aspiração — é um requisito. Uma Release que apenas adiciona funcionalidades sem melhorar a fundação está consumindo crédito de qualidade que eventualmente precisa ser pago com juros.

### O que significa "melhor estado"

- Contratos de módulo mais explícitos do que eram antes
- Menos código duplicado do que havia antes
- Mais cobertura de observabilidade do que havia antes
- Débito técnico documentado agora também tem plano de resolução
- O próximo engenheiro que trabalhar nesta área encontra o sistema mais compreensível do que estava

"Melhor estado" não significa "mais features". Significa arquitetura que resiste melhor ao tempo do que resistia antes da Release.

### Débito técnico como investimento consciente

Débito técnico não é necessariamente ruim. É ruim quando é acidental (resultado de pressa ou descuido), quando é invisível (não documentado, não reconhecido), ou quando cresce sem plano de resolução.

Débito técnico intencional — uma simplificação temporária adotada conscientemente para cumprir um prazo importante, com plano de resolução documentado — é uma decisão de negócio legítima. A diferença entre débito intencional e acidental é documentação e intenção.

### O horizonte correto de refatoração

Refatorar código funcional sem motivo técnico específico é desperdício. Refatorar antes de adicionar nova funcionalidade sobre a área relevante é investimento — porque a alternativa é adicionar funcionalidade sobre base ruim, tornando futura refatoração ainda mais cara.

O horizonte de refatoração correto: **quando precisar adicionar ou modificar comportamento em uma área, deixá-la em melhor estado do que estava antes de qualquer modificação.**

---

## 12. Qualidade

**Qualidade não é uma etapa final. É uma propriedade de design.**

Um sistema que requer esforço heroico de qualidade ao final de cada ciclo de desenvolvimento é um sistema onde qualidade não foi uma propriedade do processo — foi uma remediação. Remediar qualidade é sempre mais caro do que projetar com qualidade desde o início.

### Qualidade como design constraint

Testabilidade é um critério de design, não de teste. Um componente que é difícil de testar é um componente que foi projetado com acoplamento alto ou responsabilidade vaga. Redesenhar o componente até que seja fácil de testar melhora o design — o teste é consequência, não o objetivo.

Legibilidade é um critério de design, não de style. Código que requer contexto extenso para ser compreendido é código que depende de conhecimento implícito que não foi explicitado. Tornar o código legível sem esse contexto é, frequentemente, o ato de tornar o design mais claro.

Previsibilidade é um critério de design. Um componente que pode produzir resultados diferentes dado o mesmo input é um componente não-determinístico — que pode ser intencionalmente não-determinístico (recomendações com randomness controlada) ou acidentalmente não-determinístico (bug). A diferença deve ser sempre explícita.

### Zero warnings como proxy de qualidade

Warnings são bugs diferidos. Um warning que o compilador, linter ou checagem estática emite mas que é ignorado é uma escolha explícita de adicionar risco ao sistema. Projetos saudáveis mantêm zero warnings não porque a regra exige, mas porque cada warning que aparece é investigado e resolvido — ou a regra que o gerou é revisada conscientemente.

### Documentação como entregável

Código sem documentação de comportamento esperado é código que existe em um único ponto de conhecimento: a cabeça de quem o escreveu. Quando esse ponto de conhecimento fica indisponível, o custo de trabalhar com o código aumenta.

Documentação relevante não descreve o que o código faz (isso o código já faz). Documenta: por que a decisão foi tomada desta forma e não de outra, quais são as pré-condições que o código assume, e quais são os comportamentos nos casos de borda.

---

## 13. Segurança

**Segurança por padrão. Não por adição.**

Um sistema que começa aberto e adiciona segurança progressivamente tem um modelo de segurança com lacunas. Um sistema que começa restrito e abre acesso conforme necessário tem um modelo de segurança coerente.

### Menor privilégio

Todo componente tem acesso apenas ao que precisa para sua função. Um módulo que lê catálogos públicos não precisa de credenciais que permitem escrita. Um processo que atualiza preços não precisa de acesso a dados de usuários. Quanto menor o escopo de acesso, menor o raio de impacto de uma comprometimento.

Menor privilégio não é apenas uma propriedade de credenciais — é uma propriedade de design. Módulos que têm acesso a mais dados do que precisam para sua função são módulos que violam o princípio de menor privilégio em nível de design, não apenas de configuração.

### Defesa em profundidade

Nenhuma camada de segurança é suficiente sozinha. Assuma que qualquer camada pode ser comprometida e projete a próxima como se a anterior não existisse.

Isso significa: validação de entrada em toda fronteira de sistema, mesmo quando a entrada veio de um módulo interno confiável. Autorização verificada em toda operação que acessa dados sensíveis, mesmo quando o usuário foi autenticado em etapa anterior. Auditoria de toda mutação de dado relevante, mesmo quando o processo que a fez é interno e confiável.

### Validação em fronteiras

Dados externos são dados não-confiáveis até que sejam validados. Isso inclui: entradas de usuário, dados de APIs externas, dados importados de fontes parceiras, e — importante — dados vindos de outros módulos do próprio sistema que cruzaram uma fronteira.

Validação em fronteira não é paranoia — é o reconhecimento de que qualquer sistema pode ter bugs, e que validar na fronteira garante que bugs de um módulo não se propagam silenciosamente para outros.

### Privacidade como restrição de design

Dados que não deveriam ser acessíveis por determinados agentes não devem chegar até eles — nem mesmo para serem filtrados. Um sistema que busca todos os dados e então filtra os sensíveis está expondo dados sensíveis à camada que filtra. Um sistema projetado com privacidade como restrição nunca recupera dados que não deveriam estar disponíveis.

---

## 14. Resiliência

**Sistemas falham. A questão é como.**

Resiliência não é ausência de falha — é capacidade de falhar de forma previsível, comunicada e recuperável. Um sistema que nunca falha não existe; um sistema que falha graciosamente é o objetivo.

### Falha previsível

Cada componente tem modos de falha conhecidos e documentados. Quando o banco de dados fica indisponível, o serviço de leitura retorna um estado vazio com indicação explícita de indisponibilidade — não um erro genérico, não um timeout não-tratado. Quando uma fonte externa não responde, o processo de importação loga o estado e retorna sem comprometer o restante do pipeline.

Falhas imprevisíveis acontecem quando os modos de falha não foram considerados no design. Cada falha não antecipada em produção deve gerar reflexão: por que não foi antecipada, como o sistema pode ser modificado para torná-la previsível, e como detectá-la mais rápido na próxima vez.

### Degradação graciosa

A falha de um componente não deve derrubar componentes não relacionados. Um pipeline de importação com falha não deve afetar a busca de produtos. Um serviço de analytics indisponível não deve impedir o carregamento de páginas de produto.

Degradação graciosa é projetada, não acidental. Significa identificar quais componentes são críticos (sem os quais o sistema não tem valor) e quais são aditivos (que melhoram a experiência quando disponíveis), e projetar o sistema para que os aditivos sejam removíveis sem impacto nos críticos.

### Recuperabilidade

Todo estado corrompido ou inválido tem um caminho de recuperação. Isso não significa que a recuperação é automática — significa que existe um processo documentado para voltar a um estado consistente.

Processos de importação que falharam no meio têm dry-run que mostra o que foi processado e o que está pendente. Migrações de dados que correram parcialmente têm rollback definido antes de serem executadas. Automações que produziram estado incorreto têm compensação documentada.

Recuperabilidade começa no design: antes de implementar uma operação que pode falhar no meio, definir o estado de falha parcial e como corrigi-lo.

---

## 15. Princípios Permanentes

Os seguintes princípios são a síntese desta filosofia. São invioláveis — quando uma exceção parecer necessária, o princípio deve ser revisado formalmente, não silenciosamente contornado.

**Tecnologia é meio, não fim.** Toda escolha tecnológica é justificada por um problema específico que resolve melhor do que as alternativas disponíveis — não por familiaridade, tendência ou preferência estética.

**Sistemas devem ser mais fáceis de mudar no futuro do que são hoje.** Uma Release que aumenta a dificuldade de mudança está acumulando débito. Uma Release que diminui está investindo.

**Complexidade é conquistada, nunca presumida.** A solução mais simples que permanece correta é a correta. Complexidade adicional requer justificativa específica: que problema a solução simples não resolve.

**Módulos produzem ativos, não apenas resultados.** O critério de design de qualquer módulo inclui: que ativo reutilizável este módulo produz além de sua função imediata.

**Dados têm origem, propriedade e ciclo de vida.** Todo dado tem uma fonte de verdade. Dados históricos não são sobrescritos — são sucedidos. Imutabilidade do passado é um princípio, não uma convenção.

**Contratos são mais importantes que implementações.** Implementações podem ser reescritas. Contratos mal definidos tornam-se restrições permanentes. Contratos recebem mais atenção de design do que implementações.

**Observabilidade é requisito, não feature.** Todo comportamento importante do sistema é observável — não apenas erros, mas fluxos, latências, volumes e estados de automações.

**Automações falham alto.** Nenhuma automação falha silenciosamente. Toda falha produz log estruturado, métrica de falha e, quando relevante, alerta. Automação sem observabilidade não é automação.

**Segurança por padrão.** Sistemas começam restritos e abrem acesso conforme necessário — não o contrário. Menor privilégio e validação em fronteiras são propriedades de design, não configurações adicionais.

**Falhas são previsíveis.** Todo componente tem modos de falha documentados. Falhas imprevisíveis em produção indicam lacuna de design que deve ser corrigida — não apenas a falha específica.

**Qualidade é um atributo de design.** Testabilidade, legibilidade e previsibilidade são critérios do design do componente, não etapas de verificação ao final do desenvolvimento.

**Evolução contínua, nunca acúmulo.** Cada Release deixa a arquitetura em melhor estado do que a encontrou. Débito técnico intencional é documentado com plano de resolução. Débito acidental é inadmissível.

---

## O Núcleo Estratégico da Foundation

Com este documento, a Foundation do ParaguAI tem cinco pilares:

| Documento | Responde | Natureza |
|---|---|---|
| `AI_CONSTITUTION.md` | Quem somos e no que acreditamos | Identidade e princípios |
| `NORTH_STAR.md` | Como tomamos decisões | Processo e critérios |
| `BUSINESS_MODEL.md` | Como criamos e capturamos valor | Lógica econômica |
| `VISION_2035.md` | Para onde vamos | Horizonte e legado |
| `ENGINEERING_PRINCIPLES.md` | Como construímos tecnologia | Filosofia técnica permanente |

A Constituição estabelece regras operacionais de engenharia. Este documento estabelece a filosofia que permite derivar regras para situações novas — quando as regras existentes não cobrem o caso. Os dois documentos são complementares: regras para o caso conhecido, filosofia para o caso novo.

---

*Este documento não prescreve implementações. Prescreve como pensar sobre implementações — de forma que as decisões técnicas de hoje não se tornem restrições de amanhã.*
