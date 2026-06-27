# NORTH_STAR.md
# A Bússola do ParaguAI

**Versão**: 1.1  
**Criado**: 2026-06-27  
**Revisado**: 2026-06-27  
**Status**: Permanente — consultar antes de toda decisão de desenvolvimento  
**Prioridade**: Segundo documento obrigatório. Leia `docs/AI_CONSTITUTION.md` primeiro.

---

## 1. O que é este documento

A Constituição responde: **quem somos e no que acreditamos**.

Este documento responde: **como decidimos**.

São perguntas diferentes. A Constituição é o sistema imunológico do ParaguAI — os princípios que não mudam. Este documento é o instrumento de navegação diária — o que usar quando há dúvida sobre o que construir, o que aceitar, o que descartar, o que priorizar.

**Quando consultar este documento:**

- Antes de iniciar qualquer nova implementação
- Antes de aceitar um Pull Request
- Antes de aprovar um novo ADR
- Quando uma Release está sendo planejada e o escopo não está claro
- Quando duas features competem pela mesma semana
- Quando a equipe diverge sobre se algo "vale a pena"

Se uma decisão não passa pelos filtros deste documento, ela não deve avançar — independente de quanto esforço já foi investido.

---

## 2. A Métrica Norte

**O número de decisões melhores que o ParaguAI tornou possíveis.**

Não é número de usuários. Usuários sem decisão melhor são vanity metric.  
Não é faturamento. Faturamento sem decisão melhor é extração sem valor.  
Não é pageviews. Pageviews sem decisão melhor são tráfego sem propósito.  
Não é número de lojas cadastradas. Lojas sem compradores melhor informados são presença sem impacto.

### O que é uma "decisão melhor"

Uma decisão melhor é aquela em que o comprador ou lojista agiu com mais informação, mais contexto e mais confiança do que agiriam sem o ParaguAI — e o resultado foi superior ao que teriam obtido de outra forma.

Para o **comprador**: encontrou o produto certo, no preço certo, da loja certa, no momento certo — sem precisar ligar para cinco lojas, cruzar a fronteira sem saber o que encontraria, ou confiar em um revendedor sem histórico verificável.

Para o **lojista**: tomou uma decisão de estoque, precificação ou divulgação baseada em dados reais de comportamento de mercado — não em intuição ou na observação do concorrente vizinho.

### Como medir

A North Star não é diretamente observável num único número. É um vetor composto por:

- Buscas que encontraram resultado relevante / buscas totais
- Compras assistidas por comparação de preços
- Alertas de preço que geraram ação
- Lojistas que ajustaram catálogo a partir de dados de analytics
- Usuários que retornaram antes de uma nova visita à fronteira

Toda métrica técnica — uptime, latência, cobertura de catálogo — é insumo para esse vetor. Nenhuma delas é o objetivo.

---

## 3. A Pergunta Obrigatória

Antes de qualquer implementação, responder com honestidade:

> **Esta implementação aproxima ou afasta o ParaguAI da sua missão de eliminar a assimetria de informação da fronteira?**

Se a resposta for **"aproxima"**, prosseguir para os filtros da Seção 4.  
Se a resposta for **"afasta"**, descartar — independente do esforço investido.  
Se a resposta for **"não sei"**, não iniciar. Descobrir a resposta primeiro.

"Não sei" dito honestamente é mais valioso do que "aproxima" dito por conveniência.

---

## 4. Os 10 Filtros Permanentes

Toda funcionalidade nova responde a estes filtros antes de entrar em desenvolvimento. Um "não" não elimina automaticamente a feature — mas exige justificativa explícita antes de prosseguir. Três "nãos" ou mais são bloqueadores.

