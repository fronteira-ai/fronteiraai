# ARCHITECTURE.md

# ParaguAI Architecture

Version: 1.0

---

# Purpose

This document defines the official architecture of the ParaguAI platform.

Every new feature must respect these standards.

---

# Architectural Principles

The project follows a layered architecture.

```
UI
↓

Page

↓

Hook

↓

Service

↓

Supabase

↓

Database
```

Each layer has a single responsibility.

---

# Directory Structure

```
app/
components/
hooks/
services/
types/
lib/
utils/
database/
docs/
public/
assets/
```

---

# app/

Contains Next.js routes.

Responsibilities:

* Routing
* Layouts
* Metadata
* Server Components
* Client Pages

Must never contain business logic.

---

# components/

Reusable UI components.

Organization:

```
components/

home/

product/

store/

search/

compare/

layout/

ui/
```

Rules:

* Small components
* Reusable
* Independent
* No database access

---

# hooks/

Business logic for the frontend.

Examples:

```
useProduct()

useStore()

useSearch()

useOffers()

useFavorites()
```

Rules:

* Call Services
* Manage loading state
* Manage errors
* Never access Supabase directly

---

# services/

Data layer.

Responsible for:

* Queries
* Inserts
* Updates
* Deletes

Every communication with Supabase belongs here.

Example:

```
product.service.ts

store.service.ts

offer.service.ts

search.service.ts
```

---

# types/

Every entity must have its own type.

Examples:

```
Product

Offer

Store

Brand

Category

Favorite

User
```

Never use "any".

---

# lib/

Shared libraries.

Examples:

```
supabase.ts

constants.ts

env.ts
```

---

# utils/

Pure utility functions.

Examples:

```
currency.ts

formatDate.ts

slug.ts

validators.ts
```

---

# Database Layer

Current entities:

Brands

Categories

Products

Offers

Stores

Favorites (future)

Users (future)

Price History (future)

---

# Entity Relationships

```
Brand

↓

Products

↓

Offers

↓

Stores
```

One Product

↓

Many Offers

One Store

↓

Many Offers

---

# Product Domain

Responsibilities:

* Product page
* Specifications
* Gallery
* Related products
* Price history
* Offers

Future components:

```
ProductCard

ProductGallery

ProductHeader

ProductSpecifications

ProductOffers

ProductBreadcrumb

ProductPriceHistory
```

---

# Store Domain

Responsibilities:

* Store profile
* Store products
* Store information
* Ratings

Future components:

```
StoreCard

StoreHeader

StoreProducts

StoreInformation
```

---

# Search Domain

Responsibilities:

* Search products
* Search stores
* Search brands

Future:

Autocomplete

Filters

Ranking

Suggestions

AI Search

---

# Compare Domain

Responsibilities:

Compare products.

Compare specifications.

Compare prices.

Compare stores.

---

# AI Domain

Responsibilities:

Shopping assistant.

Recommendations.

Buying advice.

Price explanation.

Future integrations:

OpenAI

Claude

---

# Naming Convention

Components

PascalCase

```
ProductCard.tsx
```

Hooks

camelCase

```
useProduct.ts
```

Services

camelCase

```
product.service.ts
```

Pages

Next.js App Router

```
app/product/[slug]/page.tsx
```

---

# Data Flow

Correct flow:

```
Page

↓

Hook

↓

Service

↓

Supabase

↓

Database
```

Incorrect:

```
Page

↓

Supabase
```

---

# Error Handling

Services return:

* data
* error

Hooks transform errors into UI state.

Pages only display information.

---

# UI Guidelines

Dark-first interface.

Responsive.

Modern.

Minimal.

Rounded corners.

Consistent spacing.

Accessible.

---

# Performance

Reuse components.

Avoid duplicated logic.

Lazy load when appropriate.

Optimize images.

Cache requests when possible.

---

# Security

Never expose secrets.

Never trust client input.

Validate server-side.

Respect Supabase RLS policies.

---

# Scalability

Architecture must support:

* Mobile app
* Public API
* AI
* Admin Panel
* Crawlers
* Price History
* Notifications

Without major refactoring.

---

# Future Modules

Current:

Home

Products

Stores

Search

Future:

Authentication

Favorites

History

Notifications

Admin

Analytics

Crawler

Marketplace

---

# Development Rules

Every new feature must:

Reuse existing components.

Reuse hooks.

Reuse services.

Avoid duplicated code.

Respect folder structure.

Respect naming conventions.

Keep documentation updated.

---

# Definition of Architecture Success

A developer unfamiliar with the project must understand:

* where code belongs;
* how data flows;
* how modules interact;
* where to add new features;

within minutes of reading this document.
