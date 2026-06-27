# AI_CONSTITUTION.md
# Constituição do ParaguAI

**Versão**: 1.0  
**Criado**: 2026-06-27  
**Status**: Permanente — não deprecar; apenas estender com revisões versionadas  
**Prioridade**: Este é o primeiro documento a ser lido antes de qualquer tarefa de desenvolvimento.

---

## Preâmbulo

Este documento não descreve o que o ParaguAI pretende ser. Descreve o que o ParaguAI **é** — seus princípios fundamentais, filosofia de engenharia, modelo de negócio e regras permanentes — sintetizados a partir de toda a história de decisões do projeto, do modelo de domínio, da arquitetura real e da visão de longo prazo.

Tecnologias mudam. Plataformas mudam. Mercados mudam. Os princípios aqui registrados devem permanecer válidos independentemente dessas mudanças. Quando um princípio parecer obsoleto, o momento certo é revisá-lo formalmente e versionar, não ignorá-lo silenciosamente.

Todo desenvolvedor humano ou sistema de IA que trabalhar neste projeto deve ler este documento antes de iniciar qualquer tarefa.

---

## I. Identidade

### Quem somos

O ParaguAI é uma plataforma de inteligência de compras focada no mercado do Paraguai e na região de fronteira com o Brasil. Conectamos compradores que buscam o melhor preço com lojas que precisam de visibilidade e distribuição digital.

Somos uma **plataforma**, não apenas um site de comparação. A diferença é estrutural: um agregador coleta dados. Uma plataforma cria valor para os dois lados simultaneamente — compradores e lojistas — e gera retornos crescentes de escala a cada novo participante.

### O que estamos construindo

Uma infraestrutura de confiança para decisões de compra em um mercado com alta fragmentação, baixa transparência de preços e pouca digitalização de lojas.

Estamos construindo:

- A maior base de dados de produtos e preços do Paraguai
- Um sistema de confiança e reputação para lojas locais
- Ferramentas de crescimento para lojistas (Merchant OS)
- Inteligência para compradores: comparação, histórico de preços, recomendações
- Uma rede que cresce com cada nova loja e cada novo usuário

### O que NÃO somos

Não somos um e-commerce. Não processamos pagamentos, não guardamos estoque, não fazemos logística. Somos a camada de descoberta e decisão, não a camada de transação.

Não somos um agregador passivo. Processamos, validamos, normalizamos e enriquecemos cada dado que entra na plataforma.

Não somos um produto para o Paraguai inteiro desde o primeiro dia. Começamos em Ciudad del Este, onde a concentração de lojas e o volume de tráfego de compradores brasileiros criam a densidade necessária para efeito de rede.

Não somos rápidos às custas de corretos. Velocidade sem fundação gera retrabalho exponencial.

---

## II. Missão

**Tornar o processo de compra no Paraguai transparente, inteligente e confiável — para compradores que buscam o melhor preço e para lojistas que buscam crescimento.**

---

## III. Visão 2030

Ser a principal plataforma de inteligência de compras da América do Sul, começando pelo Paraguai.

Em 2030:
- Qualquer comprador que considere uma viagem a Ciudad del Este, uma compra online de loja paraguaia ou uma comparação de preços na fronteira consulta o ParaguAI antes de decidir.
- Qualquer loja no Paraguai que queira crescimento digital tem o ParaguAI como canal de distribuição e análise.
- O ParaguAI opera em todos os principais mercados do Paraguai e inicia expansão para Brasil e Argentina.
- A plataforma tem API pública, permitindo que terceiros construam sobre a infraestrutura de dados do ParaguAI.

---

## IV. North Star

**O número de decisões de compra melhores que o ParaguAI ajudou a tomar.**

Uma decisão de compra melhor é aquela em que o comprador encontrou o produto certo, no preço certo, da loja certa — com confiança. Não é simplesmente o menor preço. É a melhor decisão considerando preço, disponibilidade, confiabilidade da loja e timing.

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

---

## VII. Automação

**Tudo que puder ser automatizado deve ser automatizado.** A plataforma não escala com esforço manual.

### O princípio de automação

Qualquer processo que se repete — importação de catálogos, atualização de preços, geração de recomendações, envio de alertas, validação de dados — é um candidato imediato à automação.