| # | Filtro | Pergunta prática |
|---|---|---|
| 1 | **Reduz trabalho humano?** | Depois desta feature, alguém precisa fazer menos trabalho repetitivo? |
| 2 | **Aumenta inteligência?** | O sistema sabe mais depois desta feature do que sabia antes? |
| 3 | **Gera novos dados?** | Esta feature produz dados que outros módulos poderão consumir? |
| 4 | **Fortalece um ativo estratégico?** | Merchant Score, Catálogo, Histórico de Preços, Reputação, Brain, Merchant OS — algum deles fica mais forte? |
| 5 | **Aumenta o efeito de rede?** | Com esta feature, a plataforma fica mais valiosa para quem já está dentro — e mais atrativa para quem ainda não entrou? |
| 6 | **Melhora a vida do comprador?** | Um comprador real, hoje, toma uma decisão melhor por causa disso? |
| 7 | **Melhora a vida do lojista?** | Um lojista real, hoje, opera melhor por causa disso? |
| 8 | **Poderá ser reutilizada?** | Esta implementação serve de base para pelo menos outras duas features futuras? |
| 9 | **Aumenta nosso moat?** | Depois desta feature, o ParaguAI é mais difícil de copiar? |
| 10 | **Faz sentido daqui a 10 anos?** | Se o mercado mudar, a stack mudar, e o time mudar — este princípio ainda se sustenta? |

---

## 5. Hierarquia de Prioridades

Quando há conflito, esta pirâmide resolve. O que está acima sempre prevalece sobre o que está abaixo.

```
         Missão
           ↓
       North Star
           ↓
        Usuários
           ↓
          Dados
           ↓
           IA
           ↓
        Produto
           ↓
         Código
           ↓
       Tecnologia
```

**Missão** é permanente e não negociável.  
**North Star** é o critério de sucesso — se uma decisão não avança a métrica, ela desce na prioridade.  
**Usuários** são a razão de existir — compradores e lojistas, em equilíbrio.  
**Dados** são o ativo — sem dados, não há inteligência.  
**IA** é a direção — toda feature deve alimentar inteligência futura.  
**Produto** é a expressão — a interface que conecta missão e usuário.  
**Código** é o meio — deve ser limpo, mas não é um fim em si.  
**Tecnologia** é uma ferramenta — substituível, intercambiável, temporária.

Uma refatoração que melhora apenas o código, sem avançar nenhum nível acima, não é prioridade. Uma feature que melhora apenas a experiência do usuário, sem gerar dado, pode estar perdendo o retorno de longo prazo. Uma decisão tecnológica que não serve à missão é ruído.

---

## 6. Como Priorizamos

Toda feature proposta recebe um score antes de entrar no backlog. Score abaixo de 50 retorna para reavaliação. Score acima de 75 é candidato imediato para a próxima Release.

| Dimensão | Peso | Como medir |
|---|---|---|
| **Impacto na North Star** | 30 pts | Direta e imediatamente mais decisões melhores? (0–30) |
| **Geração de ativo** | 25 pts | Fortalece Merchant Score, Catálogo, Histórico, Reputação ou Brain? (0–25) |
| **Efeito de rede** | 20 pts | Retorno cresce com mais participantes? (0–20) |
| **Reutilização** | 15 pts | Quantos outros módulos aproveitam esta implementação? (0–15) |
| **Esforço invertido** | 10 pts | Baixo esforço = pontuação alta (>3 semanas = 0–3 pts; <1 semana = 8–10 pts) |

**Score total**: soma das 5 dimensões (máx 100).

Notas de uso:
- Score é ferramenta, não lei. Um score 45 com impacto North Star 30 merece discussão. Um score 80 com impacto North Star 5 precisa ser revisado.
- Features de fundação (dados, segurança, integridade) pontuam alto em "geração de ativo" mesmo com impacto direto no usuário baixo — isso é correto.
- Features de UI sem dado gerado pontuam baixo em "geração de ativo" — isso também é correto.

---

## 7. O que nunca deve ser prioridade

Estas categorias de trabalho consomem tempo e não avançam a missão. Se alguma delas aparecer no backlog, questionar antes de executar.

**Feature porque o concorrente tem.**  
Concorrentes fazem escolhas por razões que não conhecemos. A nossa escolha parte da missão, não da imitação. Copiar features sem entender o problema que resolvem é competir pelo problema errado.

**Código bonito sem valor entregue.**  
Refatoração é válida quando remove um gargalo real de manutenção ou desbloqueia velocidade futura. Refatoração por preferência estética, sem usuário impactado e sem dado gerado, é débito de tempo.

**Micro-otimizações antes de escala.**  
Otimizar queries que respondem em 40ms quando o banco tem 100 registros é trabalho que não existe. Quando o banco tiver 10 milhões de registros, revisitar.

**Tecnologias da moda.**  
A adoção de uma nova tecnologia deve ser justificada por um problema que as tecnologias atuais não resolvem — não por curiosidade, hype ou tendência de mercado. Toda tecnologia nova é dívida de complexidade até provar valor.

