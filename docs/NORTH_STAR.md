# NORTH_STAR.md
# A Bússola do ParaguAI

**Versão**: 1.0  
**Criado**: 2026-06-27  
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

*Este documento é consultado diariamente. Não é um documento de roadmap, não descreve features específicas e não substitui a Constituição. Complementa. Quando houver conflito entre os dois, a Constituição prevalece — mas o conflito em si é um sinal de que um dos dois precisa ser revisado.*
