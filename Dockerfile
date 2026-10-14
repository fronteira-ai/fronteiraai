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
# NEXT_PUBLIC_* são "inlined" no bundle do cliente em tempo de BUILD: precisam
# existir aqui. Os demais segredos NÃO são necessários para o build e não devem
# ser passados (ver .dockerignore). Valores reais vêm do env do build no VPS.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL \
    NEXT_TELEMETRY_DISABLED=1
RUN npm run build

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
