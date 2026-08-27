# Engineering Constitution

**Categoria**: `docs/engineering/`
**Status**: ATIVO desde 2026-07-17 (Program ΩΩ — Mission ΩΩ-3, Engineering Closure)
**Hierarquia**: subordinado a `docs/foundation/AI_CONSTITUTION.md` e `docs/foundation/ENGINEERING_PRINCIPLES.md` — este documento não substitui a Foundation, formaliza como o núcleo arquitetural construído nos Programas Κ–ΩΩ deve ser tratado a partir de agora.

Este documento não cria nenhum princípio novo. Cada item abaixo já foi praticado, testado e validado com evidência real em pelo menos um dos Programas Κ, Π, Ω, Λ, Μ, Ν, Ο ou ΩΩ — esta Constituição apenas os torna permanentes e explícitos.

---

## História da Engenharia

| Programa | Entrega real | Evidência |
|---|---|---|
| **Κ** | Product Identity, Product Signature, Universal Taxonomy, Merge Engine, Opportunity Engine, Buyer Intelligence, Product Intelligence, Exchange, Marketplace Intelligence | Domínios construídos e testados; encerramento formal certificado pelo CTO (Mission Κ-5) |
| **Π** | Product Identity V2 (manufacturerCode como sinal de alta confiança), Knowledge Graph | Integrado ao `ProductIdentityEngine` sem reescrita — mesma engine, mesmos pesos, novo insumo |
| **Ω** | Marketplace Memory, Read-Through, Shadow Validation, Incremental Architecture, Rollout controlado em produção | 0 Parity Errors em 141.434 leituras reais (Ω-4); Shadow Mode nunca violado |
| **Λ** | Marketplace Impact Audit | Primeira medição real de que a infraestrutura correta não move KPI de negócio sozinha (CPC 0,08%) |
| **Μ** | Comparable Coverage Root Cause Analysis | Waterfall real de 17.987 produtos não-comparáveis; achado central: 98% da fila de merge pendente é intra-loja |
| **Ν** | Unknown Match Analysis | Replay real do `ProductIdentityEngine` contra 5.642 produtos — 0 casos de supressão algorítmica encontrados |
| **Ο** | Comparable Coverage Expansion Strategy | Estratégia de crescimento fundamentada nas taxas de overlap reais por categoria (Celulares 16,67%, Drones 33,33%, Notebooks 10,00%) |
| **ΩΩ** | Final Architecture Validation, Engineering Sign-Off, Engineering Closure | Parecer: **ENGINEERING APPROVED WITH MONITORING** — nenhuma falha estrutural, núcleo arquitetural congelado |

---

## Princípios Arquiteturais (permanentes)

1. **Shadow Mode é inegociável.** Nenhum merge de produto é automático, em nenhuma circunstância, em nenhum tier de confiança — sempre requer aprovação humana explícita via `MergeExecutorService.approve()`. Provado nunca violado em 27 execuções reais + toda a sequência Κ→ΩΩ.
2. **Bridge file único por fronteira de domínio.** Quando um domínio precisa compor dado de outros domínios, essa composição vive em um único arquivo explicitamente documentado como ponte (`CanonicalMergeSuggestionService.ts` para product-identity → canonical-catalog/taxonomy/product-intelligence/marketplace-memory) — nunca espalhada.
3. **Cache nunca pode divergir do valor fresco.** Qualquer camada de reaproveitamento de computação (Marketplace Memory) deve validar continuamente contra o cálculo original e preferir o valor fresco em qualquer divergência — nunca confiar cegamente em um valor persistido.
4. **Fallback silencioso, nunca bloqueante.** Falha em uma camada de otimização (leitura de cache, escrita de fato aprendido) nunca pode interromper o caminho principal — sempre degrada para o comportamento anterior, documentado e testado (19/19 testes de resiliência).
5. **Dry-run por padrão.** Todo script operacional que escreve em produção opera em modo de simulação até `--execute` ser passado explicitamente.
6. **Autorização explícita antes de escrita real em produção.** Nenhuma migration, backfill ou execução em lote roda contra o banco vivo sem confirmação explícita do CTO — mesmo quando a missão já autoriza o trabalho em geral.
7. **Evidência sobre opinião, sempre.** Toda conclusão arquitetural relevante desde o Programa Λ é sustentada por dado real extraído do banco de produção ou por replay do código real — nunca por estimativa não identificada como tal.