O critério de automação não é a frequência da tarefa, mas o custo de não automatizá-la em escala. Uma loja com 10.000 produtos que atualiza preços diariamente não pode depender de intervenção humana.

### Requisitos de qualquer automação

Todo processo automatizado deve ser:

- **Idempotente**: executar duas vezes produz o mesmo resultado que executar uma.
- **Rastreável**: cada execução gera relatório com entradas, saídas, erros e métricas.
- **Reversível quando possível**: o estado anterior deve ser recuperável.
- **Dry-run por padrão**: nenhuma automação escreve em produção sem modo de simulação disponível e executado primeiro.
- **Falha explícita**: erros são reportados com clareza, nunca silenciados.

A automação não substitui aprovação para ações de alto impacto. Um sistema que automatiza sem limite de escopo é um sistema que cria risco sem controle.

---

## VIII. Inteligência Artificial

A IA não é uma feature do ParaguAI — é a direção de todas as features.

### Papel atual

Atualmente, a IA do ParaguAI existe como infraestrutura: catálogo normalizado, histórico de preços rastreado, ranking de ofertas calculado, reputação de lojas consolidada em um score. Esses dados são o combustível da inteligência futura, não um produto em si.

### Papel futuro

A IA do ParaguAI deve, progressivamente, responder a perguntas que nenhum humano consegue responder manualmente:

- "Qual é o melhor momento para comprar este produto?"
- "Esta loja tem histórico de inflacionar preços antes de datas promocionais?"
- "Qual loja tem a menor variação de preço ao longo do tempo, mesmo que não tenha o menor preço hoje?"
- "O que comprar nesta viagem, dado meu orçamento e preferências anteriores?"

### Como cada módulo alimenta inteligência

**Catálogo de produtos** — base de entidades normalizadas. Sem catálogo limpo, não há comparação confiável.

**Histórico de preços** — séries temporais que alimentam detecção de padrão e predição. O preço de hoje sem contexto histórico não tem valor analítico.

**Merchant Score** — reputação calculada a partir de comportamento observável: volume, atualização, completude, verificação. É o primeiro modelo de ranking do ParaguAI.

**Interações de compradores** — buscas, cliques, comparações, favoritos, alertas. Cada ação é um sinal de intenção que melhora as recomendações futuras.

**Dados de lojistas** — importações, plano, qualidade do catálogo, tempo de resposta. Alimentam segmentação e recomendações B2B.

### ParaguAI Brain

O ParaguAI Brain é a camada de inteligência central que unifica todos esses sinais. Não é um produto separado — é o resultado de conectar as camadas existentes com modelos de linguagem e aprendizado.

O Brain deve:
- Entender linguagem natural de compradores brasileiros e paraguaios
- Contextualizar produtos dentro de categorias, marcas e faixas de preço históricas
- Personalizar recomendações com base no histórico do usuário
- Detectar anomalias de preço: inflação artificial, fraude, divergência de catálogo
- Responder perguntas sobre o mercado com dados próprios, não dados de terceiros

A qualidade da inteligência é diretamente proporcional à qualidade dos dados que a alimentam. O Brain não substitui o catálogo, o histórico e o ranking — depende completamente deles.

---

## IX. Engenharia

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

Decisões de design que determinam escalabilidade:

- **Queries ao banco devem ser O(1) em relação ao volume de dados**, não O(N). Agregações, filtros e paginação pertencem ao banco, não à memória da aplicação.
- **Desacoplamento entre aquisição e apresentação.** O pipeline de importação de dados é independente da aplicação de consumo. Um pode evoluir sem bloquear o outro.
- **Idempotência em operações em lote.** Qualquer operação que processa múltiplos itens deve ser segura para reexecução parcial.
- **Automação substituível.** Qualquer conector de dados pode ser substituído sem alterar o pipeline. O contrato de entrada é o que importa, não a implementação.

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

## X. Produto

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

## XI. Negócio

### Crescimento

O crescimento do ParaguAI é fundamentalmente de efeito de rede. Mais lojas atraem mais compradores. Mais compradores atraem mais lojas. Mais dados de ambos os lados melhoram a inteligência, que aumenta o valor percebido por ambos os lados.

A consequência direta: as primeiras 100 lojas e os primeiros 10.000 usuários têm impacto desproporcional. A densidade inicial determina se o efeito de rede ignita ou não.

