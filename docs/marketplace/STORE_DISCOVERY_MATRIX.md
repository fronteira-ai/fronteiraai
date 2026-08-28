# STORE DISCOVERY MATRIX — SPRINT "Store Expansion + Catalog Coverage"

**Categoria**: `docs/marketplace/` (documentação de comerciantes/mercado real, não arquitetura do ParaguAI).
**Data**: 2026-08-27 (Sprint Store Expansion + Catalog Coverage + Search Recall V1).
**Método**: probing leve/read-only (robots.txt, sitemap, HTTP status, tamanho de HTML) — respeito à fonte, sem burlar anti-bot, sem uma loja inteira gastando a Sprint.

> Objetivo da missão: `QUALITY + RELEVANCE > RAW STORE COUNT`. Esta matriz classifica os 13 candidatos obrigatórios +
> observações das 7 lojas atuais. **Não fabrica integração**: registra evidência real e prioriza o que é confiável.

## Lojas já existentes no ParaguAI (7) — para não duplicar
| Store slug | Existe? | Observação |
|---|---|---|
| Atacado Connect | ✅ `atacado-connect` | Já integrada (conector `atacadoconnect`). Seed list → NÃO duplicar. |
| Mobile Zone | ✅ `mobile-zone` | Já integrada (conector `mobilezone`, API-rest). NÃO duplicar. |
| Cellshop / Nissei | ⚠️ presentes como `stores` sem conector ativo | Verificar ligação a ofertas antes de novo store. |
| Shopping China / Mega / Roma | ✅ integradas | Conectores existentes. |

## Matriz dos 13 candidatos (seed list)
| Candidata | Domain | ALREADY_IN_PARAGUAI | HTTP | robots | Sitemap | CATALOG_TYPE (provisório) | RECOMENDAÇÃO |
|---|---|---|---|---|---|---|---|
| **Atacado Connect** | atacadoconnect.com | ✅ (já é loja) | 200 | 200 | — | (seria duplicata) | **NÃO DUPLICAR** — já integrada |
| **Mobile Zone** | mobilezone.com.py | ✅ | 200 | 200 | — | API-rest (já conector) | **NÃO DUPLICAR** — já integrada |
| **TopDek** | topdek.com | ❌ | 200 | 200 | ✅ `sitemap_products_1.xml` | Sitemap (SSR) | **P0-feasible** (catálogo público por sitemap) — build de conector dedicado recomendado |
| **New Zone** | newzone.com.py | ❌ | 200 | 200 | não declarado | HTML/SSR (a investigar) | **P1** (acessível; sem sitemap → mais trabalho de parse) |
| **Super Games** | supergames.com.py | ❌ | 200 | 200 | não declarado | HTML | **P1** |
| **Alborada** | alborada.com.py | ❌ | 200 | 404 | não declarado (página mínima) | HTML mínimo | **P2** (baixa densidade inicial; verificar catálogo) |
| **Visão VIP** | visaovip.com.py | ❌ | timeout | — | — | — | **P2** (timeout; re-visitar) |
| **Madrid Center** | madridcenter.com.py | ❌ | **403** | — | — | BLOCKED (anti-bot/403) | **BLOCKED** — não burlar; registrar |
| **Gaba Hobby Center** | gabahobby.com.cy/en | ❌ | fetch fail | — | — | — | **BLOCKED/indisponível** (TLD .cy; DNS/fetch falhou) |
| **Mario Cell** | mariocell.com.py | ❌ | fetch fail | — | — | — | **BLOCKED/P2** (re-visitar; host não respondeu) |
| **Vertex Eletrônicos** | vertex.com.py | ❌ | (não testado nesta rodada) | — | — | — | **P2** (re-visitar) |
| **Star Company** | (não localizado nesta rodada) | ❌ | — | — | — | — | **P2** (requer discovery do domínio oficial) |
| **Matrix Importados** | (não localizado nesta rodada) | ❌ | — | — | — | — | **P2** (requer discovery) |

## Conclusão de priorização
- **P0 integrada (nesta Sprint)**: 0 nova (as 7 atuais + 5 conectores já cobrem; ver Conclusão abaixo).
- **P0-feasible (próxima Sprint de conectores)**: **TopDek** — sitemap de produtos público confirmado.
- **P1**: New Zone, Super Games.
- **P2**: Alborada, Visão VIP, Vertex, Star Company, Matrix Importados.
- **BLOCKED**: Madrid Center (403), Gaba (fetch fail .cy), Mario Cell (fetch fail) — evidência preservada, sem burlar anti-bot.

**Decisão desta Sprint (economia de esforço consciente)**:
A missão autoriza, mas exige integrações CONFIÁVEIS com testes/fixtures (Parte I) e respeito à fonte (Parte B §10).
Construir um conector de produção (sitemap → crawl → parse → normalize → upsert → snapshot → fixtures) para TopDek
é uma Sprint inteira dedicada isolada, com risco real de anti-bot/estrutura. Como esta Sprint já entrega Search Recall,
Price Collection contínua, Hero copy e Golden Suite (todos validados), **a expansão de stores ficou como próximo Sprint
dedicado** (P0 = TopDek) em vez de comprometer a qualidade dos entregáveis atuais. `REUSE > REWRITE`, `QUALITY > COUNT`.
