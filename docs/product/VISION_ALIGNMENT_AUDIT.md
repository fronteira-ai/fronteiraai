# VISION_ALIGNMENT_AUDIT.md
# PROGRAM Ω — Mission Ω-1 — Vision 2035 Audit

**Categoria**: `docs/product/` (mesma família de `MOAT_STRATEGY.md`/`MARKETPLACE_STRATEGY.md`/`STRATEGIC_ASSETS.md`/`MARKETPLACE_VISION.md` — nenhuma categoria nova `docs/strategy/` criada; ver nota de governança ao final deste documento)
**Data**: 2026-07-08
**Auditor**: CTO / Claude Sonnet 5 (Principal Software Architect, Chief Systems Engineer, Product Architect, Enterprise Architect, Chief Strategy Officer)
**Natureza**: Auditoria estratégica, não técnica. Nenhum código, componente, API, migration ou refactor foi ou será alterado por esta missão.
**Leitura obrigatória realizada**: `AI_CONSTITUTION.md` v1.2, `NORTH_STAR.md` v1.1, `BUSINESS_MODEL.md` v1.0, `VISION_2035.md` v1.0, `docs/operations/PRODUCTION_BASELINE_1.9.md`, `docs/product/ROADMAP_2_0.md`, `docs/design/DESIGN_CONSTITUTION.md` v1.3, todas as 55 ADRs de `docs/operations/DECISIONS.md`.

---

## Pergunta central

> **O ParaguAI construído hoje ainda é exatamente o ParaguAI descrito no VISION_2035?**

Resposta curta, desenvolvida ao longo deste documento: **sim quanto a processo e princípio, ainda não quanto a resultado real.** Toda decisão registrada em `DECISIONS.md` segue a disciplina que a Constituição exige (fundação antes de velocidade, ativos não features, ADR por decisão estrutural, Quality Gate antes de declarar concluído). Mas o critério que a própria Visão usa para se medir — `NORTH_STAR.md` §2, "o número de decisões melhores que o ParaguAI tornou possíveis" — não é hoje observável em volume real, porque os dois substratos de que toda decisão melhor depende (cobertura real de catálogo, lojistas reais usando a plataforma) permanecem finos. Ver `VISION_SCORECARD.md` para a quantificação.

---

## Como esta auditoria foi conduzida

Estratégica, não técnica: cada domínio é avaliado pela pergunta "isso já produz o resultado que `VISION_2035.md` descreve para um participante real (comprador, lojista, turista, parceiro, pesquisador)?" — não pela pergunta "isso está bem arquitetado?" (`PRODUCTION_BASELINE_1.9.md`, RC-10, já respondeu essa segunda pergunta: sim, Quality Gate 100% verde). Os dois documentos são complementares e não devem ser confundidos: um mede engenharia, este mede realização de visão.

---

## DOMÍNIO 1 — Commerce

**O que a Visão pede** (§2–4, Estágio 1–2 da escada): catálogo estruturado amplo o suficiente para que "qualquer busca encontre resultado" (`BUSINESS_MODEL.md` §4), com reputação verificável — o fim da desvantagem do comprador individual (`VISION_2035.md` §13).

**O que existe**: Canonical Catalog (identidade permanente de produto, Product Identity em Shadow Mode), Connector Platform V2 (SDK, Certification Framework, Delta Import operacional), 5 merchants com dado real (Shopping China, Mega Eletrônicos, Roma Shopping, Atacado Connect, mais descoberta via sitemap/robots), busca básica sem preço no resultado (gap nomeado desde a Sprint 3.3, nunca fechado), ranking compute-on-read (`MerchantPriorityService`).

**Gap real**: a Constituição (`AI_CONSTITUTION.md` §X) é explícita — *"1. Cobertura de catálogo é mais urgente do que profundidade de feature"* e *"4. Densidade local precede expansão geográfica."* Ciudad del Este é descrita em `BUSINESS_MODEL.md` §1 como "o maior polo de comércio informal da América do Sul", com "milhões de clientes por ano" atendidos por lojistas paraguaios. A cobertura real hoje — meia dúzia de merchants certificados, catálogo na casa de milhares de produtos, Canonical Match rate "honesto e baixo" (auto-documentado em `TECH_DEBT.md`) — é uma fração não mensurável desse mercado. 4 merchants Tier 1 adicionais estão bloqueados comercialmente (rota correta, `docs/business/`), mas isso não resolve a lacuna de densidade no curto prazo.

