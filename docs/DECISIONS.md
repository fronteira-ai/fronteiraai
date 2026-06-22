# DECISIONS.md

Registro de decisões arquiteturais (ADR leve). Cada entrada documenta o que foi decidido, por quê, e quais alternativas foram descartadas. Adicione uma nova entrada sempre que uma decisão estrutural for tomada — não edite entradas antigas, apenas acrescente.

---

## ADR-001 — `lib/env.ts` é a única fonte de acesso a `process.env`

**Data**: 2026-06-22 (Sprint 3.2, encerramento)
**Status**: Aceita

**Contexto**: `lib/supabase.ts` e `constants/routes.ts` acessavam `process.env` diretamente, cada um com sua própria forma de tratar variável ausente (`!` non-null assertion em um caso, fallback silencioso no outro). Havia também um `lib/env.ts` solto, criado mas nunca conectado a nada, duplicando a responsabilidade de validação.

**Decisão**: Centralizar todo acesso a `process.env` em `lib/env.ts`, exportando um objeto `env` tipado. Variáveis obrigatórias (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) lançam erro descritivo se ausentes, distinguindo a mensagem entre ambiente local (`process.env.VERCEL !== "1"`, recomenda `.env.local`) e Vercel (`process.env.VERCEL === "1"`, recomenda o painel do projeto). Variáveis opcionais (`NEXT_PUBLIC_SITE_URL`) têm fallback dentro do próprio `env.ts`. `lib/supabase.ts` e `constants/routes.ts` agora importam de `lib/env.ts` em vez de tocar `process.env`.

**Alternativas descartadas**: usar uma lib de validação de schema (ex. `zod`/`t3-env`) — rejeitada para não introduzir dependência nova sem necessidade comprovada (o projeto tem só 3 variáveis de ambiente hoje).

**Consequência**: qualquer variável de ambiente nova deve ser adicionada em `lib/env.ts`, nunca lida diretamente via `process.env` em outro arquivo. Isso é verificável com `grep -rn "process\.env" --include="*.ts" --include="*.tsx" .` — deve retornar apenas ocorrências dentro de `lib/env.ts`.

---

## ADR-002 — `.env.example` deixa de ser ignorado pelo Git

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: O `.gitignore` tinha a regra genérica `.env*`, que also capturava `.env.example` — um arquivo template sem segredos, pensado para ser commitado e orientar quem clona o repositório. Na prática isso significava que `.env.example` nunca chegava ao Git, mesmo intencionalmente criado (foi encontrado em `lib/.env.example`, também no lugar errado).

**Decisão**: adicionar `!.env.example` após a regra `.env*` no `.gitignore`, e mover o arquivo para a raiz do projeto (`.env.example`), local convencional onde ferramentas e desenvolvedores esperam encontrá-lo, junto de `NEXT_PUBLIC_SITE_URL` (antes ausente do exemplo).

**Consequência**: qualquer variável nova adicionada a `lib/env.ts` deve ganhar uma linha correspondente em `.env.example`.

---

## ADR-003 — Removido o script `format` do `package.json`

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: Um `package.json` editado nesta mesma janela de trabalho (ainda não commitado antes desta sprint) introduziu o script `"format": "prettier --write ."`, mas `prettier` nunca foi adicionado a `devDependencies` — o script falharia (`command not found`) se executado.

**Decisão**: remover o script em vez de adicionar `prettier` como dependência nova, seguindo a regra explícita desta sprint de não introduzir dependências sem necessidade comprovada. Formatação de código fica, por ora, a cargo do ESLint (`npm run lint`) e do formatter do editor.

**Alternativas descartadas**: adicionar `prettier` + `.prettierrc` agora — viável e provavelmente desejável no futuro, mas fora do escopo desta sprint de consolidação (que é sobre não adicionar peças novas, e sim arrumar o que já existia pela metade).

**Consequência**: se/quando Prettier for adotado, deve vir como uma decisão própria (nova entrada neste arquivo), com configuração e integração ao ESLint (`eslint-config-prettier`) para evitar regras conflitantes.

---

## ADR-004 — Script `clean` reescrito para ser multiplataforma

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: `"clean": "rmdir /s /q .next 2>nul || true"` é sintaxe de `cmd.exe` do Windows; falha (ou não faz nada útil) em qualquer outro shell, incluindo o ambiente de build da Vercel (Linux) e em macOS/Linux locais.

**Decisão**: reescrever como `"clean": "node -e \"require('fs').rmSync('.next', { recursive: true, force: true })\""` — usa apenas o módulo `fs` nativo do Node (já uma dependência do projeto via `next`), funciona identicamente em qualquer SO, sem adicionar pacotes como `rimraf`.

---

## ADR-005 — Documentação real substitui documentação aspiracional

**Data**: 2026-06-22
**Status**: Aceita

**Contexto**: `docs/PROJECT_STATUS.md` e `docs/ARCHITECTURE.md` originais foram escritos antes da implementação do domínio de Produto e descreviam um estado de planejamento ("Sprint 0", 15% de progresso, "Release 0.2: Planned") que não correspondia mais ao código.

**Decisão**: esses dois arquivos passam a ser gerados/atualizados a partir de leitura real do código a cada sprint de consolidação, não editados manualmente como plano. `docs/ROADMAP.md` e `docs/CLAUDE.md` (a versão em `docs/`, distinta da raiz) permanecem como documentos de visão/processo de longo prazo e não são reescritos por essa auditoria — eles descrevem intenção, não estado.

**Consequência**: ao final de cada sprint de consolidação, repetir a leitura completa do código antes de tocar em `PROJECT_STATUS.md`/`ARCHITECTURE.md`/`FEATURES.md`/`TECH_DEBT.md`/`CHANGELOG.md`/`NEXT_STEPS.md`.