**Funcionalidades sem usuário identificado.**  
"Alguém vai querer isso" não é evidência. Qual usuário? Em qual contexto? Com qual frequência? Sem resposta, a feature é hipótese — e hipóteses não entram em produção.

**Complexidade desnecessária.**  
Um sistema que resolve um problema simples com uma solução complexa está produzindo débito técnico, não valor. A solução mais simples que funciona é a correta, até o problema crescer de tamanho.

**Entrega incompleta.**  
Uma feature sem estado vazio, sem estado de erro, sem validação de borda — não é uma feature entregue. É trabalho pela metade que cria expectativa e não entrega. Não existe "80% pronto" em produção.

---

## 8. Como pensamos longo prazo

Cada Release deve deixar o ParaguAI **mais inteligente**, não apenas maior.

Maior = mais lojas, mais produtos, mais rotas, mais usuários.  
Mais inteligente = mais dados acumulados, mais contexto disponível, mais capacidade de resposta, menos trabalho humano necessário.

Um ParaguAI maior sem ser mais inteligente é uma plataforma que cresce lateralmente sem aprofundar seu moat. Um ParaguAI mais inteligente, mesmo com crescimento lateral lento, está construindo a vantagem que não pode ser comprada.

O teste de longo prazo: se dentro de 3 anos você não puder usar os dados gerados hoje para algo útil, questione por que está gerando esses dados.

A regra prática: toda implementação deve ter uma resposta clara para "que dado novo isso produz, e quem vai consumir esse dado?" Se a resposta for "nenhum" ou "não sei", reconsiderar o design antes de construir.

**Infraestrutura antes de solução específica.**  
Sempre que uma decisão puder ser tomada de duas formas — uma que resolve o caso atual e outra que resolve o caso atual e também serve como base para os próximos dez — escolher a segunda, se o custo marginal for razoável. Uma solução específica resolve um problema. Infraestrutura reutilizável resolve uma classe de problemas. O Acquisition Engine não foi construído para importar a Shopping China; foi construído para que qualquer nova loja possa ser conectada em horas, não semanas. Esse é o padrão correto.

---

## 9. Como avaliamos sucesso

Sucesso não é concluir a Release no prazo. Sucesso é o estado do ParaguAI depois da Release.

Uma Release bem-sucedida deixa pelo menos um destes estados melhor do que estava antes:

- **Mais decisões corretas** — compradores encontraram o que precisavam, com contexto suficiente para agir
- **Menos trabalho manual** — algum processo que antes exigia intervenção humana agora é automático
- **Mais inteligência** — o sistema sabe mais do que sabia antes, em forma de dado estruturado e acessível
- **Mais automação** — o sistema opera com menos supervisão humana em operações rotineiras
- **Mais confiança** — compradores ou lojistas têm mais evidência verificável para confiar na plataforma
- **Mais retenção** — usuários ou lojistas têm mais razão para permanecer do que tinham antes
- **Mais reutilização** — componentes, dados ou lógica produzidos podem ser aproveitados em outros módulos

Uma Release que não avança nenhum desses estados deve ser questionada antes de ser declarada concluída.

---

## 10. Checklist Final

Executar obrigatoriamente antes de qualquer Merge, Release ou ADR aprovado.

```
[ ] A Pergunta Obrigatória foi respondida com "aproxima"?
[ ] Passou nos 10 Filtros Permanentes (ou os "nãos" têm justificativa)?
[ ] Score de priorização calculado e documentado?
[ ] A feature tem usuário identificado?
[ ] A feature tem estado vazio, estado de erro e validação de borda?
[ ] A feature gera dado reutilizável?
[ ] A feature fortalece pelo menos um ativo estratégico?
[ ] Algum ativo estratégico fica mais forte depois desta entrega?
[ ] O sistema fica mais inteligente depois desta entrega?
[ ] O moat fica mais defensável depois desta entrega?
[ ] A missão fica mais próxima depois desta entrega?
```

Se existir dúvida em qualquer item — não implementar até a dúvida ser resolvida.

Dúvida resolvida ≠ dúvida ignorada.

---

---

## 11. Anti Goals

O ParaguAI é definido não apenas pelo que escolhe construir, mas pelo que escolhe **não** construir. Estes anti goals são tão permanentes quanto os filtros da Seção 4 — violá-los destrói o que os goals constroem.

