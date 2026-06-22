# CLAUDE.md

# ParaguAI - Development Guide

Version: 1.0

Owner: Daniel Gonçalves

Role: CTO (ChatGPT)

Implementation: Claude Code

---

# Project Mission

ParaguAI is an AI-powered shopping platform focused on Paraguay.

The platform allows users to search products, compare prices, discover stores and receive intelligent buying recommendations.

The first target market is Ciudad del Este.

Future expansion includes all Paraguay.

---

# Project Vision

Become the largest intelligent shopping platform in Paraguay.

Long-term goals:

* AI Shopping Assistant
* Price Comparison
* Price History
* Product Discovery
* Store Directory
* Smart Search
* Recommendation Engine
* Mobile Apps
* Admin Panel
* Automatic Crawlers

---

# Development Philosophy

This project is developed as a commercial software product.

Every decision must prioritize:

* scalability
* maintainability
* performance
* readability
* reusability

Never implement temporary solutions.

Avoid technical debt whenever possible.

---

# Technology Stack

Frontend

* Next.js
* React
* TypeScript
* TailwindCSS

Backend

* Supabase

Database

* PostgreSQL

Authentication

* Supabase Auth

Hosting

* Vercel

Future

* Redis
* Meilisearch
* Cloudflare
* OpenAI
* Claude API

---

# Folder Structure

/app

/components

/hooks

/services

/types

/lib

/utils

/database

/docs

/assets

/public

---

# Architecture Rules

Pages never access Supabase directly.

Correct flow:

Page

↓

Hook

↓

Service

↓

Supabase

Never bypass this architecture.

---

# Components

Components must be:

Small

Reusable

Independent

Single responsibility

Avoid giant components.

---

# Hooks

Every business feature should expose a hook.

Examples

useProduct

useStore

useSearch

useOffer

useFavorite

---

# Services

Every database interaction belongs inside Services.

Never place Supabase queries inside components.

---

# Types

Every entity must have its own TypeScript type.

Never use "any".

---

# Database

Tables are the single source of truth.

Never duplicate database information inside code.

---

# Code Style

Prefer readability.

Use descriptive variable names.

Avoid abbreviations.

Avoid nested logic.

Prefer early return.

---

# Imports

Prefer absolute imports.

Example

@/components

@/services

@/hooks

Avoid long relative imports.

---

# Naming Convention

Components

PascalCase

Example

ProductCard.tsx

Hooks

camelCase

Example

useProduct.ts

Services

camelCase

Example

product.service.ts

Types

PascalCase

Example

Product

Offer

Store

---

# UI

Use TailwindCSS.

Maintain consistent spacing.

Prefer rounded corners.

Dark mode first.

Modern interface.

Minimalistic design.

---

# Performance

Lazy load when appropriate.

Avoid unnecessary renders.

Use memoization only when justified.

Avoid premature optimization.

---

# Security

Never expose secret keys.

Never commit credentials.

Validate every external input.

---

# Git Workflow

Every feature is developed inside a Release.

Example

Release 0.2

↓

Implementation

↓

Testing

↓

Commit

↓

Push

Never mix unrelated features in the same commit.

---

# Releases

Each Release must contain:

Objective

Files changed

Acceptance criteria

Manual testing

Commit message

---

# Documentation

Keep documentation updated.

Whenever architecture changes:

Update ARCHITECTURE.md

Whenever progress changes:

Update PROJECT_STATUS.md

Whenever roadmap changes:

Update ROADMAP.md

---

# Claude Responsibilities

Claude is responsible for:

Implementing features

Creating components

Refactoring code

Improving performance

Fixing bugs

Updating imports

Maintaining consistency

---

# Claude Restrictions

Claude must NEVER:

Change database schema without approval

Delete files without approval

Modify environment variables

Change architecture

Rename folders

Install dependencies without approval

Execute destructive commands

Force push Git

---

# Before Every Implementation

Claude must:

Understand existing architecture

Reuse existing components

Check existing hooks

Check existing services

Avoid duplicate code

Maintain project consistency

---

# Quality Checklist

Before finishing any task verify:

Project builds successfully

TypeScript passes

Lint passes

No duplicated code

No unused imports

No console.log left behind

Architecture respected

---

# Definition of Done

A task is complete only if:

Code works

Types are correct

Architecture respected

Documentation updated

No regressions introduced

Project compiles

---

# Communication

If any ambiguity exists:

Stop.

Explain the issue.

Ask for clarification.

Never guess business rules.

---

# Final Rule

The objective is not to generate code.

The objective is to build the ParaguAI platform with production-quality architecture.

Every implementation must improve the long-term value of the project.

