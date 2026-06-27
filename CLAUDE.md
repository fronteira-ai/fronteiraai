# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## PRIORITY: Read the Foundation documents first

**Before starting any task**, read these two documents in order:

1. `docs/AI_CONSTITUTION.md` — who we are, permanent principles, engineering rules, acceptance criteria. Highest-priority document. All other documents are subordinate to it.
2. `docs/NORTH_STAR.md` — how we make decisions. The daily compass: 10 filters, prioritization framework, the Mandatory Question, and the final checklist before any merge or release.

Document hierarchy:
1. `docs/AI_CONSTITUTION.md` — permanent principles (read first, always)
2. `docs/NORTH_STAR.md` — decision framework (read second, consult daily)
3. `docs/DECISIONS.md` — architectural decision records (ADRs)
4. `CLAUDE.md` (this file) — operational development instructions
5. `docs/ARCHITECTURE.md` — real current architecture
6. `docs/PROJECT_STATUS.md` — real current project state

## Critical: Next.js version warning

This project runs **Next.js 16.2.9** with **React 19.2.4** — versions newer than your training data, with breaking API/convention/file-structure changes. Before writing any App Router, routing, data-fetching, or config code, read the relevant guide under `node_modules/next/dist/docs/` (e.g. `01-app/`, `03-architecture/`) and heed any deprecation notices there rather than relying on memorized Next.js patterns.

## Commands

- `npm run dev` — start the dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — run a production build
- `npm run lint` — ESLint (flat config via `eslint.config.mjs`, `eslint-config-next` core-web-vitals + typescript)

There is no test suite/runner configured in this repo yet.

## Project overview

ParaguAI ("fronteiraai-web") is a price-comparison marketplace site (Portuguese-language UI) for stores in Paraguay/the border region. Users search across products/stores/brands; the eventual product includes AI-assisted search, price history, and recommendations. Much of the codebase is an early scaffold — many files exist as deliberate empty placeholders for planned work, so check a file's actual contents before assuming a feature is implemented.

## Architecture

**Stack**: Next.js App Router + React + TypeScript, Tailwind CSS v4 (`@import "tailwindcss"` + `@theme inline` in `app/globals.css`, no `tailwind.config`), Supabase (`@supabase/supabase-js`) as the backend/DB, `lucide-react` for icons.

**Path alias**: `@/*` maps to the repo root (see `tsconfig.json`).

**Layered data flow**: `types/*.ts` (interfaces mirroring DB tables) → `services/*.service.ts` (Supabase queries, one file per domain: `product`, `offer`, `store`, `search`, `brand`, `category`, `ai`) → `hooks/use*.ts` (React state wrappers around services, one per domain) → `components/*` (presentational, organized by domain folder: `home/`, `product/`, `store/`, `search/`, `layout/`, plus a shared `ui/` kit) → `app/*` (route pages composing components).

- Supabase client is a single shared instance: `lib/supabase.ts`, created from `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`.env.local`).
- Services return typed arrays from `supabase.from(table).select(...)`, logging and returning `[]` on error rather than throwing — follow this convention for new service functions.
- Interactive components (e.g. `components/home/SearchBar.tsx`) are marked `"use client"`; route files under `app/` and most layout components are server components by default — keep new components server-rendered unless they need state/events.
- Styling is utility-first Tailwind with a dark space theme (`bg-[#050816]`, slate/blue/cyan accents); no CSS modules or styled-components in use.

**Database**: modeled in `database/DATABASE.md` and `database/ERD.md`. Core entities: `stores` ⟶ `offers` ⟶ `products` ⟶ `brands`/`categories`/images; `users` ⟶ `favorites`/`alerts`/`reviews`. Key philosophy stated in those docs: a product is unique, a store is unique, an offer is unique, and **price belongs to the offer, not the product** (since the same product can have different prices/stock per store). Planned-but-not-yet-built tables are listed there too (`price_history`, `reviews`, `coupons`, `crawler_logs`, `ai_embeddings`, etc.) — `database/migrations`, `database/seed`, `database/sql` are currently empty placeholders.

**Docs**: longer-form/non-code documentation lives under `docs/` (currently mostly empty placeholders: `ARCHITECTURE.md`, `PRODUCT.md`, `ROADMAP.md`, `API.md`, `RULES.md`, `CHANGELOG.md`, `PROJECT_STATUS.md`) and `styles/DESIGN_SYSTEM.md` (also empty). `ai/` (`embeddings/`, `prompts/`, `rules/`, `tools/`) is similarly scaffolded for future AI-feature work.
