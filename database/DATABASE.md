# 🇵🇾 ParaguAI - Database Architecture

> Versão: 1.0
> Status: Em desenvolvimento

---

# Objetivo

O banco de dados do ParaguAI foi projetado para suportar:

- Comparação de preços
- Inteligência Artificial
- Histórico de preços
- Importação por CSV
- Integração por API
- Crawlers
- Painel Administrativo
- Aplicativos Mobile
- Escalabilidade para milhões de produtos

---

# Estrutura Principal

Stores
│
├── Offers
│
Products
│
├── Brands
│
├── Categories
│
└── Images

Offers
│
└── Price History

Users
│
├── Favorites
├── Alerts
└── Reviews

---

# Tabelas

## stores

Representa uma empresa cadastrada.

Exemplos:

- Cellshop
- Shopping China
- Mega Eletrônicos
- Nissei

---

## brands

Representa fabricantes.

Exemplos:

Apple

Samsung

DJI

Sony

Xiaomi

---

## categories

Categorias dos produtos.

Exemplos:

Celulares

Notebook

Drone

Perfumes

TV

Videogame

---

## products

Cada produto existe apenas uma vez.

Exemplo:

Apple

iPhone 16 Pro

256GB

Black Titanium

---

## offers

Representa uma oferta de uma loja para um produto.

Uma oferta possui:

- preço
- estoque
- parcelamento
- garantia
- cashback
- disponibilidade
- última atualização

---

# Futuras tabelas

price_history

product_images

store_images

reviews

alerts

search_logs

news

coupons

restricted_products

restricted_categories

import_jobs

crawler_logs

ai_embeddings

---

# Filosofia

Produto é único.

Loja é única.

Oferta é única.

O preço pertence à oferta e não ao produto.