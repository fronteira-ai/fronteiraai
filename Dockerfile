# ParaguAI — imagem do frontend Next.js para o VPS Fluence (Mission 05.14)
#
# Multi-stage com `output: "standalone"` (ver next.config.ts): o estágio runner
# leva apenas o servidor Next + os estáticos + o `node_modules` mínimo que o
# próprio Next gera. Sem `sharp`: a otimização de imagem é desativada por
# variável (`SELF_HOSTED_IMAGES_UNOPTIMIZED=1`, ver next.config.ts), o que
# remove a dependência nativa e o custo de CPU por imagem neste host de 4 vCPU.
#
# NÃO construir isto em produção sem autorização (Mission 05.14 proíbe). Etapa A
# roda o build no VPS com teto de memória — ver
# docs/operations/MISSION_05_14_FRONTEND_PREPARATION.md.
#
# Requisitos verificados: package-lock.json presente (npm ci), engines.node >= 20.18.0,
# nenhuma Server Action ("use server" ausente), nenhum import `@vercel/*`,
# nenhum `runtime = "edge"`, nenhum `waitUntil`/`after`.

# ── Estágio 1: dependências ──────────────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ── Estágio 2: build ────────────────────────────────────────────────────────
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Mission 05.16 — CORREÇÃO medida em execução real no VPS: o build precisa das
# variáveis de ambiente COMPLETAS, inclusive da `SUPABASE_SERVICE_ROLE_KEY`.
# Motivo: `/` é prerenderizada (ISR `revalidate = 60`) e o caminho de dados da
# home usa o client de service role; sem a chave, o prerender falha com
# "NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para
# operações administrativas" — a MESMA classe de falha que quebrou os Preview
# builds na Vercel (Mission 05.3).
#
# As variáveis entram por BUILD SECRET do BuildKit, não por ARG/ENV: segredo em
# ARG fica registrado em `docker history` e em camada; build secret não fica no
# histórico nem na imagem final. O arquivo montado é o MESMO
# /etc/paraguai/app.env (root:root 0600) usado em runtime — um único lugar de
# custódia, nada duplicado no Git.
RUN --mount=type=secret,id=app_env,target=/tmp/app.env \
    set -a && . /tmp/app.env && set +a && \
    NEXT_TELEMETRY_DISABLED=1 npm run build

# ── Estágio 3: runtime (mínimo, não-root) ───────────────────────────────────
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3100 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1 \
    SELF_HOSTED_IMAGES_UNOPTIMIZED=1

# Sem pacotes extras: o healthcheck usa o `wget` do busybox (já presente).
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

# Cache ISR persistente (volume montado pelo compose em /app/.next/cache)
RUN mkdir -p /app/.next/cache && chown -R nextjs:nodejs /app/.next

USER nextjs
EXPOSE 3100

HEALTHCHECK --interval=30s --timeout=5s --start-period=25s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3100/robots.txt || exit 1

CMD ["node", "server.js"]