**Não existimos para maximizar pageviews.**  
Pageview sem decisão melhor é métrica vazia. Um usuário que navegou por 40 minutos sem encontrar o que precisava é uma falha de produto, não um indicador de engajamento. Qualquer mecanismo que aumenta tráfego às custas da qualidade da decisão viola a North Star.

**Não existimos para maximizar tempo de permanência artificialmente.**  
Não somos uma mídia social. Um comprador que encontrou o produto certo em três cliques é melhor do que um que navegou por vinte minutos sem clareza. Velocidade de decisão é uma feature, não um defeito. Reter o usuário mais tempo do que necessário é desperdiçar o capital de confiança que nos deu acesso ao tempo dele.

**Não existimos para copiar funcionalidades de concorrentes.**  
Concorrentes fazem escolhas por razões que não conhecemos, para usuários que podem ser diferentes dos nossos, com restrições que podem não existir para nós. Copiar sem entender o problema que uma feature resolve é competir pelo problema errado.

**Não existimos para adicionar recursos sem problema identificado.**  
Toda funcionalidade tem custo permanente: manutenção, complexidade de UI, testes, documentação, cognitive load do usuário. Uma funcionalidade que não resolve um problema real identificável cobra esses custos indefinidamente sem retorno. "Pode ser útil para alguém" não é critério suficiente.

**Não existimos para aumentar complexidade sem benefício proporcional.**  
Complexidade tem custo composto. Toda abstração prematura, toda generalização sem caso de uso real, toda arquitetura over-engineered cobra dividendos de lentidão e erro crescentes ao longo do tempo. A solução mais simples que funciona é a correta, até o problema crescer de tamanho.

**Não existimos para privilegiar anunciantes sobre relevância.**  
O resultado que um comprador vê deve refletir o melhor produto para sua necessidade — não o produto de quem mais paga. Resultados patrocinados que substituem resultados relevantes destroem a confiança. Confiança é o único ativo que, uma vez perdido em escala, não pode ser reconstituído com investimento.

**Não existimos para manipular rankings por interesse comercial.**  
O Merchant Score e o ranking de ofertas são calculados sobre dados objetivos de qualidade — completude do catálogo, atualização de preços, verificação, histórico de comportamento. Quando o ranking perde neutralidade verificável, perde razão de existir. Um marketplace cujo ranking é comprado não é um marketplace — é um espaço publicitário.

**Não existimos para criar dependência de IA quando transparência é mais valiosa.**  
IA é um meio, não uma identidade. Quando um usuário pode resolver um problema com uma tabela de preços clara, oferecer uma "recomendação inteligente" opaca é privilegiar a aparência de inteligência sobre utilidade real. Transparência e explicabilidade são mais valiosas do que sofisticação percebida.

**Não existimos para construir o que é tecnicamente interessante mas sem usuário identificado.**  
A pergunta "isso é possível de construir?" é irrelevante como critério de prioridade. A pergunta correta é sempre: "Qual usuário, em qual situação, toma uma decisão melhor por causa disso?" Se a resposta não tiver nome e contexto, a feature não tem justificativa.

---

## 12. Tipos de Decisão

Nem toda decisão merece o mesmo nível de análise. Tratar decisões simples como complexas cria paralisia. Tratar decisões complexas como simples cria retrabalho exponencial.

### Tipo 1 — Difíceis ou caras de reverter

Exigem análise profunda, documentação em ADR e aprovação explícita antes de avançar. O custo de errar e reverter é alto — em tempo, dados, ou fundação de código.

Exemplos:
- Schema de banco de dados (toda mudança carrega dados existentes e migrações)
- Modelo de domínio (preço pertence à oferta, não ao produto — violado, impacto em cascata)
- Identidade e posicionamento da plataforma
- Estratégia de monetização e modelo de planos
- Arquitetura de camadas e contratos entre módulos
- Escolha de fornecedores e dependências estruturais
- Políticas de segurança e acesso a dados (RLS, credenciais, exposição de API)
- Decisões que afetam múltiplos merchants ou usuários de forma irreversível

### Tipo 2 — Facilmente reversíveis

Devem ser decididas rapidamente. O custo de errar é baixo — uma nova iteração corrige em horas ou dias. Análise longa sobre decisões Tipo 2 é desperdício de capacidade estratégica.

