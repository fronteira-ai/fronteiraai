# TIER1_PARTNERS.md
# Pipeline de Negociação — Merchants Tier 1

**Versão**: 1.0
**Criado**: 2026-07-03 (Release 1.8 — Program C — Wave 0)
**Status**: Pipeline vivo — atualizar a cada interação real, nunca projetar estado otimista
**Categoria**: `docs/business/` (ADR-049)

---

## Como usar este documento

`Certification Status`/`Integration Strategy` são referenciados **por nome** de `docs/marketplace/Tier1_Merchants.md` (fatos técnicos, não duplicados aqui — se um valor mudar lá, atualize a referência, não invente um novo). Todo o resto abaixo (`Partner Status`, `Current Stage`, contatos, datas) é estado comercial, exclusivo deste documento. Nenhum campo de contato foi preenchido com dado real — nenhuma abordagem foi feita ainda (esta Wave é preparação, não execução comercial).

**Status possíveis** (`Partner Status`): `Not Contacted` → `Contacted` → `Meeting Scheduled` → `Negotiating` → `Technical Evaluation` → `Pilot` → `Official Partner` → `Suspended` (a qualquer momento, se a relação for pausada).

---

## Ordem recomendada de contato

| Prioridade | Merchant | Por quê |
|---|---|---|
| 1 | **Cellshop** | Bloqueado tecnicamente + um dos 2 merchants mais citados no roadmap (`PROJECT_STATUS.md`) — sem parceria, este dado nunca entra no marketplace |
| 1 | **Nissei** | Idem — distribuidor oficial Apple/Sony/Canon/Nikon, alto valor de catálogo, mesmo bloqueio técnico |
| 2 | **New Zone** | Bloqueado tecnicamente; auto-descrita como "plataforma de atacado" — B2B-minded, bom encaixe cultural para uma conversa de parceria de dado |
| 3 | **Casa Americana** | Bloqueado tecnicamente; loja tradicional relevante, mas prioridade ligeiramente menor que os 3 acima por menor volume de citação estratégica |
| 4 | **Mobile Zone** | Não bloqueado por política, mas viabilidade técnica incerta (SPA/JS) — uma conversa de parceria pode ser mais rápida que o spike técnico |
| 4 | **Visão VIP** | Idem — mesma incerteza técnica (possível CSR) |
| 5 | **Shopping China** | Connector já existe — parceria é upside (selo, dashboard), não bloqueio; contatar depois de recertificar o Connector existente |
| 5 | **Mega Eletrônicos** | Tecnicamente pronta para Connector — parceria é upside, não caminho único |
| 5 | **Roma Shopping** | Idem — maior catálogo potencial, parceria formalizaria uma relação já tecnicamente viável |
| 5 | **Atacado Connect** | Idem |

**Racional**: contatar primeiro quem só tem o caminho comercial (prioridade 1-3), depois quem tem incerteza técnica que uma parceria resolveria mais rápido que um spike de engenharia (prioridade 4), e por último quem já é tecnicamente integrável — ali a parceria fortalece a relação, mas não é a única porta de entrada de dado.

---

## Pipeline

| Merchant | Site | Categoria | Certification Status | Integration Strategy | Commercial Contact | Technical Contact | Partner Status | First Contact | Last Contact | Current Stage | Observações |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cellshop | cellshop.com.py | Eletrônicos/Celulares | Restricted — Commercial Partnership Recommended | Data Partnership | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Prioridade máxima — sem parceria, sem dado. robots.txt bloqueia ClaudeBot nomeadamente. |
| Nissei | nissei.com/py | Informática/Eletrodomésticos | Restricted — Commercial Partnership Recommended | Data Partnership | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Prioridade máxima — distribuidor oficial de marcas de peso, alto valor de catálogo se viabilizado. |
| Casa Americana | casaamericana.com.py | Eletrônicos/Geral | Restricted — Commercial Partnership Recommended | Data Partnership | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | `Disallow: /catalogo` sugere que o operador já pensa em proteção de catálogo — abordar com transparência sobre o modelo de parceria. |
| New Zone | newzone.com.py | Importados/Atacado | Restricted — Commercial Partnership Recommended | Data Partnership | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Auto-descrita como "plataforma de atacado" — pode já ter um feed B2B pronto para oferecer. |
| Mobile Zone | mobilezone.com.py | Celulares/Eletrônicos | Needs Technical Spike | Pending Decision | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Sem bloqueio de política — parceria pode ser mais rápida que resolver a suspeita de renderização client-side via engenharia. |
| Visão VIP | visaovip.com | Informática | Needs Technical Spike | Pending Decision | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Mesma lógica de Mobile Zone — sitemap não cobre catálogo, spike ou parceria resolvem o mesmo problema por caminhos diferentes. |
| Shopping China | shoppingchina.com.py | Importados/Geral | In Progress (connector existe, não certificado) | Public Connector | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Recertificar o Connector existente primeiro (usar sitemap real); parceria formaliza depois, não bloqueia o Connector. |
| Mega Eletrônicos | megaeletronicos.com | Eletrônicos | Ready for Connector Build | Public Connector | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Maior loja de eletrônicos de CDE — parceria é upside após o Connector técnico já estar rodando. |
| Roma Shopping | romapy.com | Geral (7 departamentos) | Ready for Connector Build | Public Connector | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Maior catálogo potencial (~50k) — parceria oficial valeria a pena pelo volume, mesmo já sendo tecnicamente integrável. |
| Atacado Connect | atacadoconnect.com | Informática/Eletrônicos | Ready for Connector Build | Public Connector | A identificar | A identificar | Not Contacted | — | — | 1. Contato inicial (pendente) | Ex-"Atacado Games" (já nomeada no Blueprint) — stack moderna, bom candidato técnico e comercial. |

---

## Convenção de atualização

Ao registrar o primeiro contato real com um merchant: preencher `First Contact`/`Last Contact` com a data real, mover `Partner Status` para `Contacted`, atualizar `Current Stage` para o passo correspondente do fluxo (`MERCHANT_PARTNERSHIP_PROGRAM.md` §4). Nunca marcar um estágio como concluído sem a interação real correspondente ter acontecido — este documento é o registro do que de fato aconteceu, não do que está planejado (isso vive em `MERCHANT_PARTNERSHIP_PROGRAM.md`/`ROADMAP_1_8.md`).