---

## Componentes Congelados

| Componente | Motivo | Evidência | Quando pode ser reaberto |
|---|---|---|---|
| **Product Identity Engine** | Auditoria exaustiva não encontrou nenhuma falha algorítmica | Ν-1: replay real de 5.642 produtos, 0 casos de supressão | Novo requisito arquitetural explícito, ou evidência objetiva de decisão incorreta em produção |
| **Marketplace Memory** (schema + read-through + fallback) | Correção provada sob carga real | Ω-4: 0 Parity Errors em 141.434 leituras reais | Evidência objetiva de divergência real, ou decisão de negócio para reduzir `PARITY_SAMPLE_PERCENT` (configuração, não reabertura de código) |
| **Merge Engine** (execução + rollback) | Shadow Mode nunca violado, rollback testado com sucesso real | 27 execuções reais, 1 rollback bem-sucedido | Evidência objetiva de falha de execução ou reversão |
| **Product Signature** | Base estável desde Κ-3, reutilizada sem alteração por Ω e Ν | Replay de Ν-1 usou a função original sem modificação | Novo tipo de atributo extraível com requisito de negócio real |
| **Universal Taxonomy Engine** (mecanismo) | `findNodeByRealCategorySlug` correto e testado — o que falta é conteúdo mapeado, não lógica | Μ-1: mecanismo funciona, gap é de dado (86,18% de slugs não mapeados), não de código | Evidência de que o mecanismo de mapeamento (não o conteúdo) está incorreto |
| **Connector Platform** | Múltiplos merchants reais certificados e sincronizando em produção | Program Σ — SDK, Capability Matrix, certificação real | Novo requisito de tipo de fonte não coberto pelo SDK atual |
| **Canonical Catalog** (domínio base) | Camada auditada diretamente em ΩΩ-1 — índices corretos, RLS completo, sem violação de camada | ΩΩ-1 §2/§3 — inspeção direta de schema e dependências | Evidência objetiva de gap de integridade de dado |

**Componentes explicitamente NÃO certificados para congelamento nesta rodada** (evidência insuficiente, não falha encontrada): Search (Λ-1 já registrou honestamente a ausência de dado de recall/precision — 68 eventos de comprador em toda a história do produto, insuficiente para certificar); Knowledge Graph (evidência existe apenas de forma indireta, embutida em Taxonomy/Product Signature — nenhuma Mission auditou o Knowledge Graph isoladamente); Advisor (código correto e sem risco estrutural, mas seu comportamento observável muda conforme o CPC cresce — Program Ο — por isso permanece sob monitoramento, não congelado).

---

## Critérios para Reabertura

Um componente da lista de Componentes Congelados **somente** poderá ser alterado se:

- **Existir novo requisito arquitetural** — uma necessidade de negócio real que o design atual estruturalmente não comporta (não uma preferência de implementação alternativa)

**OU**

- **Existir evidência objetiva de falha** — um dado real de produção, um caso replay-ado, ou uma métrica monitorada que ultrapasse um SLO documentado

**Nunca por preferência.** Uma sugestão de "poderia ser feito de outro jeito" sem uma das duas condições acima não é motivo válido para reabrir um componente desta lista.

---

## Agent Autonomy Policy — AGENT_AUTONOMY_MATRIX (Sprint Autonomy Upgrade V1)

**Subordinado à Foundation e a este documento.** Não é uma segunda constituição; formaliza o modelo de autonomia operacional dos agentes (Reasonix/Claude/Codex) como regra canônica. O PEF legado está arquivado em `docs/archive/PEF_LEGACY/` e **nunca deve ser ressuscitado**; o `reasonix.toml` (`[permissions].allow`) e `.claude/settings.local.json` são as allowlists **operacionais** (GREEN); este documento é a **norma de decisão** sobre o que é GREEN/YELLOW/RED.