Exemplos:
- Layout, tipografia, espaçamento, paleta de cores
- Textos de UI — labels, copy, mensagens de estado vazio, CTAs
- Ordem de itens em menus e navegação
- Componentes de apresentação sem persistência de dado
- Pequenos fluxos de UX sem impacto em dados ou segurança
- Features experimentais delimitadas e reversíveis
- A/B tests com escopo definido

### A assimetria crítica

Tratar Tipo 2 como Tipo 1 = discussão longa sobre o que podia ser testado em produção em uma hora.  
Tratar Tipo 1 como Tipo 2 = uma mudança de schema sem análise profunda que cria débito irrecuperável.

O critério prático antes de qualquer decisão: **"Se errarmos, qual é o custo real de voltar atrás?"**  
Alto → Tipo 1. Analisar, documentar, aprovar.  
Baixo → Tipo 2. Decidir, executar, iterar.

---

## 13. Compounding Decisions

**Cada Release deve tornar a próxima Release mais fácil de construir.**

Uma Release que entrega apenas valor imediato — sem deixar infraestrutura, sem gerar dados reutilizáveis, sem fortalecer nenhum ativo — é uma Release que não compõe. Resolve um problema mas não amplia a capacidade do sistema de resolver os próximos.

Releases que compõem têm esta propriedade: o custo marginal de construir a próxima feature relacionada é significativamente menor do que o custo da feature atual. Isso só acontece quando a feature atual deixa fundação reutilizável, não apenas código que funciona.

**O padrão correto:**

O Acquisition Engine não foi construído para importar um conector específico. Foi construído para que cada novo conector custe uma fração do anterior. O primeiro conector levou semanas. O segundo levará dias. O décimo levará horas — porque a fundação compõe.

O sistema de slug único com índices não resolve apenas a busca de produto. Resolve toda busca de entidade por identificador em qualquer tabela que adote o padrão.

O Merchant Score não resolve apenas o ranking da página de lojas. Resolve personalização, recomendações, segmentação B2B, e potencialmente decisões de crédito futuras — com a mesma implementação.

**A pergunta de compounding** — obrigatória antes de aprovar qualquer design de implementação:

> **"Que problema de amanhã essa implementação já resolve, sem que eu precise tocá-la de novo?"**

Se a resposta for "nenhum", o design provavelmente está resolvendo o caso atual sem pensar no próximo. Isso não é errado em todo contexto — mas deve ser uma escolha explícita, não um padrão.

**Compounding não significa over-engineering.**  
Não é construir para todos os casos possíveis. É construir para os próximos dois ou três casos razoavelmente prováveis, com custo marginal próximo de zero. A diferença entre os dois é julgamento — e o julgamento melhora com a prática de fazer a pergunta acima antes de cada implementação.

---

## 14. O Compromisso

Todo desenvolvedor humano e todo sistema de IA que trabalhar neste projeto assume o seguinte compromisso implicitamente, ao usar este documento como guia:

**Toda decisão tomada hoje deve facilitar as decisões de amanhã.**  
Não apenas resolver o problema atual. Abrir caminho para o próximo problema ser mais simples de resolver.

**Toda Release deve diminuir a complexidade da próxima, não aumentá-la.**  
Complexidade acumulada sem compounding é débito. Complexidade com compounding é fundação. A diferença está em se o que foi construído pode ser reutilizado ou se precisa ser reescrito.

**Toda arquitetura deve aumentar a capacidade de evolução.**  
Um sistema que só pode crescer com reescrita completa foi mal projetado. Um sistema que cresce por composição — novos módulos sobre fundação existente, sem quebrar o que funciona — foi projetado para durar.

**Nunca apenas resolver o problema atual.**  
Sempre perguntar: o que o próximo estágio do ParaguAI vai precisar? Como o que construo hoje serve a esse estágio, sem que ele precise reimplementar do zero?

O ParaguAI é um organismo que aprende. Este documento é parte do sistema imunológico desse organismo — o conjunto de critérios que garante que cada decisão contribui para um sistema que fica progressivamente mais inteligente, mais defensável e mais valioso para quem depende dele.

---

*Este documento é consultado diariamente. Não é um documento de roadmap, não descreve features específicas e não substitui a Constituição. Complementa. Quando houver conflito entre os dois, a Constituição prevalece — mas o conflito em si é um sinal de que um dos dois precisa ser revisado.*
