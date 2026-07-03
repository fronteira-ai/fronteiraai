# STRATEGIC_ASSETS.md
# Sistema Oficial de Ativos Estratégicos — ParaguAI

**Versão**: 1.0  
**Criado**: 2026-06-29  
**Status**: PERMANENTE — não modifique sem aprovação explícita do CTO  
**Hierarquia**: Parte integrante do Product Operating System. Subordinado à Foundation Empresarial e ao MOAT_STRATEGY. Superior a qualquer decisão operacional de produto ou engenharia.

---

## Preâmbulo

O ParaguAI acumula patrimônio. Não código — patrimônio. Não funcionalidades — ativos.

Este documento define exatamente o que é esse patrimônio: quais ativos estratégicos a empresa constrói, como cada um nasce, cresce e envelhece, como se relacionam entre si, como sustentam os Moats identificados no MOAT_STRATEGY e como aumentam o valor permanente da empresa.

Este documento é o inventário do que o ParaguAI realmente possui — e o sistema pelo qual esse patrimônio é governado, protegido e expandido.

---

# CAPÍTULO 1 — O Conceito de Ativo Estratégico

### A hierarquia de valor

Existe uma hierarquia que vai da ação operacional imediata ao valor permanente da empresa. A maioria das organizações opera nos dois primeiros níveis. Organizações extraordinárias operam em todos os cinco.

```
FEATURE
  │
  │  Uma funcionalidade específica e delimitada.
  │  Resolve um problema pontual para um usuário.
  │  Pode ser adicionada ou removida sem destruir valor permanente.
  │  Ciclo de vida: meses a anos.
  │  Exemplos: filtro de categoria, badge de verificação, formulário de review.
  │
  ▼
CAPABILITY
  │
  │  Uma capacidade operacional recorrente, construída sobre features
  │  e infraestrutura. Mais durável que uma feature individual.
  │  Representa o que a plataforma consegue fazer de forma consistente.
  │  Ciclo de vida: anos.
  │  Exemplos: importar catálogo de qualquer merchant, exibir histórico
  │  de preços, verificar reputação de lojas.
  │
  ▼
ASSET
  │
  │  Um patrimônio acumulado que cresce com o tempo.
  │  Não é o que a plataforma faz — é o que a plataforma possui.
  │  Fica mais valioso com cada nova interação, dado e aprendizado.
  │  Permanece após qualquer mudança de feature ou tecnologia.
  │  Ciclo de vida: décadas.
  │  Exemplos: cinco anos de histórico de preços, rede de reputação
  │  verificada de merchants, mapa de lacunas de catálogo.
  │
  ▼
MOAT
  │
  │  Uma barreira competitiva estrutural, construída sobre um ou mais ativos.
  │  Torna progressivamente mais difícil para concorrentes reproduzir
  │  o que o ParaguAI oferece.
  │  Cresce com o tempo; não pode ser replicada rapidamente com capital.
  │  Ciclo de vida: décadas.
  │  Exemplos: Historical Data Moat, Merchant Trust Network Moat.
  │  (ver MOAT_STRATEGY para análise completa)
  │
  ▼
ENTERPRISE VALUE
  │
  │  O valor econômico total da empresa, determinado principalmente
  │  pela força e defensabilidade de seus Moats.
  │  Ativos fortes → Moats fortes → Empresa difícil de substituir
  │  → Alto valor percebido por investidores, parceiros e o mercado.
```

### Por que funcionalidades não são patrimônio

Uma feature resolve um problema hoje. Amanhã, o problema muda, a tecnologia muda, o usuário muda — e a feature se torna obsoleta ou precisa ser reescrita.

Um ativo estratégico não fica obsoleto. O histórico de preços de cinco anos não se torna obsoleto quando a interface é redesenhada. A rede de reputação de merchants não desaparece quando o backend é migrado. O conhecimento acumulado de padrões de busca não é invalidado por uma mudança de framework.

A diferença essencial: uma feature existe no código. Um ativo existe no dado, no conhecimento e nas relações. Código pode ser reescrito. Dados acumulados não podem ser retroativamente criados.

### O que torna algo um ativo estratégico

Para ser classificado como ativo estratégico, um elemento deve satisfazer os três critérios:

1. **Acumulação**: cresce com o tempo, com novas interações ou com novos dados — independentemente de ação deliberada após sua criação.
2. **Permanência**: permanece valioso após mudanças de feature, tecnologia ou interface.
3. **Diferenciação**: não pode ser rapidamente reproduzido por um concorrente que comece hoje, mesmo com recursos equivalentes.

Elementos que satisfazem apenas um ou dois critérios são capacidades ou infraestrutura — valiosos, mas não ativos estratégicos.

---

# CAPÍTULO 2 — Catálogo Oficial de Ativos

**Nota metodológica**: os candidatos foram avaliados com rigor. O critério de inclusão exige que os três critérios do Capítulo 1 sejam satisfeitos. A classificação em Core, Supporting ou Future reflete o estágio atual de maturidade — não a importância estratégica de longo prazo.

---

## CORE ASSETS — Ativos Centrais

São os ativos que diretamente sustentam os Moats permanentes. São os mais valiosos, os mais difíceis de reproduzir e os que mais aumentam o valor da empresa.

---

### Asset C-1 — Historical Price Data

**Definição**: o conjunto acumulado de variações de preço, disponibilidade e oferta de produtos ao longo do tempo, registrado por merchant e por produto, desde o início da operação da plataforma.

**Como nasce**: com o primeiro preço importado e registrado em `price_history`. Começa mínimo e cresce automaticamente com cada ciclo de importação.

**Como cresce**: automaticamente. Cada importação de dados de merchant que detecta variação de preço ou disponibilidade adiciona ao ativo. Sem ação deliberada necessária após a infraestrutura de coleta estar em funcionamento.

**Como envelhece**: não envelhece negativamente. Dados antigos não perdem valor — ganham valor à medida que o histórico se torna mais longo e padrões plurianuais emergem. O único risco é corrupção de dados ou perda de integridade histórica.

**Como fortalece outros ativos**: alimenta o Cross-Border Context Model (padrões regionais de preço), a Search Intelligence (relação entre busca e flutuação de preço), o Merchant Behavioral Knowledge (consistência de atualização por merchant) e o ParaguAI Brain Knowledge (modelos de predição de preço).

**Release 1.7 — Wave 4 (Canonical Catalog)**: o histórico de preço passa a pertencer ao Canonical Product, não apenas à Offer — um produto vendido por dez lojas diferentes acumula um único patrimônio temporal agregado (menor/maior/média/variação/tendência), em vez de dez históricos fragmentados e não comparáveis entre si. É o mesmo ativo de sempre, agora com a identidade permanente que o torna comparável de fato.

**Moat primário sustentado**: Historical Data Moat.

**Justificativa de classificação Core**: satisfaz os três critérios. É o ativo mais irreplicável do ParaguAI — um concorrente que entrar no mercado hoje leva anos para ter histórico equivalente, a qualquer custo.

---

### Asset C-2 — Merchant Trust Score

**Definição**: o conjunto de sinais verificados de comportamento de cada merchant ao longo do tempo: consistência de atualização de dados, qualidade do catálogo, histórico de Merchant Score, avaliações verificadas de compradores, nível de verificação progressivo.

**Como nasce**: com o primeiro Merchant Score calculado para um merchant. A partir do primeiro ciclo de avaliação de qualidade, o ativo começa a existir.

**Como cresce**: com cada ciclo de scoring (o score muda), com cada review verificado aprovado, com cada mês de consistência de dados. Cresce em profundidade temporal — um score de merchant após 24 meses é radicalmente mais informativo que um score após 2 meses.

**Como envelhece**: dados antigos de comportamento mantêm relevância contextual, mas comportamento recente tem peso maior. O ativo não envelhece negativamente — registros históricos de comportamento são evidência permanente, mesmo que o merchant tenha mudado seu comportamento desde então.