Princípio fundamental: **FAZER > PERGUNTAR.** Uma missão aprovada pelo owner autoriza todas as operações seguras, reversíveis e necessárias para concluí-la. Não transformar subtarefas normais em novas solicitações de aprovação; não interromper por escolhas que um Staff Engineer consegue resolver. Alvo de interrupção: **OWNER_INTERRUPTION_TARGET = 0** por Sprint.

### GREEN — executar sem perguntar
Leitura/busca; edição/criação de arquivos dentro do escopo aprovado; refactors reversíveis; correções de bugs; componentes; testes; scripts locais; lint/typecheck/testes/build; Playwright/screenshots/validação visual; SQL read-only; inspeção de banco/Docker/logs; git read-only (`status/diff/log/show/branch/fetch/rev-parse`); `checkout/switch/add/commit/merge --ff-only/cherry-pick não destrutivo`; criação de branch; documentação factual; correções para gates passarem.

Falhou → **DIAGNOSTICAR → CORRIGIR → RETESTAR** (não devolver ao owner problema que se resolve com segurança).

### YELLOW — autonomia dentro da missão
Preparar autonomamente: migrations não destrutivas; novos índices/RPCs/seeds; schema aditivo; novas dependências justificadas; grandes refactors reversíveis; alteração de contratos internos; release candidate. Se a **missão autorizar explicitamente a aplicação/publicação**, essa operação já está autorizada — não pedir segunda autorização.

### RED — únicos gates humanos (PARE antes de)
`DROP`/`TRUNCATE`/`DELETE` massivo/destrutivo/perda de dados; migration destrutiva em produção; `git reset --hard` sem trabalho preservado; `git clean` destrutivo; force push; reescrita destrutiva de histórico; exclusão de branch remota importante; apagar Cloud/VPS/storage/projeto; revogar/rotacionar secrets; expor credenciais; billing/pagamento; operação irreversível não autorizada; mudança **material** de produto fora do escopo da Sprint.

Não classificar como RED algo só porque envolve bash/git — risco real > nome da ferramenta.

### Ambiguidade
Escolher, nesta ordem: (1) mais segura; (2) mais simples; (3) mais reversível; (4) consistente com a arquitetura; (5) melhor coberta por testes; (6) melhor UX/performance. Só interromper se alternativas alterarem materialmente produto/dados/segurança/arquitetura/custos/operação irreversível.

### Qualidade de ponta a ponta
IMPLEMENT → LINT → TYPECHECK → TEST → BUILD → CORRIGIR → REPETIR → VALIDAR → PUBLICAR (quando autorizado) → VALIDAR PRODUÇÃO. Não parar porque um gate falhou; corrigir e repetir.

---

## Princípios de Engenharia

- **Evidence First** — nenhuma decisão arquitetural desde o Programa Λ foi tomada sem dado real extraído do sistema em produção
- **Architecture Last** — a resposta a "o que fazer a seguir" (Programa Ο) foi deliberadamente de negócio (composição de catálogo), não de arquitetura, porque a evidência apontou para lá
- **Business Before Optimization** — Marketplace Memory existe para eliminar redundância de computação, mas seu benefício de performance foi deliberadamente deixado não realizado (parity sampling 100%) até que a correção estivesse provada — negócio (correção, segurança) antes de otimização (velocidade)
- **Backward Compatibility** — toda mudança em `CanonicalMergeSuggestionService.ts` desde Κ-4 preservou o comportamento anterior por padrão (feature flags com default inerte, fallback automático)
- **Incremental Evolution** — cada Programa (Κ→ΩΩ) se apoiou no anterior sem reescrita; nenhum domínio foi descartado ou substituído em toda a sequência
- **Clean Domain Boundaries** — confirmado por inspeção direta em ΩΩ-1: zero violações de direção de dependência, uma única exceção documentada (import de tipo, sem acoplamento de runtime)
- **Documentation Driven** — toda decisão relevante tem um ADR correspondente em `docs/operations/DECISIONS.md`, e todo achado de Mission tem um relatório rastreável