**Nota estratégica**: **Regular** — mecanismo correto, escala incorreta. O comprador de hoje ainda não tem, na prática, "as mesmas informações que um importador experiente" (`VISION_2035.md` §13) para a maioria das categorias/lojas da fronteira, porque a maioria das lojas da fronteira simplesmente não está no catálogo.

---

## DOMÍNIO 2 — Tourism

**O que a Visão pede** (§8, Estágio 4): planejamento de viagem, roteiros, hospedagem, mobilidade, câmbio integrado — a "experiência única" de compra+turismo (`BUSINESS_MODEL.md` §12).

**O que existe**: nenhum código relacionado a hotel, hospedagem, mobilidade ou roteiro foi encontrado em `src/domains`, `app`, `lib` ou `components` (busca exaustiva, zero resultado). O único proto-elemento é o card "Câmbio ao Vivo" da Home (Exchange Intelligence, sem chave de API provisionada — hoje vazio em produção).

**Gap real**: nenhum — e isso é o ponto. A própria Visão (`VISION_2035.md` §3) posiciona Turismo como Estágio 4, depois de Comércio e Ecossistema de Confiança amadurecerem. `AI_CONSTITUTION.md` §X reforça a mesma ordem. Turismo estar em 0% neste momento **não é um desvio** — é sequenciamento correto, desde que os Estágios 1–2 (Commerce/Community) não estejam eles próprios estagnados. Ver Domínio 1: como estão finos, o adiamento de Turismo continua correto, mas o "quando" começar depende de resolver a cobertura primeiro, não de uma data.

**Nota estratégica**: **Não iniciado, apropriadamente.**

---

## DOMÍNIO 3 — Merchant OS

**O que a Visão pede** (§7, Estágio 3): "parceiro de negócio que opera em segundo plano" — não uma ferramenta que o lojista visita, uma que trabalha para ele.

**O que existe**: o domínio mais profundamente construído de toda a plataforma — Command Center, Analytics Platform (`buyer_events` append-only), Decision Engine (11 regras declarativas), Catalog Intelligence (scoring 0–100), Growth Engine (10 estratégias, Priority Engine), tudo do Release 1.6, mais o painel completo de onboarding/claim/dashboard do Release 1.2–1.4. Testes extensos, arquitetura DDD consistente.

**Gap real, o mais severo desta auditoria**: **zero lojas reivindicadas em produção hoje** (`merchant_stores` vazio, confirmado e reconfirmado em três Releases consecutivas — Program 0 Wave 0, Program A Wave 1, `PRODUCTION_BASELINE_1.9.md` §8). Isso significa que toda essa profundidade de engenharia nunca foi validada contra um lojista real tomando uma decisão real. O `NORTH_STAR.md` §2 é explícito: *"não é número de lojas cadastradas — lojas sem compradores melhor informados são presença sem impacto"* — e o inverso também é verdadeiro e não dito explicitamente ali, mas decorre do mesmo princípio: **Merchant OS sem lojistas reais é capacidade sem impacto.** `TECH_DEBT.md` já nomeia, sem resolver, uma duplicação real entre `decision-center/widgets` e `growth-center/widgets` — sintoma de profundidade construída mais rápido do que validada.

**Nota estratégica**: **Invertido** — maturidade de código (alta) e maturidade de resultado real (zero) estão desalinhadas na direção mais perigosa possível: mais capacidade construída não gera mais valor até o funil de aquisição converter.

---

## DOMÍNIO 4 — Regional Intelligence

**O que a Visão pede** (§10, Estágio 5): inteligência agregada — sazonalidade, tendência de categoria, comportamento de comprador — "que não existe em nenhuma outra fonte."

**O que existe**: Market Intelligence Engine (`src/domains/market-insights/`) — mediana/dispersão de preço, savings per-produto-canônico, rollup de volatilidade, Market Pulse canônico. Construído com disciplina real (auditoria prévia encontrou e evitou 4 sobreposições antes de escrever código).

