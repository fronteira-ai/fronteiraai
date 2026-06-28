# ParaguAI — Knowledge System v1.0

Este é o sistema de conhecimento oficial do ParaguAI. Tudo o que você precisa para entender, contribuir e evoluir a plataforma está organizado aqui.

**Não sabe por onde começar?** Leia `foundation/FOUNDATION_INDEX.md` — o mapa completo de todo o conhecimento do projeto.

---

## Visão Geral

O ParaguAI é uma plataforma de comparação de preços e inteligência operacional para a Tríplice Fronteira. A documentação está organizada em 8 categorias que refletem as diferentes dimensões do projeto.

---

## Estrutura da Documentação

```
docs/
├── foundation/       Princípios permanentes — quem somos, como decidimos, para onde vamos
│   ├── README.md
│   ├── AI_CONSTITUTION.md      v1.2 — Quem somos
│   ├── NORTH_STAR.md           v1.1 — Como decidimos
│   ├── BUSINESS_MODEL.md       v1.0 — Como criamos valor
│   ├── VISION_2035.md          v1.0 — Para onde vamos
│   ├── ENGINEERING_PRINCIPLES.md v1.0 — Como construímos tecnologia
│   ├── PRODUCT_PRINCIPLES.md   v1.0 — Como construímos produtos
│   ├── DECISION_FILTER.md      v1.0 — Como aprovamos decisões
│   ├── RELEASE_STRATEGY.md     v1.0 — Como evoluímos
│   └── FOUNDATION_INDEX.md     v1.0 — Mapa oficial do conhecimento
│
├── architecture/     Estrutura técnica real — como o projeto está organizado hoje
│   ├── README.md
│   ├── ARCHITECTURE.md         Estrutura de pastas, camadas, padrões, rotas
│   ├── DOMAIN_MODEL.md         Entidades, schema do banco, relacionamentos
│   ├── COMPONENT_INDEX.md      Inventário de todos os componentes
│   ├── API_CONTRACTS.md        Contratos de todos os services
│   └── DEPENDENCY_GRAPH.md     Grafo de imports entre camadas
│
├── engineering/      Como desenvolvemos — convenções, terminologia, guias técnicos
│   ├── README.md
│   ├── CONVENTIONS.md          Convenções de nomenclatura e estilo
│   ├── GLOSSARY.md             Terminologia oficial do projeto
│   ├── TECH_DEBT.md            Dívida técnica identificada e seu status
│   ├── ACQUISITION.md          Documentação do Acquisition Engine
│   ├── CONNECTOR_GUIDE.md      Como criar novos Connectors
│   └── AGENTS.md               Avisos críticos para agentes IA
│
├── product/          O que o produto faz e para onde vai
│   ├── README.md
│   ├── FEATURES.md             Inventário de funcionalidades por estado real
│   └── MASTER_ROADMAP.md       Roadmap estratégico de 4 Fases
│
├── operations/       Evolução do projeto — estado atual, história, decisões
│   ├── README.md
│   ├── PROJECT_STATUS.md       Fotografia do presente
│   ├── CHANGELOG.md            História completa de cada Release
│   ├── NEXT_STEPS.md           Próximos passos imediatos
│   └── DECISIONS.md            ADR-001 a ADR-039+ (decisões arquiteturais)
│
├── database/         Documentação do banco de dados
│   ├── README.md
│   ├── DATABASE.md             Schema completo — tabelas, colunas, constraints
│   └── ERD.md                  Diagrama Entidade-Relacionamento
│
├── adr/              Futura home de ADRs individuais (atualmente em operations/DECISIONS.md)
│   └── README.md
│
└── archive/          Documentos obsoletos preservados por contexto histórico
    ├── README.md
    └── [documentos arquivados]
```

---

## Fluxo Recomendado de Leitura

### Para qualquer tarefa (mínimo)

```
foundation/FOUNDATION_INDEX.md → identifica quais docs abrir para a tarefa específica
```

### Para onboarding completo (~2 horas)

