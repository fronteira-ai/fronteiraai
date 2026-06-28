# MASTER_ROADMAP.md

Roadmap estratégico de longo prazo do ParaguAI. Documenta a visão macro de fases, marcos e direção. Para o histórico detalhado de cada Release, ver `docs/operations/CHANGELOG.md`. Para próximos passos imediatos, ver `docs/operations/NEXT_STEPS.md`.

Última atualização: 2026-06-27

---

## Foundation Documents

Documentos permanentes que governam todas as decisões de desenvolvimento.

| Documento | Prioridade | Descrição |
|---|---|---|
| `docs/foundation/AI_CONSTITUTION.md` | 1 — Primeiro a ler | Princípios permanentes: identidade, missão, visão, filosofia, regras, processo |
| `docs/foundation/NORTH_STAR.md` | 2 — Consultar diariamente | Bússola operacional: como decidir, 10 filtros, framework de priorização, checklist final |
| `docs/foundation/BUSINESS_MODEL.md` | 3 — Consultar para estratégia | Como criamos e capturamos valor: flywheel, monetização, moat, network effects |
| `docs/foundation/VISION_2035.md` | 4 — Consultar para alinhamento de visão | Para onde vamos: ecossistema maduro, legado, transformação regional |
| `docs/foundation/ENGINEERING_PRINCIPLES.md` | 5 — Consultar para decisões arquiteturais | Como construímos: filosofia técnica permanente, 12 princípios invioláveis |
| `docs/foundation/PRODUCT_PRINCIPLES.md` | 6 — Consultar para decisões de produto e UX | Como construímos produtos: decisões > cliques, simplicidade radical, confiança, neutralidade, ecossistema |
| `docs/foundation/DECISION_FILTER.md` | 7 — Executar antes de qualquer iniciativa significativa | Como aprovamos decisões: pipeline de 10 estágios, 12 filtros permanentes, checklist obrigatório |
| `docs/foundation/RELEASE_STRATEGY.md` | 8 — Executar antes de iniciar e antes de entregar qualquer Release | Como o ParaguAI evolui: ciclo de 11 estágios, 10 tipos de Release, DoR, DoD, Quality Gates, compounding |
| `docs/operations/DECISIONS.md` | 9 | Registro de decisões arquiteturais (ADR-001 a ADR-039+) |
| `CLAUDE.md` | 10 | Instruções operacionais de desenvolvimento |
| `docs/architecture/ARCHITECTURE.md` | 11 | Estado real da arquitetura |
| `docs/operations/PROJECT_STATUS.md` | 12 | Estado real do projeto |

---

## Fase 1 — Discovery Platform (Releases 0.1–1.0)

**Objetivo**: plataforma de descoberta e comparação de preços funcional, com dados reais, SEO, e portal de lojistas.

**Status**: ✅ Completo (Release 1.4 entregue em 2026-06-27)

Marcos:
- ✅ Catálogo de produtos, lojas, marcas e categorias (Releases 0.2–0.5)
- ✅ Motor de busca integrado ao Supabase (Release 0.4)
- ✅ Compare Engine — comparação de preços entre lojas (Release 0.5)
- ✅ RLS pública — catálogo visível para usuários anônimos (Release 0.6, ADR-019)
- ✅ SEO, imagens, PWA, analytics, segurança (Releases 0.7–0.8)
- ✅ Acquisition Engine — pipeline universal de importação (Release 0.9)
- ✅ Admin Platform — painel de operações (Release 1.0)
- ✅ First Live Connector — Shopping China integrada (Release 1.1)
- ✅ Merchant OS — portal self-service para lojistas (Release 1.2)
- ✅ Dashboard Consultivo — score, missões, recomendações (Release 1.3)
- ✅ Merchant Growth Platform — /lojas, /lojas/[slug], Progress Engine (Release 1.4)

---

## Fase 2 — Trust & Reputation (Releases 1.5–2.0)

**Objetivo**: construir camada de confiança verificável — reviews de compradores, analytics de merchants, expansão de catálogo.

**Status**: Planejado

Marcos prioritários:
- Sistema de reviews de compradores (tabela `reviews`, moderação, ADR-038)
- Analytics dashboard para merchants com dados reais (ADR-039)
- Migration 0013 aplicada (`profiles_role_check`)
- `/merchant/settings` com salvamento de WhatsApp/phone/website
- Expansão do catálogo via novos conectores (Nissei, Cellshop, Mega Eletrônicos, Atacado Games)
- Buscas com filtros avançados e autocomplete
- Price History visível para compradores (`/product/[slug]` com gráfico)

---

## Fase 3 — Intelligence Layer (Releases 2.0–3.0)

**Objetivo**: transformar dados acumulados em inteligência — recomendações, alertas, predição de preço.

**Status**: Visão (não iniciado)

Marcos:
- Alertas de preço para usuários autenticados
- Recomendações personalizadas baseadas em histórico de busca/favoritos
- Predição de tendência de preço ("preço tende a subir/cair")
- ParaguAI Brain v1 — busca semântica em linguagem natural
- Ranking de ofertas inteligente (ADR-014 implementado)

---

## Fase 4 — Scale & Expansion (Releases 3.0–5.0)

**Objetivo**: escala para todo o Paraguai, apps mobile, API pública, expansão regional.

**Status**: Visão (não iniciado)

Marcos:
- App mobile nativo (iOS + Android)
- Expansão para Assunção e outros centros do Paraguai
- API pública para parceiros e integradores
- Marketplace multi-vendedor com transações
- Expansão para Brasil e Argentina
- Enterprise Platform — B2B e inteligência de mercado

---

## Princípios que guiam o roadmap

1. **Densidade antes de expansão.** Ciudad del Este precisa ter efeito de rede funcional antes de expandir geográficamente.
2. **Dados antes de inteligência.** Modelos de recomendação só são úteis quando o catálogo tem volume e qualidade suficientes.
3. **Fundação antes de features.** Cada fase consolida a anterior antes de construir a próxima.
4. **Merchants antes de compradores.** A plataforma cresce pelo lado da oferta — mais lojas → mais produtos → mais valor para compradores.

Ver `docs/foundation/AI_CONSTITUTION.md` para os princípios permanentes completos.