**Como fortalece outros ativos**: alimenta o Historical Price Data com metadado de confiabilidade (dados de merchants com score alto têm maior confiabilidade histórica), a Search Intelligence (resultados de merchants confiáveis têm mais peso) e o ParaguAI Brain Knowledge (o Brain aprende a calibrar confiabilidade de dados por merchant).

**Release 1.7 — Wave 5 (Merchant Acquisition & Ownership Platform)**: Progressive Verification (`src/domains/merchant-ownership/`) é o primeiro mecanismo real de verificação automática de propriedade de loja — confidence explicável por fatores nomeados (e-mail, telefone, WhatsApp, website, Instagram comparados com os dados já cadastrados na loja), nunca um score opaco. O `trust_score` em si continua sem algoritmo de cálculo (ADR-041 ainda não escrito), mas esta Wave entrega o primeiro sinal estruturado e auditável que um futuro scorer poderá consumir.

**Moat primário sustentado**: Merchant Trust Network Moat.

**Justificativa de classificação Core**: a combinação de comportamento verificado + dimensão temporal não pode ser criada instantaneamente. É um ativo que exige presença contínua e observação ao longo do tempo.

---

### Asset C-3 — Normalized Catalog

**Definição**: a taxonomia normalizada e acumulada de produtos, marcas e categorias — com identidades únicas, slugs canônicos, relações entre entidades e correspondências entre denominações de diferentes merchants para o mesmo produto real.

**Como nasce**: com o primeiro produto normalizado e inserido no catálogo com identidade única. O processo de normalização e deduplicação produz o ativo.

**Como cresce**: com cada produto importado, cada marca identificada, cada categoria mapeada, cada correspondência entre denominações de merchants estabelecida. Cresce em cobertura e em precisão das relações entre entidades.

**Como envelhece**: o catálogo normalizado não envelhece negativamente. Produtos descontinuados mantêm valor histórico (preço de comparação, referência). A precisão das relações entre entidades melhora — não piora — com o tempo.

**Como fortalece outros ativos**: é a fundação de todos os outros ativos. Sem catálogo normalizado, não há Historical Price Data coerente (o mesmo produto precisa de identidade única para ter histórico comparável), não há Search Intelligence significativa (busca por produto sem identidade única produz ruído) e não há Brain Knowledge estruturado.

**Release 1.7 — Wave 4 (Canonical Catalog)**: a "identidade única" descrita nesta definição deixa de ser um efeito colateral do upsert por slug e se torna uma entidade própria — `CanonicalProduct`, independente do connector de origem (`src/domains/canonical-catalog/`). `Product` passa a representar a origem/importação; `CanonicalProduct` representa a identidade permanente. Merge Candidates (Shadow Mode — nenhuma união automática) começam a mapear correspondências entre produtos de connectors diferentes, com confidence e fatores explicáveis, preparando a normalização completa do catálogo sem nunca arriscar uma união incorreta.

**Moat primário sustentado**: todos os Moats — o Normalized Catalog é a camada de dados fundacional que torna os demais ativos coerentes.

**Justificativa de classificação Core**: é o ativo estrutural que habilita todos os outros. Sem ele, os dados acumulados são ruído, não informação. É o mais difícil de construir porque requer julgamento sobre identidade de produto — o que é o mesmo produto em denominações diferentes de merchants diferentes.

---

### Asset C-4 — Search Intelligence

**Definição**: o conhecimento acumulado de intenção de busca dos compradores: o que buscam, com que frequência, o que encontram, o que não encontram, quais queries levam a decisões e quais queries terminam sem resultado.

**Como nasce**: com o primeiro `search_log` registrado. A partir do momento em que buscas começam a ser logadas estruturalmente, o ativo começa a existir.

**Como cresce**: com cada busca registrada. Automaticamente. Cresce em volume, em cobertura de padrões e em precisão da detecção de lacunas. Buscas sem resultado são o crescimento mais estratégico — mapeiam o que o mercado quer e a plataforma não tem.

**Como envelhece**: dados antigos de busca têm valor histórico (sazonalidade, tendências plurianuais), mas padrões recentes têm mais peso para decisões operacionais. O ativo não envelhece — torna-se mais estratificado ao longo do tempo.

**Como fortalece outros ativos**: orienta a expansão do Normalized Catalog (quais produtos precisam ser adicionados), informa o Merchant Behavioral Knowledge (quais merchants precisam de recomendações de catálogo), alimenta o Cross-Border Context Model (padrões de busca específicos da região) e o ParaguAI Brain Knowledge (o Brain aprende a prever o que será buscado antes de ser buscado).

**Release 1.7 — Wave 4 (Canonical Catalog)**: o Compare Foundation (`CompareFoundationService`) prepara a infraestrutura de ranking interno de ofertas (preço, estoque, recência, confiança verificável — nunca Reputation Score) por Canonical Product — a base de dados que, quando a busca passar a operar sobre identidade canônica em vez de produto-por-connector, tornará os resultados de busca comparáveis entre lojas de fato, não apenas por nome semelhante.

**Moat primário sustentado**: Search Intelligence Moat, Data Flywheel Moat.

**Justificativa de classificação Core**: é o único ativo que captura diretamente a demanda — o que o mercado quer que ainda não existe. Nenhuma fonte pública de dados tem esse nível de especificidade regional. Um concorrente que entrar amanhã começa sem nenhum dado de busca deste mercado.

---

### Asset C-5 — Cross-Border Context Model

**Definição**: o modelo acumulado de padrões específicos do mercado da Tríplice Fronteira: dinâmicas de câmbio e seu impacto nos preços, categorias dominantes por temporada, comportamento de compradores turistas versus residentes, calendário comercial regional, relação entre disponibilidade e preço por categoria.

**Como nasce**: de forma implícita, desde a primeira operação — cada dado coletado neste mercado específico adiciona contexto. Formalmente, nasce quando os padrões começam a ser estruturados e consultados.

**Como cresce**: com cada ciclo comercial adicional que expõe um padrão novo. Com cada episódio de variação cambial documentado. Com cada sazonalidade registrada que se repete e se confirma. O modelo fica mais preciso — não mais volumoso — com o tempo.

**Como envelhece**: padrões antigos mantêm valor histórico mas podem ser superados por mudanças estruturais de mercado. O ativo precisa de curadoria periódica para distinguir padrões permanentes de padrões temporários. É o único Core Asset que pode envelecer negativamente se não atualizado.

**Como fortalece outros ativos**: dá contexto ao Historical Price Data (preços em guaranis e dólar precisam de contexto cambial para serem comparáveis), enriquece a Search Intelligence (padrões de busca têm sazonalidade regional), e é o insumo mais diferenciado para o ParaguAI Brain Knowledge (o que o Brain sabe que nenhum modelo genérico sabe).

**Release 1.7 — Wave 4 (Canonical Catalog)**: comparar preço entre lojas da fronteira só é contextualmente significativo quando o "mesmo produto" é de fato o mesmo produto — a identidade canônica é o pré-requisito estrutural para que padrões cambiais/regionais por produto (não por oferta isolada) comecem a ser observáveis com precisão.

**Moat primário sustentado**: Cross-Border Context Intelligence Moat.

**Justificativa de classificação Core**: é o ativo de maior vantagem competitiva em relação a players globais. Nenhuma plataforma de escala global possui dados específicos sobre este mercado — precisão local é impossível sem presença local ao longo do tempo.

---

### Asset C-6 — Buyer Behavioral Knowledge

**Definição**: o conhecimento acumulado de como compradores deste mercado tomam decisões: como navegam pelo catálogo, como comparam produtos, quais informações influenciam a decisão, como a confiança em uma loja afeta o comportamento, como o histórico de preço altera a percepção de valor.

**Como nasce**: com os primeiros eventos de comportamento registrados (visualizações, comparações, cliques em oferta, adições a favoritos). Começa imediatamente, mas cresce em qualidade quando compradores autenticados permitem correlação de sessões.

