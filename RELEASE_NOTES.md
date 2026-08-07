# Release Notes — Architecture v1.0

**Data**: 2026-07-17

## Resumo

Encerramento formal da Engenharia v1 do ParaguAI. Após os Programas Κ, Π, Ω, Λ, Μ, Ν e Ο, o Architecture Review Board (Program ΩΩ) conduziu uma revisão completa do núcleo arquitetural e concluiu que nenhuma falha estrutural existe capaz de impedir o crescimento do marketplace na escala de negócio evidenciada.

## Arquitetura

19 domínios (`src/domains/`), camadas com direção de dependência auditada e confirmada correta (uma exceção de baixo risco documentada: import de tipo entre marketplace-memory e product-intelligence). Índices e RLS auditados diretamente contra o schema real — cobertura completa de RLS confirmada, um gap real de índice identificado (`merge_candidates.target_canonical_product_id`, severidade Low, isolado).

## Validação

- 716/716 testes automatizados passando, 111 suítes
- Marketplace Memory: 0 Parity Errors em 141.434 leituras reais de produção, rollout completo 0→100% executado e medido
- Product Identity: 0 casos de falha algorítmica encontrados em replay real de 5.642 produtos (Ν-1)
- Merge Engine: 27 execuções reais, 1 rollback bem-sucedido, Shadow Mode nunca violado

## Constituição

`docs/engineering/ENGINEERING_CONSTITUTION.md` entra em vigor — princípios permanentes, componentes congelados e critérios de reabertura, todos derivados de decisões já tomadas e evidenciadas nos Programas Κ-ΩΩ, nenhum princípio novo criado.

## Próxima fase

Era Marketplace v2. Todo investimento subsequente é de negócio — Marketplace Operations, Merchant Success, Catalog Expansion, Growth, Analytics, Revenue — ver `ROADMAP.md`. O achado central que orienta essa fase: o gargalo do ParaguAI deixou de ser algoritmo ou infraestrutura; é composição de catálogo (Λ-1, confirmado por Μ-1, Ν-1 e Ο-1).

---

**Certificado completo**: `docs/architecture/ARCHITECTURE_CERTIFICATE.md`