**Gap real**: o próprio domínio se auto-documenta honestamente — *"o valor real desta camada é proporcional à cobertura de Canonical Match, hoje baixa."* Regional Intelligence é matematicamente correto e estrategicamente prematuro ao mesmo tempo: a fórmula está pronta, o insumo (Domínio 1) ainda não tem volume para produzir um resultado que um jornalista, órgão de turismo ou importador (`BUSINESS_MODEL.md` §3) reconheceria como autoridade de mercado.

**Nota estratégica**: **Semente correta, prematura de escala** — consistente com o sequenciamento, mas seu teto de valor é definido pelo Domínio 1.

---

## DOMÍNIO 5 — ParaguAI Brain

**O que a Visão pede** (`VISION_2035.md` §5, `AI_CONSTITUTION.md` §IX): o "sistema nervoso central" que responde perguntas que hoje não têm resposta — para comprador, lojista e região.

**O que existe**: `CognitiveBrainService`/`KnowledgeGraphService` desde o Release 1.5, uma taxonomia de dezenas de `TrustEventType`, uma única rota pública (`GET /api/trust/merchant/[merchantId]/graph`) exposta desde o Program 0 Wave 0. 21 `TrustEventType` (Release 1.6/1.8) sem sequer entrada de impacto documentada (`TRUST_EVENT_BRAIN_IMPACT`).

**Gap real**: o Brain hoje é infraestrutura de logging, não inteligência de produto. Nenhuma das perguntas-exemplo que `AI_CONSTITUTION.md` §IX lista textualmente como o critério de sucesso do Brain ("qual é o melhor momento para comprar", "esta loja infla preço antes de feriados") tem um caminho de código que a responda hoje. Isso é esperado em parte — o Brain "não terá uma data de lançamento" (§IX) — mas um ano+ de tempo de projeto depois do Release 1.5 sem um único consumidor de produto é mais lento do que o resto da plataforma sugere que deveria ser.

**Nota estratégica**: **Plumbing sem cérebro** — o nome é aspiracional hoje; funcionalmente é um logger de eventos bem desenhado.

---

## DOMÍNIO 6 — Community

**O que a Visão pede** (§4, "tecido social"; Estágio 2): reviews verificadas, confiança construída por interação real, "ativo que nenhuma plataforma nova pode replicar rapidamente."

**O que existe**: Trust Platform completo (Release 1.5) — signals, reviews, verificação, timeline, merchant profile, 6 tabelas.

**Gap real**: mesmo substrato do Domínio 3 — a infraestrutura de confiança existe, mas com zero lojas reivindicadas, a maior parte do loop de confiança (loja verificada ↔ review real ↔ comprador decide melhor) não tem participantes reais fechando o ciclo. `BUSINESS_MODEL.md` §8 chama isso de moat ("confiança construída ao longo do tempo... não pode ser comprada"), mas um moat que ainda não começou a acumular tempo real de uso não é, ainda, um moat — é uma fundação para um.

**Nota estratégica**: **Infraestrutura real, conteúdo vazio** — mesmo padrão do Domínio 3, é o mesmo problema de fundo (Domínio 1) se manifestando de novo.

---

## DOMÍNIO 7 — Open Platform

**O que a Visão pede** (§9, Estágio 6): API pública, SDK, ecossistema de parceiros construindo sobre a infraestrutura do ParaguAI.

**O que existe**: `docs/architecture/API_CONTRACTS.md` documenta contratos internos (services↔rotas), não uma superfície pública para terceiros. Nenhuma documentação de API voltada a desenvolvedor externo, nenhuma chave de API para parceiro, nenhum SDK publicado. Busca exaustiva por qualquer traço de "developer platform"/"partner SDK" não encontrou nada além do Merchant Partnership Program (`docs/business/`) — que é comercial (feeds de dado de merchants), não um ecossistema de desenvolvedores.

**Gap real**: nenhum crítico — mesma lógica do Domínio 2, Estágio 6 é o último da escada e `BUSINESS_MODEL.md` §14 já o descreve como consequência de tudo que vem antes. A única observação: `BUSINESS_MODEL.md` §9 já lista API como um "Ativo Estratégico" presente-tempo, o que é uma pequena inconsistência de expectativa a corrigir na próxima revisão desse documento (é aspiracional, deveria estar marcado como tal).