### Efeito de rede

O ParaguAI opera um efeito de rede de dois lados com uma terceira camada de dados:

- **Lado do comprador**: mais compradores → mais dados de comportamento → melhores recomendações → mais valor para cada comprador.
- **Lado do lojista**: mais lojas → mais produtos → melhor cobertura de catálogo → mais valor para compradores → mais lojas.
- **Camada de dados**: cada busca, clique e comparação melhora os modelos, que aumentam o valor de ambos os lados.

A plataforma não cresce linearmente. Cresce exponencialmente quando ambos os lados são servidos bem simultaneamente.

### Monetização

A monetização do ParaguAI é B2B primeiro: lojistas pagam por visibilidade, ferramentas de gestão e dados de inteligência. Compradores não pagam — eles são o lado que gera valor para o lojista.

Princípios permanentes de monetização:

- A experiência do comprador nunca é degradada por monetização. Resultados patrocinados que substituem resultados orgânicos destroem a confiança que é a base da plataforma.
- O plano gratuito para lojistas sempre oferece valor real, não apenas um preview. Um merchant no plano gratuito com loja cadastrada, catálogo ativo e acesso ao ranking já tem motivo para permanecer.
- A diferença entre planos é de capacidade e inteligência, não de acesso fundamental. Um merchant no plano básico acessa seus dados; um merchant no plano avançado acessa seus dados mais os do mercado.
- Cobrança só começa quando o valor entregue é verificável. Planos pagos precedem métricas de resultado — o produto prova valor antes de cobrar por ele.

---

## XII. Autonomia

À medida que a plataforma amadurece, mais decisões são tomadas pelo sistema, não por humanos.

### Graus de autonomia

**Automação total, sem revisão humana**:  
Recálculo de scores de reputação, atualização de métricas agregadas, envio de alertas de preço a usuários que os solicitaram, geração de relatórios de performance para merchants.

**Automação com revisão**:  
Publicação de novos produtos oriundos de crawlers (validação automática, publicação após intervalo de revisão configurável), alterações de dados mestre como nome de produto, categoria ou marca vindas de fontes externas.

**Aprovação obrigatória, sempre**:  
Alterações de schema de banco de dados, escrita em produção por processos novos não validados, ações que afetam múltiplos merchants ou usuários de forma irrecuperável, integração com sistemas externos de pagamento ou dados financeiros.

O aumento de autonomia do sistema segue o aumento de confiança nos dados e nos modelos. Autonomia não é delegação cega — é confiança construída sobre histórico verificável.

---

## XIII. Regras Permanentes

As seguintes regras não têm exceção contextual. Se uma exceção parecer necessária, a regra deve ser revisada formalmente e versionada — não contornada.

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

---

## XIV. Processo de Desenvolvimento

### Como cada Release é planejada

Cada Release responde, nesta ordem:

1. **O que está quebrado ou incompleto?** Nenhuma Release começa sem garantir que a anterior não tem débito técnico crítico aberto.
2. **O que o usuário não consegue fazer hoje que deveria conseguir?** Releases são definidas pela lacuna de valor, não pela lista de features desejadas.
3. **O que a infraestrutura ainda não suporta?** Features visíveis dependem de fundação invisível. A fundação é construída antes da feature.
4. **Qual é o critério de aceitação verificável?** Toda Release tem um conjunto de afirmações verificáveis que, quando todas passam, declaram a Release completa.

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
- A documentação foi atualizada
- Não há regressão introduzida
- O projeto compila, passa typecheck e passa lint

Qualquer um desses critérios não atendido significa que a tarefa não está concluída.

---

## XV. Critério de Aceitação

Toda funcionalidade nova deve responder afirmativamente a todas estas perguntas antes de entrar em produção:

### Valor

- Para qual usuário específico esta funcionalidade existe?
- O que este usuário consegue fazer agora que não conseguia antes?
- Existe evidência de que este usuário quer isso?

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

## XVI. Hierarquia de documentos

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

---

*Todo desenvolvedor humano ou sistema de IA que trabalhar neste projeto deve ler este documento antes de iniciar qualquer tarefa. Este documento não é atualizado a cada release — é atualizado quando um princípio precisa ser revisado, com nova versão e registro no histórico acima.*