```
1. foundation/FOUNDATION_INDEX.md    (10 min) — entender o mapa
2. foundation/AI_CONSTITUTION.md     (30 min) — entender quem somos
3. foundation/NORTH_STAR.md          (20 min) — entender como decidimos
4. architecture/ARCHITECTURE.md      (20 min) — entender a estrutura técnica
5. architecture/DOMAIN_MODEL.md      (15 min) — entender as entidades
6. engineering/CONVENTIONS.md        (15 min) — entender como escrever código
7. engineering/GLOSSARY.md           (10 min) — entender os termos oficiais
8. operations/PROJECT_STATUS.md      (10 min) — entender o estado atual
```

### Para uma decisão estratégica (Foundation completa)

```
AI_CONSTITUTION → NORTH_STAR → BUSINESS_MODEL → VISION_2035
→ ENGINEERING_PRINCIPLES → PRODUCT_PRINCIPLES → DECISION_FILTER → RELEASE_STRATEGY
```

---

## O Que Cada Categoria Responde

| Categoria | Responde | Quando consultar |
|---|---|---|
| `foundation/` | Quem somos, por que existimos, como pensamos | Antes de qualquer decisão significativa |
| `architecture/` | Como o projeto está organizado hoje | Antes de adicionar código, rotas ou componentes |
| `engineering/` | Como escrevemos código, qual o termo oficial | Antes de criar qualquer arquivo ou função |
| `product/` | O que o produto faz e para onde vai | Antes de propor ou discutir funcionalidades |
| `operations/` | O que aconteceu e o que acontece agora | Para entender contexto ou registrar decisões |
| `database/` | Como o banco está modelado | Antes de criar ou alterar qualquer tabela |
| `adr/` | Onde ficarão os ADRs individuais no futuro | N/A por enquanto — ver `operations/DECISIONS.md` |
| `archive/` | O que existia antes | Para contexto histórico apenas |

---

## Para Novos Colaboradores

### Humanos

Leia `foundation/FOUNDATION_INDEX.md` — Seção XIII (Checklist de Onboarding).

### Agentes de IA

Leia `foundation/FOUNDATION_INDEX.md` — Seção VII (Fluxo para IA).

Regras críticas antes de qualquer ação:
- **Schema de banco não muda sem aprovação explícita**
- **`SUPABASE_SERVICE_ROLE_KEY` nunca vai para Client Components**
- **Preço pertence à oferta, nunca ao produto**
- **Dados de produção não são alterados sem dry-run anterior**
- **Documentação desatualizada é pior que ausente** — atualizar sempre

---

## Regras do Knowledge System

Estas regras são permanentes — valem para toda contribuição futura:

1. **Nenhum documento novo pode ser criado diretamente na raiz de `docs/`.** Todo documento deve pertencer a uma das 8 categorias oficiais.
2. **`foundation/` é um conjunto fechado.** Novos documentos aqui requerem aprovação explícita do CTO e representam expansão do núcleo filosófico da empresa.
3. **Documentos operacionais (`architecture/`, `engineering/`, `product/`, `operations/`, `database/`) devem sempre refletir o código real.** Documentação desatualizada é corrigida, não ignorada.
4. **`operations/DECISIONS.md` e `operations/CHANGELOG.md` são append-only.** Nunca editar entradas existentes — apenas acrescentar.
5. **`engineering/GLOSSARY.md` é a única autoridade de terminologia.** Qualquer divergência de termos em outros documentos é um bug de linguagem — corrija o documento, não o Glossário.
6. **`archive/` nunca é excluído.** Documentos arquivados são preservados para contexto histórico.
7. **Novos documentos de referência cruzada atualizam este README e `foundation/FOUNDATION_INDEX.md`.** Nenhum documento fica fora do mapa.
8. **ADRs individuais migrarão para `docs/adr/` no futuro.** Por enquanto, todos os ADRs novos vão para `operations/DECISIONS.md`.

---

## Contato e Governança

Este Knowledge System é mantido pelo CTO do ParaguAI. Sugestões de melhoria seguem o mesmo processo que qualquer decisão Tipo 1: `foundation/DECISION_FILTER.md`.

Última atualização: **2026-06-28 — Knowledge System v1.0 implementado**
