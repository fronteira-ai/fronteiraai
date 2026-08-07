# ENGINEERING_TIMELINE.md

**Categoria**: `docs/architecture/`
**Propósito**: linha do tempo da Engenharia v1, do primeiro programa de identidade de produto ao encerramento formal do núcleo arquitetural.

| Programa | Missão(ões) | Entrega |
|---|---|---|
| **Κ** | Κ-1 a Κ-5 | Universal Taxonomy discovery e engine, Product Signature, integração real ao Product Identity Engine, encerramento formal certificado pelo CTO |
| **Π** | Π-1 | Product Identity V2 (manufacturerCode), Knowledge Graph |
| **Ω** | Ω-1 a Ω-4 | Marketplace Memory (schema, backfill, validação de sombra), Read-Through integrado ao Product Identity, rollout controlado real em produção (0→100%, 141.434 leituras reais, 0 Parity Errors) |
| **Λ** | Λ-1 | Marketplace Impact Audit — primeira medição honesta de que a infraestrutura correta não move CPC sozinha |
| **Μ** | Μ-1 | Comparable Coverage Root Cause Analysis — waterfall completo dos 17.987 produtos não-comparáveis; achado da inversão intra-loja/cross-loja na fila de merge |
| **Ν** | Ν-1 | Unknown Match Analysis — replay real do motor contra 5.642 produtos, bucket "Outros" 100% explicado |
| **Ο** | Ο-1 | Comparable Coverage Expansion Strategy — estratégia de crescimento fundamentada em taxas de overlap reais por categoria |
| **ΩΩ** | ΩΩ-1 | Final Architecture Validation — revisão completa por Architecture Review Board, parecer B) ARCHITECTURE CONDITIONALLY APPROVED, 5 riscos nomeados |
| **ΩΩ** | ΩΩ-2 | Engineering Sign-Off — revalidação rigorosa dos 5 riscos, nenhum bloqueante, parecer B) ENGINEERING APPROVED WITH MONITORING |
| **ΩΩ** | ΩΩ-3 | Engineering Closure — encerramento formal, Architecture v1.0, transição para a Era Marketplace |

## Marcos quantitativos da sequência

- Testes automatizados: 716/716 passando, 111 suítes, verde em toda a sequência
- Merge executions reais: 27 (+1 rollback bem-sucedido)
- Leituras reais de Marketplace Memory validadas: 141.434, 0 Parity Errors
- Comparable Product Coverage no encerramento: 0,08% (14/18.001), com teto de curto prazo mapeado em 0,45% (69/18.001) sem nenhum produto novo
- Domínios de código: 19, auditados quanto a acoplamento e direção de dependência em ΩΩ-1

## O que este documento não é

Não é um roadmap. Não descreve trabalho futuro — ver `ROADMAP.md` para a Era Marketplace. É um registro histórico do que já foi entregue e validado.
