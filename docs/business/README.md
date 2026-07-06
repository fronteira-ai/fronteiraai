# docs/business/

Processo comercial do ParaguAI com terceiros — não fatos técnicos sobre eles (isso é `docs/marketplace/`) e não estratégia de produto (isso é `docs/product/`). Esta pasta contém como o ParaguAI se apresenta, negocia e formaliza parcerias de dado com merchants e outras fontes externas.

## Propósito

Dar um lar único ao processo de desenvolvimento de negócio: quem já foi contatado, em que estágio está, o que oferecemos, o que pedimos, e os materiais prontos para negociar (proposta, e-mail institucional). Documentos aqui respondem "como o ParaguAI se relaciona comercialmente com o mundo externo?" — nunca "o que uma loja específica usa de tecnologia" (isso é `marketplace/`) nem "o que o produto ParaguAI faz" (isso é `product/`).

## Documentos desta pasta

| Documento | Responde |
|---|---|
| `MERCHANT_PARTNERSHIP_PROGRAM.md` | O que é o programa oficial de parcerias — tiers, benefícios, requisitos, fluxo de onboarding, formatos de integração suportados |
| `TIER1_PARTNERS.md` | Em que estágio está a negociação com cada um dos 10 merchants Tier 1 |
| `PARTNERSHIP_PROPOSAL.md` | Template de proposta comercial pronta para envio (PT/ES/EN) |
| `PARTNERSHIP_EMAIL_TEMPLATE.md` | Template de e-mail institucional de primeiro contato (PT/ES/EN) |

## Quando criar um novo documento aqui

Ao formalizar um novo tipo de parceria comercial (ex.: parceria de mídia, acordo de dado com uma fonte não-merchant) ou ao expandir o pipeline de negociação para um novo lote de lojas (Tier 2, Tier 3). Novos documentos aqui não exigem nova ADR de categoria (a categoria já existe, ADR-049).

## Quando não criar

- Para auditoria técnica de uma loja (robots.txt, sitemap, moeda) → `docs/marketplace/Tier1_Merchants.md`
- Para o padrão de código de integração de um Connector → `docs/engineering/CONNECTOR_GUIDE.md`
- Para uma decisão estrutural sobre o programa de parceria em si → `docs/operations/DECISIONS.md` (ADR)
- Para o roadmap de expansão de lojas → `docs/product/releases/RELEASE_1_8_BLUEPRINT.md` / `docs/product/ROADMAP_1_8.md`

## Convenção

`TIER1_PARTNERS.md` referencia `Certification Status`/`Integration Strategy` de `docs/marketplace/Tier1_Merchants.md` **por nome, nunca duplicando o valor** — uma tabela lê a outra. Estado de negociação (`Partner Status`, `Current Stage`, datas de contato) muda com frequência; mantenha-o atualizado a cada interação real, nunca projetado ou otimista. Nenhum material de e-mail/proposta menciona scraping, bots ou Cloudflare — o ParaguAI se apresenta pela parceria e pelo valor de dado, nunca pela dificuldade técnica de não ter acesso.