**Como cresce**: com cada evento de comportamento registrado. Com cada comprador que cria conta e permite rastreamento persistente de padrões. Com cada ciclo de personalização que gera feedback sobre o que funciona.

**Como envelhece**: padrões comportamentais específicos (como a sequência de busca → compare → decisão) têm relevância duradoura. Padrões de preferência por produto ou categoria são mais voláteis. O ativo cresce em sofisticação — dados mais antigos enriquecem a baseline; dados recentes capturam mudanças.

**Como fortalece outros ativos**: informa a Search Intelligence (o que acontece depois de uma busca), alimenta o Merchant Behavioral Knowledge (como o comportamento do comprador impacta a performance do merchant) e é o insumo central para o sistema de recomendação futuro (Asset F-1).

**Release 1.7 — Wave 5 (Merchant Acquisition & Ownership Platform)**: Delegated Management amplia o conhecimento organizacional de quem realmente opera cada loja — gerente, marketing, agência, administrador, operador — um sinal comportamental que antes não existia (só o proprietário original era visível). Isso enriquece a base sobre a qual o Brain futuramente distinguirá comportamento do dono versus comportamento de um gestor terceirizado.

**Pré-Release 1.8 — Buyer Identity Model (ADR-045/046)**: o mecanismo técnico exato que faz este ativo avançar de "Incipiente" para "Ativo Maduro" (Síntese do Catálogo) foi definido — a ponte `anonymous_id → buyers.id` (`docs/product/releases/RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §4) permite correlação de sessão persistente através de uma identidade de comprador real, não apenas `anonymous_id` efêmero por dispositivo, exatamente a condição de maturação que "Como nasce" acima já previa. `buyers.id` funciona como chave de pseudonimização controlada por RLS — o Brain recebe o identificador comportamental, nunca as colunas de PII (`email`/`display_name`/`phone`), preservando a separação comportamento/identidade que este próprio Asset e `VISION_2035.md` §10 já exigiam. Implementação (Wave 6) ainda não iniciada — decisão arquitetural completa.

**Release 1.8 — Program 0, Wave 0 (Brain Analytics Integration, 2026-07-02)**: a ponte oficial `buyer_events` → Brain foi construída e verificada end-to-end contra o banco real — `BuyerEventBrainBridgeService` roda sincronamente a cada evento gravado (sem fila, sem cron), converte eventos com `merchant_id` resolvido (`MerchantViewed`, `MerchantPassportViewed`, cliques de contato — WhatsApp/telefone/site consolidados em `TrustEventType.MerchantContactClicked` com `contact_channel` em metadata) em `merchant_trust_events`, e `KnowledgeGraphService` (existente desde o Release 1.5 Epic 4, nunca antes exercitado em produção) deriva relações `Buyer→Merchant` reais a partir deles — confirmado por uma nova rota `GET /api/trust/merchant/[merchantId]/graph`, a primeira a expor o Knowledge Graph. Identidade sempre pseudônima (`buyer_id ?? anonymous_id`, nunca PII, nunca a coluna `created_by` — que é FK para `profiles(id)`, e comprador nunca é uma linha de `profiles`, ADR-031/046). Status de maturação permanece **Incipiente**, não avança para "Ativo": o mecanismo agora é real e verificado, mas o volume acumulado hoje é efetivamente zero — checagem em produção encontrou **zero lojas com `merchant_stores` preenchido** (2 merchants em rascunho, nenhuma claim aprovada), então nenhum evento real de comprador tem `merchant_id` para atravessar a ponte ainda. Fora do escopo desta Wave, nomeado: eventos sem merchant (busca, navegação por categoria/marca, view de produto sem loja específica) — a maioria do comportamento real de um marketplace — não têm para onde ir hoje, já que `merchant_trust_events.merchant_id` é `NOT NULL` por design (Release 1.5); isso é Marketplace Intelligence / Search Intelligence (C-4) território, que segue sem armazenamento próprio no Brain. Ver `docs/product/releases/RELEASE_1_8_PROGRAM_0_WAVE_0_REPORT.md`.

**Moat primário sustentado**: Data Flywheel Moat, ParaguAI Brain Moat.

**Justificativa de classificação Core**: é o ativo que habilita personalização real — não personalização genérica por categoria, mas personalização informada por comportamento específico neste mercado. Sem esse ativo, o Brain é genérico. Com ele, o Brain é contextual.

---

## SUPPORTING ASSETS — Ativos de Suporte

São ativos que amplificam, validam ou habilitam os Core Assets. Não sustentam Moats diretamente — mas sua ausência ou degradação enfraquece os Core Assets.

---

### Asset S-1 — Merchant Network

**Definição**: o conjunto ativo de merchants integrados à plataforma: quantidade, diversidade de categorias, cobertura geográfica, profundidade do catálogo por merchant, estágio de integração (manual vs. automatizado).

**Como cresce**: com cada novo merchant integrado e com o aprofundamento da integração de merchants existentes (da importação manual para conectores automáticos).

**Por que é Supporting, não Core**: o número de merchants é instrumental — não é valioso por si mesmo. Cem merchants com dados desatualizados são menos valiosos que vinte merchants com dados de alta qualidade. O valor está nos dados que os merchants produzem (Core Assets C-1, C-3) — não na contagem de merchants.

**O que torna este ativo valioso**: a diversidade de categorias e a cobertura de preços comparáveis. Um ativo de Merchant Network saudável é aquele onde qualquer produto importante para o comprador deste mercado tem cobertura de múltiplos merchants, permitindo comparação real.

**Release 1.7 — Wave 5 (Merchant Acquisition & Ownership Platform)**: o funil de crescimento deste ativo deixa de depender inteiramente de cadastro manual — o Smart Claim Flow (`src/domains/merchant-ownership/`) converte lojas descobertas automaticamente (Wave 2) em merchants ativos e verificados, com Progressive Verification tornando o processo rápido para o dono legítimo e caro para um impostor. Delegated Management permite que um merchant escale operação (gerente, marketing, agência) sem multiplicar contas, aprofundando a integração sem multiplicar apenas a contagem.

---

### Asset S-2 — Data Quality Layer

**Definição**: o conjunto acumulado de regras, padrões, heurísticas e detecção de anomalia que garantem que os dados dos Core Assets são confiáveis o suficiente para ser usados em decisões.

**Como cresce**: com cada anomalia detectada e catalogada, cada regra de validação adicionada, cada padrão de dados incorretos de merchant identificado e corrigido.

**Por que é Supporting, não Core**: a qualidade de dados não é um ativo em si — é uma propriedade dos Core Assets. Um Data Quality Layer forte garante que o Historical Price Data seja confiável; sem ele, o Core Asset se degrada silenciosamente.

**Risco central**: degradação invisível. Dados incorretos que passam pelos filtros de qualidade corrompem o Historical Price Data sem sinalização clara. A Data Quality Layer precisa de manutenção ativa — é o único Supporting Asset com risco de envelhecimento negativo sem curadoria.

---

### Asset S-3 — Connector Knowledge

**Definição**: o conhecimento técnico e operacional acumulado de como integrar e manter atualizado o catálogo de diferentes tipos de merchants: estruturas de dados, anomalias recorrentes, frequências de atualização, transformações necessárias por categoria de merchant.

**Como cresce**: com cada novo conector desenvolvido, cada merchant integrado, cada padrão de dados inesperado encontrado e resolvido.

**Por que é Supporting, não Core**: o Connector Knowledge habilita a aquisição de dados — mas é o dado adquirido (Historical Price Data, Normalized Catalog) que é o ativo real. O conhecimento técnico de integração pode ser replicado por qualquer equipe técnica competente, com tempo suficiente.

**Valor estratégico real**: velocidade. O Connector Knowledge permite integrar novos merchants mais rapidamente do que um concorrente sem esse conhecimento. A vantagem não é de possibilidade — é de tempo.

---

### Asset S-4 — Review & Reputation Data

**Definição**: o conjunto de avaliações verificadas de compradores sobre merchants, incluindo nota, texto, metadados de elegibilidade e histórico de moderação.

**Como nasce**: com o primeiro review verificado e aprovado. Antes disso, não existe como ativo — dados não coletados não são ativos.

**Por que é Supporting, não Core**: o Review Data é um componente do Merchant Trust Score (C-2) — não um ativo independente. O valor dos reviews não está na contagem — está na sua contribuição para a qualidade do sinal de confiança do merchant. Separado do Merchant Trust Score, um conjunto de reviews sem contexto de comportamento histórico do merchant tem valor limitado.

**Potencial de upgrade para Core**: se o volume de reviews crescer suficientemente para permitir análise de sentimento, detecção de tendências por categoria e personalização por perfil de comprador, o Review & Reputation Data pode ser promovido para Core Asset independente. Isso requer volume e qualidade que ainda não existem.

---

### Asset S-5 — Operational Knowledge

**Definição**: o conhecimento acumulado de como operar a plataforma de forma eficiente: padrões de moderação de conteúdo, fluxos de validação de merchant, heurísticas de curadoria de catálogo, conhecimento de quando intervir manualmente vs. confiar na automação.

**Como cresce**: com cada decisão operacional tomada, cada incidente resolvido, cada processo de moderação que revela um padrão.

**Por que é Supporting, não Core**: é conhecimento operacional — valioso para a equipe, mas não diretamente percebido pelo usuário e não acumulado como dado estruturado. É um ativo de capacidade humana, não de dados.

---

## FUTURE ASSETS — Ativos Futuros

São ativos que não existem ainda, mas para os quais a infraestrutura de dados está sendo preparada. Não podem ser considerados Core ou Supporting hoje — mas devem ser contemplados nas decisões de design de Core Assets para que a transição seja natural quando o momento chegar.

---

### Asset F-1 — Recommendation Model Knowledge

**Definição**: o modelo acumulado de quais recomendações levam a melhores decisões de compra para compradores específicos neste mercado — o que recomendar, quando, para qual perfil de comprador.

**Por que é Future**: requer volume de Buyer Behavioral Knowledge (C-6) suficiente para calibrar recomendações por perfil. Requer Brain. Requer compradores autenticados com histórico. Nenhum desses pré-requisitos está maduro.

**O que prepara hoje**: Buyer Behavioral Knowledge (C-6), Search Intelligence (C-4), Review & Reputation Data (S-4).

---

### Asset F-2 — Tourism Intelligence

**Definição**: o modelo específico de comportamento de compradores turistas: origem geográfica, categorias de preferência, sensibilidade a preço, padrões de visita, relação entre câmbio e volume de compra.

**Por que é Future**: requer dados de compradores autenticados (com origem identificável) em volume suficiente para distinguir turistas de residentes e construir modelos por perfil turístico. Ainda não existe o contexto de usuário autenticado suficiente.

**O que prepara hoje**: Cross-Border Context Model (C-5), Buyer Behavioral Knowledge (C-6).

---

### Asset F-3 — Semantic Knowledge

**Definição**: compreensão semântica de produtos neste mercado específico — sinônimos regionais, variações de nomenclatura, relações de substitutibilidade entre produtos, contexto cultural de uso.

**Por que é Future**: requer Brain. O Semantic Knowledge não pode ser construído manualmente a escala — requer inferência a partir de padrões de busca e comportamento de compra que ainda estão em fase inicial de acumulação.

**O que prepara hoje**: Search Intelligence (C-4), Normalized Catalog (C-3).

---

### Asset F-4 — Marketplace Liquidity Model

**Definição**: o modelo de dinâmicas de oferta e demanda por categoria: quais categorias têm excesso de oferta, quais têm escassez, quais têm sazonalidade clara, quais têm correlação com variações cambiais.

**Por que é Future**: requer Merchant Network (S-1) com cobertura suficiente por categoria para que a relação oferta/demanda seja mensurável — não apenas observable em categorias específicas.

**O que prepara hoje**: Historical Price Data (C-1), Search Intelligence (C-4), Cross-Border Context Model (C-5).

---

### Síntese do Catálogo

| Asset | Categoria | Moat primário | Maturidade atual |
|---|---|---|---|
| C-1 Historical Price Data | Core | Historical Data | Em acumulação |
| C-2 Merchant Trust Score | Core | Merchant Trust Network | Em acumulação |
| C-3 Normalized Catalog | Core | Todos | Em acumulação |
| C-4 Search Intelligence | Core | Search Intelligence | Incipiente (Release 1.5) |
| C-5 Cross-Border Context Model | Core | Cross-Border Context | Implícito, não estruturado |
| C-6 Buyer Behavioral Knowledge | Core | Data Flywheel, Brain | Incipiente — mecanismo Brain-conectado e verificado (Release 1.8 Program 0 Wave 0), volume real ~zero (zero lojas reivindicadas em produção) |
| S-1 Merchant Network | Supporting | Merchant OS Switching Cost | Ativo |
| S-2 Data Quality Layer | Supporting | Todos (transversal) | Ativo |
| S-3 Connector Knowledge | Supporting | Import Intelligence | Ativo |
| S-4 Review & Reputation Data | Supporting | Merchant Trust Network | Incipiente (Release 1.5) |
| S-5 Operational Knowledge | Supporting | Nenhum direto | Ativo |
| F-1 Recommendation Model Knowledge | Future | Brain | Não iniciado |
| F-2 Tourism Intelligence | Future | Cross-Border Context | Não iniciado |
| F-3 Semantic Knowledge | Future | Brain | Não iniciado |
| F-4 Marketplace Liquidity Model | Future | Data Flywheel | Não iniciado |

---

# CAPÍTULO 3 — Asset Lifecycle

Todo ativo estratégico percorre um ciclo de vida com seis estágios distintos. A gestão consciente desse ciclo é o que diferencia um ativo estratégico de um banco de dados subutilizado.

```
ESTÁGIO 1 — IDEIA
  │
  │  Um problema estratégico ou oportunidade de acumulação é identificado.
  │  Pergunta: existe um dado que, se acumulado ao longo do tempo, 
  │  tornaria o ParaguAI progressivamente mais valioso?
  │  Critério para avançar: o dado satisfaz os três critérios de ativo
  │  estratégico (acumulação, permanência, diferenciação).
  │
  ▼
ESTÁGIO 2 — INSTRUMENTAÇÃO
  │
  │  A infraestrutura para coletar e estruturar o dado é criada.
  │  O schema de dados é definido com rigor — uma escolha ruim aqui
  │  cria débito irrecuperável.
  │  Critério para avançar: o dado está sendo coletado de forma estruturada,
  │  consistente e com qualidade verificável.
  │
  ▼
ESTÁGIO 3 — COLETA INICIAL
  │
  │  O ativo existe mas ainda não tem volume suficiente para produzir
  │  padrões significativos. É o período de investimento sem retorno imediato.
  │  Duração típica: meses a um ano.
  │  Critério para avançar: volume suficiente para que análises básicas
  │  sejam estatisticamente significativas.
  │
  ▼
ESTÁGIO 4 — APRENDIZADO
  │
  │  Padrões emergem. O dado começa a produzir inteligência que não estava
  │  disponível antes. Primeiras hipóteses são testadas contra o dado acumulado.
  │  O ativo começa a alimentar decisões de produto, operação e estratégia.
  │  Critério para avançar: o ativo produz pelo menos um insight acionável
  │  que não era possível antes de sua existência.
  │
  ▼
ESTÁGIO 5 — ATIVO MADURO
  │
  │  O ativo tem volume, qualidade e estrutura suficientes para ser
  │  considerado patrimônio estratégico real. Alimenta outros ativos,
  │  sustenta Moats e contribui para o valor da empresa.
  │  O ativo cresce automaticamente sem ação deliberada adicional
  │  além da manutenção de qualidade.
  │  Critério de permanência: o ativo continuaria crescendo mesmo se
  │  a equipe não tomasse nenhuma ação por 30 dias.
  │
  ▼
ESTÁGIO 6 — MOAT CONTRIBUTION
  │
  │  O ativo maduro contribui de forma mensurável para pelo menos um Moat.
  │  A contribuição é verificável: um concorrente que tenta replicar o Moat
  │  precisaria reproduzir este ativo — o que requer tempo que não pode
  │  ser comprado.
  │  Este é o estágio de maior valor para a empresa.
  │
  └──── [o ativo continua crescendo, alimentando Moats e o Brain]
```

### Critérios de transição entre estágios

Um ativo não avança automaticamente entre estágios — precisa satisfazer os critérios explícitos de cada transição. O erro mais comum é declarar um ativo "maduro" antes que ele tenha passado pelo Estágio 4 (Aprendizado) — antes que tenha produzido qualquer inteligência real.

### O risco do Estágio 3

O Estágio 3 (Coleta Inicial) é o mais vulnerável a abandono. O ativo não produz valor perceptível ainda. A pressão por resultados imediatos pode levar à interrupção da coleta antes que o volume necessário para o Estágio 4 seja atingido.

Esta é a razão pela qual a coleta de dados estratégicos deve ser tratada como infraestrutura permanente — não como funcionalidade com critério de sucesso de curto prazo.

---

# CAPÍTULO 4 — Asset Graph

O grafo abaixo demonstra como os ativos se alimentam mutuamente. Uma seta (→) representa "alimenta diretamente". Uma seta dupla (⇒) representa "é o insumo primário de".

```
╔═══════════════════════════════════════════════════════════╗
║              CAMADA FUNDACIONAL                           ║
╚═══════════════════════════════════════════════════════════╝

        NORMALIZED CATALOG [C-3]
               │
               │  É a fundação de todos os ativos.
               │  Sem identidade única de produto,
               │  nenhum dado acumulado é coerente.
               │
        ┌──────┼──────────────────────┐
        │      │                      │
        ▼      ▼                      ▼
  DATA        HISTORICAL         SEARCH
  QUALITY     PRICE DATA         INTELLIGENCE
  LAYER       [C-1]              [C-4]
  [S-2]       │                  │
        │      │                  │
        └──────┘                  │
               │                  │
               ▼                  ▼
╔═══════════════════════════════════════════════════════════╗
║              CAMADA DE CONFIANÇA                          ║
╚═══════════════════════════════════════════════════════════╝

  REVIEW &          MERCHANT              CONNECTOR
  REPUTATION        TRUST SCORE           KNOWLEDGE
  DATA [S-4]        [C-2]                 [S-3]
        │                │                     │
        └────────┬────────┘                    │
                 │                             │
                 ▼                             ▼
         MERCHANT NETWORK [S-1] ◄──────────────┘
                 │
                 │  Merchants ativos com reputação verificada
                 │  produzem mais dados de qualidade para C-1 e C-3
                 │
                 ▼
╔═══════════════════════════════════════════════════════════╗
║              CAMADA DE CONTEXTO                           ║
╚═══════════════════════════════════════════════════════════╝

  CROSS-BORDER              BUYER BEHAVIORAL
  CONTEXT MODEL             KNOWLEDGE [C-6]
  [C-5]                           │
        │                         │
        │  contexto regional       │  padrões de decisão
        │  enriquece dados         │  por comprador
        │                         │
        └──────────┬──────────────┘
                   │
                   ▼
╔═══════════════════════════════════════════════════════════╗
║              CAMADA DE INTELIGÊNCIA                       ║
╚═══════════════════════════════════════════════════════════╝

                PARAGUAI BRAIN KNOWLEDGE
                [absorve todos os ativos acima]
                         │
                ┌────────┼─────────────────┐
                │        │                 │
                ▼        ▼                 ▼
          RECOMMENDATION  TOURISM      SEMANTIC
          MODEL KNOWLEDGE INTELLIGENCE KNOWLEDGE
          [F-1]           [F-2]        [F-3]
                │
                ▼
         MARKETPLACE
         LIQUIDITY MODEL
         [F-4]


╔═══════════════════════════════════════════════════════════╗
║            RETROALIMENTAÇÃO — O BRAIN FORTALECE OS ATIVOS ║
╚═══════════════════════════════════════════════════════════╝

  PARAGUAI BRAIN
        │
        ├──► melhora qualidade de busca → mais Search Intelligence [C-4]
        │
        ├──► detecta anomalias → fortalece Data Quality Layer [S-2]
        │
        ├──► calibra Trust Score → fortalece Merchant Trust Score [C-2]
        │
        ├──► produz recomendações → gera Buyer Behavioral Knowledge [C-6]
        │
        └──► refina contexto → aprofunda Cross-Border Context Model [C-5]
```

### A propriedade mais importante do grafo

Todo Core Asset alimenta o Brain. O Brain retroalimenta todos os Core Assets. Isso cria um sistema de melhoria contínua que se acelera com o tempo: quanto mais maduro o Brain, melhor cada Core Asset; quanto melhor cada Core Asset, mais preciso o Brain.

Este ciclo de retroalimentação é o que torna o conjunto de ativos do ParaguAI qualitativamente diferente de qualquer banco de dados estruturado — ele melhora por sua própria operação.

---

# CAPÍTULO 5 — Asset Flywheel

O Asset Flywheel é o mecanismo pelo qual os ativos estratégicos se auto-amplificam. É diferente do Data Flywheel do MOAT_STRATEGY — enquanto o Data Flywheel descreve o loop de crescimento de usuários, o Asset Flywheel descreve como os próprios ativos se fortalecem mutuamente.

```
USUÁRIOS CHEGAM À PLATAFORMA
         │
         │  compradores e merchants interagem com o catálogo
         │
         ▼
INTERAÇÕES SÃO REGISTRADAS
         │
         │  buscas, comparações, cliques, avaliações, atualizações de preço
         │
         ▼
DADOS ALIMENTAM CORE ASSETS
         │
         ├──► Historical Price Data [C-1] fica mais profundo
         ├──► Search Intelligence [C-4] fica mais preciso
         ├──► Buyer Behavioral Knowledge [C-6] fica mais rico
         └──► Merchant Trust Score [C-2] fica mais informado
         │
         ▼
CORE ASSETS ALIMENTAM O BRAIN
         │
         │  volume e qualidade suficientes para padrões emergentes
         │
         ▼
BRAIN PRODUZ INTELIGÊNCIA SUPERIOR
         │
         ├──► busca mais relevante
         ├──► comparação mais honesta
         ├──► recomendações mais precisas
         └──► alertas mais acionáveis
         │
         ▼
EXPERIÊNCIA SUPERIOR PARA USUÁRIOS
         │
         │  compradores tomam melhores decisões
         │  merchants operam com mais inteligência
         │
         ▼
MAIS USUÁRIOS → MAIS INTERAÇÕES
         │
         │  o flywheel acelera
         │
         └──── [retorna ao início, com mais velocidade]
```

### Como cada ativo acelera o próximo

**Historical Price Data** (C-1) acelera o **Cross-Border Context Model** (C-5) — quanto mais dados históricos, mais clara a relação entre câmbio e preço por categoria.

**Search Intelligence** (C-4) acelera o **Normalized Catalog** (C-3) — as lacunas de busca orientam quais produtos precisam ser adicionados e com qual taxonomia.

**Merchant Trust Score** (C-2) acelera o **Buyer Behavioral Knowledge** (C-6) — compradores que confiam em lojas verificadas interagem de forma mais decisiva, produzindo dados comportamentais mais ricos.

**Normalized Catalog** (C-3) acelera o **Historical Price Data** (C-1) — sem identidade única de produto, o histórico de preço é fragmentado e menos útil.

**Buyer Behavioral Knowledge** (C-6) acelera o **Search Intelligence** (C-4) — o que compradores fazem depois de uma busca revela o que a busca realmente significava.

**Cross-Border Context Model** (C-5) acelera todos os outros — contexto transforma dado bruto em informação interpretável.

### O threshold de aceleração

O Flywheel não opera em velocidade constante. Existe um ponto de inflexão — geralmente quando múltiplos Core Assets atingem o Estágio 5 (Ativo Maduro) simultaneamente — após o qual a aceleração torna-se perceptivelmente maior. Antes desse ponto, o crescimento é linear e pode parecer insuficiente. Após esse ponto, torna-se composto.

A estratégia de curto prazo é atingir o threshold o mais rápido possível, sem comprometer a qualidade dos dados.

---

# CAPÍTULO 6 — Asset Health Framework

**Metodologia permanente de avaliação da saúde de cada ativo.**

O Asset Health Framework não produz um score único — produz um perfil de oito dimensões que permite identificar onde cada ativo é forte, onde está estagnado e onde está em risco.

### As oito dimensões

**1. Cobertura**  
Qual percentual do potencial total do ativo está coberto? Um Historical Price Data que cobre 30% dos produtos do catálogo tem cobertura baixa. Um Merchant Trust Score que tem dados de apenas 40% dos merchants ativos tem cobertura insuficiente para ser estatisticamente representativo.  
*Pergunta diagnóstica: se dobrássemos a cobertura, a qualidade das decisões que esse ativo habilita dobraria também?*

**2. Qualidade**  
Os dados acumulados são suficientemente precisos para produzir insights confiáveis? Quantidade sem qualidade é ruído — não ativo. Preços desatualizados no Historical Price Data são piores que ausência de histórico — porque criam falsa confiança.  
*Pergunta diagnóstica: o usuário que confia nesse ativo para tomar uma decisão tomaria uma decisão melhor ou pior do que sem ele?*

**3. Profundidade Temporal**  
Há quanto tempo o ativo existe e está crescendo de forma contínua? Um ativo com 6 meses de histórico é radicalmente menos valioso que um ativo com 36 meses — mesmo com volume diário equivalente.  
*Pergunta diagnóstica: existe no ativo algum padrão que só poderia ser identificado porque ele existe há mais de um ano?*

**4. Taxa de Crescimento**  
O ativo está crescendo? Em que velocidade? Cresce linearmente, exponencialmente ou está estagnado?  
*Pergunta diagnóstica: o ativo de hoje é meaningfully diferente do ativo de 30 dias atrás?*

**5. Dependência de Rede**  
O ativo fica mais valioso quando mais usuários ou merchants participam da plataforma? Quanto maior o efeito de rede, mais o ativo se auto-amplifica.  
*Pergunta diagnóstica: o ativo dobraria de valor se a base de usuários dobrasse?*

**6. Prontidão para Brain**  
O ativo está estruturado de forma que o Brain possa usá-lo de forma eficiente? Dados não estruturados, sem schema consistente ou com ruído excessivo não são usáveis pelo Brain mesmo que volumosos.  
*Pergunta diagnóstica: se o Brain fosse ativado amanhã, este ativo já é um insumo utilizável sem limpeza adicional?*

**7. Potencial de Monetização**  
O ativo poderia gerar valor econômico direto ou indireto? Dados históricos de mercado podem ser licenciados. Sinais de confiança podem aumentar conversão de planos pagos. Inteligência de busca pode orientar publicidade contextual.  
*Pergunta diagnóstica: existe algum participante do ecossistema (merchant, parceiro, investidor) que pagaria para acessar este ativo?*

**8. Singularidade**  
Quanto deste ativo é genuinamente proprietário? Existe em fontes alternativas? O dado que o ParaguAI tem é diferente do que qualquer outra fonte tem?  
*Pergunta diagnóstica: se o ParaguAI parasse de operar, onde este dado poderia ser obtido?*

### Sinais de alerta por dimensão

| Dimensão | Sinal de alerta |
|---|---|
| Cobertura | Abaixo de 50% do potencial identificado por dois períodos consecutivos |
| Qualidade | Taxa de anomalia subindo sem ação de mitigação |
| Profundidade Temporal | Lacunas de coleta maiores que 7 dias em ativos críticos |
| Taxa de Crescimento | Crescimento zero ou negativo por mais de 30 dias |
| Dependência de Rede | Crescimento de usuários não correlacionado com crescimento do ativo |
| Prontidão para Brain | Mudanças de schema que invalidam dados históricos |
| Potencial de Monetização | Não avaliado em pelo menos 12 meses |
| Singularidade | Competidor declarando ter dado equivalente |

---

# CAPÍTULO 7 — Asset Governance

**Regras permanentes para criação, evolução e proteção dos ativos.**

### Quem pode criar novos ativos

**Core Assets**: somente o CTO, com ADR formal que justifique o novo ativo, descreva o schema de dados, o mecanismo de crescimento e o Moat que sustenta.

**Supporting Assets**: CTO ou responsável designado, com justificativa documentada de como o ativo suporta um Core Asset existente.

**Future Assets**: podem ser identificados por qualquer membro da equipe, mas não recebem investimento de instrumentação até aprovação do CTO.

### Quando um ativo é oficialmente reconhecido

Um ativo avança de "identificado" para "oficial" quando:

1. O schema de dados está definido e implementado
2. A instrumentação está funcionando e produzindo dados
3. Pelo menos 30 dias de dados foram coletados sem interrupção
4. O Responsável do Ativo foi designado

### Quando um ativo deixa de existir

Um ativo pode ser descontinuado quando:

1. O dado que o compõe tornou-se irrecuperavelmente corrompido
2. O mercado que o contextualizava mudou estruturalmente e o ativo tornou-se irrelevante
3. O ativo foi absorvido por outro ativo mais abrangente (fusão de ativos, com ADR)

**Atenção**: descontinuação de Core Asset requer aprovação do CTO e ADR. Dados históricos nunca são destruídos — apenas arquivados. A memória do ativo permanece mesmo se o ativo deixa de crescer ativamente.

### Como um ativo muda de categoria

Mudança de Supporting para Core: quando o ativo satisfaz os três critérios (acumulação, permanência, diferenciação) de forma independente de outro ativo — não apenas como amplificador. Requer ADR.

Mudança de Future para Supporting ou Core: quando os pré-requisitos identificados são satisfeitos e a instrumentação é implementada. Requer ADR.

### Como os ativos são protegidos

**Integridade dos dados**: dados históricos são INSERT-only — nunca atualizados retroativamente. Toda correção de dado histórico exige ADR documentando o motivo e a natureza da correção.

**Acesso**: dados de ativos não são expostos publicamente via APIs sem design explícito de exposição. Acesso direto ao dado bruto é restrito a service roles específicas.

**Backup e redundância**: Core Assets têm política de backup definida. A perda de um Core Asset é tratada como incidente crítico.

**Schema evolution**: mudanças de schema em tabelas que armazenam Core Assets requerem ADR. Mudanças que invalidam dados históricos são proibidas — somente adições ou evoluções não-destrutivas são permitidas.

### Responsável do Ativo

Cada ativo reconhecido tem um Responsável designado pelo CTO. O Responsável é accountable por:

- Saúde do ativo (avaliação trimestral via Asset Health Framework)
- Integridade do schema
- Qualidade dos dados
- Documentação de mudanças

---

# CAPÍTULO 8 — Asset → Moat

**Matriz oficial de relacionamento entre ativos e Moats.**

Os oito Moats identificados no MOAT_STRATEGY são sustentados pelos ativos catalogados neste documento. A matriz abaixo estabelece explicitamente qual ativo sustenta qual Moat e qual Moat depende de qual ativo.

| Ativo | M1 Hist. Data | M2 Trust Network | M3 OS Switching | M4 Cross-Border | M5 Search Intel | M6 Data Flywheel | M7 Brain | M8 Import Intel |
|---|---|---|---|---|---|---|---|---|
| C-1 Historical Price Data | **Primário** | Suporte | — | Suporte | Suporte | **Primário** | Insumo | — |
| C-2 Merchant Trust Score | Suporte | **Primário** | **Primário** | — | Suporte | Suporte | Insumo | — |
| C-3 Normalized Catalog | Habilita | Habilita | Habilita | Habilita | Habilita | Habilita | Insumo | Habilita |
| C-4 Search Intelligence | — | — | — | Suporte | **Primário** | **Primário** | Insumo | — |
| C-5 Cross-Border Context | Suporte | — | — | **Primário** | Suporte | Suporte | Insumo | — |
| C-6 Buyer Behavioral | — | Suporte | — | Suporte | Suporte | **Primário** | Insumo | — |
| S-1 Merchant Network | — | Suporte | **Primário** | — | — | Suporte | — | Suporte |
| S-2 Data Quality Layer | Protege | Protege | — | Protege | Protege | Protege | Protege | Protege |
| S-3 Connector Knowledge | — | — | — | — | — | — | — | **Primário** |
| S-4 Review Data | — | Suporte | Suporte | — | — | — | Insumo | — |

**Legenda**:
- **Primário**: este ativo é o principal sustentador deste Moat
- Suporte: este ativo contribui significativamente para este Moat
- Habilita: este ativo é pré-requisito estrutural deste Moat (sem ele o Moat não existe)
- Insumo: este ativo alimenta o Moat indiretamente via Brain
- Protege: este ativo garante a qualidade dos ativos que sustentam este Moat
- —: sem relação direta

### Leitura inversa — quais ativos cada Moat depende

| Moat | Ativos Primários | Ativos de Suporte |
|---|---|---|
| M1 Historical Data | C-1, C-3 | C-5, C-4, S-2 |
| M2 Trust Network | C-2, C-3 | S-4, C-6, S-2 |
| M3 OS Switching Cost | C-2, S-1, C-3 | S-4 |
| M4 Cross-Border Context | C-5, C-3 | C-1, C-4 |
| M5 Search Intelligence | C-4, C-3 | C-1, C-5, C-2 |
| M6 Data Flywheel | C-1, C-4, C-6 | S-1, C-2 |
| M7 Brain | Todos os Core Assets | S-4, S-2 |
| M8 Import Intelligence | S-3, C-1, C-3 | S-1 |

---

# CAPÍTULO 9 — Asset → ParaguAI Brain

**Quais ativos alimentam o Brain, quais o Brain produz e quais dependem dele.**

### O que o Brain consome

O Brain é alimentado pelos Core Assets — cada um contribui com um tipo diferente de conhecimento:

**Historical Price Data [C-1]** → fornece o corpus temporal para modelos de predição de preço, detecção de anomalia e análise de sazonalidade. Sem dados históricos, o Brain não pode predizer — só pode descrever o presente.

**Merchant Trust Score [C-2]** → fornece calibração de confiabilidade. O Brain aprende a ponderar dados de merchants com histórico de alta qualidade mais do que dados de merchants com histórico inconsistente.

**Normalized Catalog [C-3]** → fornece a taxonomia que torna os dados dos outros ativos coerentes. Sem catálogo normalizado, o Brain vê produtos distintos onde existem apenas denominações distintas do mesmo produto.

**Search Intelligence [C-4]** → fornece o mapa de intenção: o que compradores querem, quando, em que frequência. É o insumo mais direto para sistemas de recomendação e personalização.

**Cross-Border Context Model [C-5]** → fornece o contexto que torna o Brain relevante para este mercado específico — não apenas um modelo genérico aplicado a um contexto local.

**Buyer Behavioral Knowledge [C-6]** → fornece o sinal de resultado: o que compradores fazem depois de cada interação. É o feedback que permite ao Brain aprender se suas inferências estão corretas.

**Review & Reputation Data [S-4]** → fornece sinais qualitativos: o que compradores pensam sobre lojas em linguagem natural. Habilita análise de sentimento e detecção de padrões de insatisfação.

### O que o Brain produz como novos ativos

O Brain não apenas consome ativos — produz ativos novos que não poderiam existir sem ele:

**Recommendation Model Knowledge [F-1]**: o conhecimento de quais recomendações funcionam para quais perfis de comprador neste mercado. Só pode existir depois que o Brain aprende com suficientes ciclos de recomendação → feedback.

**Semantic Knowledge [F-3]**: a compreensão semântica de produtos neste mercado específico — sinônimos, substitutos, contexto de uso. Emerge dos padrões de busca e comportamento, não de regras manuais.

**Marketplace Liquidity Model [F-4]**: a modelagem de oferta e demanda por categoria, inferida da relação entre volume de busca, volume de oferta e variações de preço ao longo do tempo.

### Quais ativos dependem do Brain para amadurecer

**Tourism Intelligence [F-2]**: sem o Brain para inferir perfil turístico a partir de comportamento (não de dados declarados), a Tourism Intelligence permanece no Estágio de Coleta sem atingir Aprendizado.

**Recommendation Model Knowledge [F-1]**: não existe sem o Brain — é um ativo produzido pelo Brain, não um ativo que alimenta o Brain.

**Semantic Knowledge [F-3]**: a escala necessária para inferência semântica confiável requer o Brain como intermediário entre os dados brutos de busca e o conhecimento semântico estruturado.

---

# CAPÍTULO 10 — Asset → Valuation

**A lógica estratégica pela qual ativos aumentam o valor da empresa.**

### Por que investidores valorizam ativos estratégicos

O valor de uma empresa não é a soma de suas receitas nem a qualidade de seu produto em um dado momento. O valor de uma empresa é a expectativa de seu poder de gerar valor futuro — e ativos estratégicos são o que torna esse poder defensável ao longo do tempo.

Uma empresa com uma lista de funcionalidades vale o que sua equipe pode construir. Uma empresa com ativos estratégicos maduros vale o que nenhuma outra equipe pode reproduzir rapidamente — independentemente de tamanho ou capital.

A diferença de valuation entre as duas empresas não é linear. É a diferença entre um ativo que pode ser substituído e um ativo que não pode.

### Como ativos aumentam Enterprise Value

**Reduzindo a taxa de desconto do futuro**: quanto mais defensável o negócio, menor o risco percebido por investidores e maior o valor presente de fluxos futuros. Ativos estratégicos reduzem o risco de substituição.

**Aumentando o poder de precificação**: uma empresa com ativos únicos pode precificar seus produtos com base no valor que entrega — não com base na competição de preços. O Merchant Trust Score, por exemplo, permite cobrar mais por visibilidade na plataforma porque a visibilidade tem credibilidade que não existe em nenhuma alternativa.

**Criando receita recorrente natural**: merchants com alto custo de saída (Merchant OS Switching Cost) têm menor churn. Menor churn significa receita mais previsível. Receita mais previsível tem valuation múltiplo maior.

**Habilitando novos modelos de monetização**: dados acumulados (Historical Price Data, Search Intelligence) habilitam produtos de inteligência de mercado que não existem sem os ativos — criando linhas de receita que competidores sem esses ativos não podem oferecer.

### Como ativos reduzem vulnerabilidade competitiva

**Reduzindo a sensibilidade a ciclos de produto**: uma empresa sem ativos é vulnerável quando concorrentes lançam produtos melhores. Uma empresa com ativos maduros pode perder temporariamente em funcionalidade e recuperar — porque os ativos continuam acumulando durante o período de catch-up.

**Criando assimetria de custo de entrada**: um concorrente que tenta replicar os ativos do ParaguAI não precisa apenas contratar engenheiros — precisa de anos de operação. Isso cria assimetria radical: o custo de entrada de um concorrente inclui o custo do tempo que já passou.

**Transformando usuários em guardiões dos ativos**: merchants com histórico de score e reputação na plataforma têm interesse ativo em que a plataforma continue existindo — porque seu próprio ativo (a reputação verificada) só existe dentro do ecossistema. Isso cria uma base de usuários com interesse alinhado com a durabilidade da empresa.

---

# CAPÍTULO 11 — Anti-Patterns

### Anti-Pattern 1 — Criar funcionalidades sem ativo resultante

Uma funcionalidade que não produz nenhum dado persistente e reutilizável não cria ativo. Código sem dado é despesa de desenvolvimento — não investimento em patrimônio.

**Como identificar**: pergunte "se esta funcionalidade fosse removida amanhã, que ativo permaneceria?" Se a resposta for "nada", a funcionalidade não contribuiu para o patrimônio estratégico.

### Anti-Pattern 2 — Criar ativo sem uso

Coletar dados que nunca são consultados, analisados ou usados em decisões é armazenar ruído. Um ativo que não produz inteligência não está no Estágio 4 do Lifecycle — está parado no Estágio 3 indefinidamente.

**Como identificar**: nenhuma decisão de produto, operação ou estratégia dos últimos 90 dias foi informada por este ativo.

### Anti-Pattern 3 — Duplicar ativos sem fusão

Dois sistemas coletando dados equivalentes de formas diferentes produzem dois ativos fragmentados, cada um com metade da cobertura. A fragmentação é o inimigo da profundidade.

**Como identificar**: dois times coletando dados do mesmo fenômeno com schemas diferentes, sem plano de reconciliação.

### Anti-Pattern 4 — Não reutilizar conhecimento acumulado

Cada problema já resolvido produziu conhecimento. Resolver o mesmo tipo de problema do zero — sem consultar o que o Data Quality Layer (S-2) ou o Operational Knowledge (S-5) aprendeu — desperdiça o ativo de conhecimento acumulado.

### Anti-Pattern 5 — Não proteger dados históricos

Deletar, sobrescrever ou corromper dados históricos é destruir o Core Asset mais valioso do ParaguAI. Um dia de dados perdidos não pode ser recuperado — o passado não volta.

**Regra inviolável**: dados de Core Assets são INSERT-only. Correções são novas entradas — não substituições.

### Anti-Pattern 6 — Não medir ativos

Um ativo que não é avaliado pelo Asset Health Framework pode estar se degradando silenciosamente — com qualidade caindo, cobertura estagnando ou singularidade diminuindo. O que não é medido não é gerenciado.

### Anti-Pattern 7 — Destruir histórico por conveniência técnica

Migrações de banco de dados, refatorações de schema ou mudanças de arquitetura que destroem dados históricos para simplificar a implementação trocam patrimônio permanente por conveniência temporária. Esse trade-off quase nunca é justificável para Core Assets.

### Anti-Pattern 8 — Ignorar qualidade em favor de volume

Um million de registros de preços incorretos é pior que dez mil registros precisos. Volume de dados de baixa qualidade cria falsa confiança no ativo e pode corromper as decisões do Brain quando este for ativado.

**Regra**: qualidade antes de volume, sempre.

### Anti-Pattern 9 — Confundir feature com asset

Uma funcionalidade muito usada não é automaticamente um ativo estratégico. Uma interface popular que não produz dados acumuláveis é apenas uma boa feature — valiosa para retenção, mas não para o patrimônio de longo prazo.

**Teste**: remova a feature mentalmente. O ativo diminui? Se não, a feature não é o que cria o ativo — é apenas a interface para ele.

### Anti-Pattern 10 — Fragmentar ativos por estrutura organizacional

Times distintos coletando dados relacionados em silos separados criam fragmentação que impede o Flywheel de acelerar. O Cross-Border Context Model (C-5) não pode emergir se os dados de câmbio estão em um time, os dados de busca em outro e os dados de comportamento em um terceiro, sem integração.

---

# CAPÍTULO 12 — O Compromisso Permanente

---

**O ParaguAI mede seu progresso pelo crescimento de seus ativos estratégicos.**

**Funcionalidades são transitórias.**

**Ativos são permanentes.**

**Cada Release deve fortalecer ativos.**

**Cada ativo deve fortalecer Moats.**

**Cada Moat deve fortalecer o valor da empresa.**

---

Este não é um compromisso de produto. É um compromisso com o que o ParaguAI realmente é: uma empresa que acumula inteligência, confiança e conhecimento sobre o mercado que serve.

Funcionalidades são o meio pelo qual os ativos crescem. Não são o fim. Quando uma funcionalidade é avaliada, a pergunta não é "quantos usuários usam isso?" — é "que ativo isso fortalece e como esse ativo ficará mais difícil de copiar daqui a cinco anos?"

O código envelhece. Os ativos amadurecem. A cada ano de operação, os ativos do ParaguAI ficam mais profundos, mais precisos e mais impossíveis de reproduzir do zero. Esse é o único tipo de vantagem que resiste ao tempo — e o único tipo de vantagem que o ParaguAI busca construir.

---

# Integração com Foundation e Product Operating System

| Documento | Relação com o STRATEGIC_ASSETS |
|---|---|
| `AI_CONSTITUTION.md` | Identifica os ativos estratégicos originais da empresa. O STRATEGIC_ASSETS os formaliza, classifica e define como governá-los. |
| `NORTH_STAR.md` | O North Star Metric — decisões melhores tornadas possíveis — é o resultado final dos ativos maduros. Historical Price Data, Search Intelligence e Merchant Trust Score são os ativos que mais diretamente habilitam decisões melhores. |
| `BUSINESS_MODEL.md` | Os network effects descritos no Business Model são os mecanismos pelos quais o Data Flywheel Moat cresce. Os ativos S-1 (Merchant Network) e C-6 (Buyer Behavioral Knowledge) são os elementos que produzem esses efeitos. |
| `MOAT_STRATEGY.md` | Os Moats são o resultado de múltiplos ativos maduros atuando em conjunto. O Capítulo 8 deste documento (Asset → Moat) é a ponte explícita entre os dois sistemas. |
| `RELEASE_PLAYBOOK.md` | O Asset First Development (AFD) do Playbook é a aplicação operacional deste documento. A pergunta "qual ativo fortalece?" que todo Release deve responder usa o catálogo oficial definido aqui. |
| `ENGINEERING_PRINCIPLES.md` | Os princípios de Evolutionary Architecture e Observability como Requisito são os princípios técnicos que garantem que os ativos continuem sendo coletados e estruturados corretamente ao longo do tempo. |

---

# Quality Gate Final

✅ **Definição clara de ativo estratégico** — hierarquia Feature → Capability → Asset → Moat → Enterprise Value com critérios objetivos  
✅ **Catálogo oficial** — 6 Core Assets, 5 Supporting Assets, 4 Future Assets com justificativa crítica de classificação  
✅ **Asset Graph** — grafo textual completo mostrando todas as relações de alimentação entre ativos e retroalimentação do Brain  
✅ **Asset Lifecycle** — 6 estágios com critérios de transição explícitos  
✅ **Asset Flywheel** — mecanismo de auto-amplificação com explicação de como cada ativo acelera o próximo  
✅ **Asset Health Framework** — 8 dimensões com perguntas diagnósticas e sinais de alerta  
✅ **Asset Governance** — regras para criação, reconhecimento, descontinuação, proteção e responsabilidade  
✅ **Matriz Asset → Moat** — relação explícita de cada ativo com cada Moat, incluindo leitura inversa  
✅ **Asset → Brain** — o que o Brain consome, o que produz, o que depende dele  
✅ **Asset → Valuation** — lógica estratégica de como ativos aumentam Enterprise Value  
✅ **Válido por décadas** — nenhuma tecnologia, versão ou funcionalidade específica citada  

---

*Este documento é permanente. Define o patrimônio estratégico do ParaguAI — o que a empresa realmente possui, como esse patrimônio cresce e como é protegido. Qualquer alteração requer aprovação explícita do CTO e um ADR justificando a mudança.*