**Nota estratégica**: **Não iniciado, apropriadamente.**

---

## DOMÍNIO 8 — Infrastructure

**O que a Visão/Constituição pedem**: fundação técnica que sustente escala, sem ser o objetivo em si (`NORTH_STAR.md` §5 — Tecnologia é o nível mais baixo da hierarquia, "substituível, intercambiável, temporária").

**O que existe**: 14 domínios DDD, GitHub/Vercel/Supabase operacionais, domínio oficial servindo o deployment correto (verificado byte-a-byte, RC-9), Quality Gate 100% verde (lint/typecheck/524 testes/build, reverificado em RC-10), Design Constitution congelada e auditável. CI/CD parcialmente dormant (secrets não configurados — pendência de configuração, não de arquitetura), Supabase é ambiente único sem staging.

**Gap real**: pequeno e nomeado — nenhuma surpresa nesta auditoria que já não estivesse em `PRODUCTION_BASELINE_1.9.md` §9–10.

**Nota estratégica**: **Sólido** — o único domínio cuja maturidade real está proporcional à sua maturidade de código, porque infraestrutura não depende de adoção de terceiros para "funcionar."

---

## Fase 4 — Desvios reais (não hipotéticos, não melhorias inventadas)

1. **Inversão de prioridade constitucional**: `AI_CONSTITUTION.md` §X ordena cobertura de catálogo acima de profundidade de feature. A prática registrada em `CHANGELOG.md`/`DECISIONS.md` do Release 1.6–1.8 mostra o oposto na alocação de esforço: cinco Epics de Merchant OS (Command Center, Analytics, Decision Engine, Catalog Intelligence, Growth Engine) construídos em profundidade antes de qualquer Wave dedicada a simplesmente aumentar o número de lojas reais no catálogo. Esse é um desvio real, citável, não uma opinião.
2. **North Star não instrumentado**: `NORTH_STAR.md` §2 define um vetor de 5 métricas de resultado (buscas com resultado relevante, compras assistidas, alertas com ação, lojistas que ajustaram catálogo por dado, retorno de usuário). Busca exaustiva no código não encontrou nenhum serviço que calcule ou reporte esse vetor — toda métrica reportada em `PROJECT_STATUS.md`/`PRODUCTION_BASELINE_1.9.md` até hoje é de output de engenharia (testes passando, migrations aplicadas, rotas construídas), nunca de resultado (`NORTH_STAR.md` §2 nomeia essa distinção explicitamente: "toda métrica técnica é insumo, nenhuma é o objetivo"). Isso é um desvio de instrumentação, não de arquitetura — o dado para calcular o vetor em grande parte já existe (`buyer_events`), só não é agregado com essa lente.
3. **Ativos construídos sem usuário validando-os**: `NORTH_STAR.md` §7 nomeia "Funcionalidades sem usuário identificado" como categoria que nunca deve ser prioridade. Merchant OS tem usuário identificado no papel (o lojista), mas zero usuário real validando qualquer uma das decisões de design tomadas em 5 Epics — o risco não é teórico, é a pergunta em aberto "os lojistas reais vão usar isso do jeito que foi desenhado?", ainda sem resposta.

Nenhum outro desvio material foi encontrado — o restante da plataforma (Infrastructure, Design freeze, governança de ADR, sequenciamento de Tourism/Open Platform) está alinhado com o que a Foundation prescreve.

---

## Nota de governança

O mandato desta missão pediu `docs/strategy/VISION_ALIGNMENT_AUDIT.md`. Seguindo o mesmo precedente que você aprovou há minutos em ADR-055 ("Usar categorias existentes"), este e os outros 3 documentos desta missão foram colocados em `docs/product/` — categoria que já hospeda `MOAT_STRATEGY.md`, `MARKETPLACE_STRATEGY.md`, `STRATEGIC_ASSETS.md` e `MARKETPLACE_VISION.md`, precedente direto para conteúdo de natureza estratégica. Nenhuma categoria nova foi criada; nenhuma nova ADR de governança documental foi necessária para esta decisão específica, por ser aplicação direta do precedente já registrado.
