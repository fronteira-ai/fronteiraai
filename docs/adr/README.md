# docs/adr/

Pasta reservada para Architectural Decision Records individuais. Futura home de cada ADR como arquivo próprio.

## Estado atual

Os ADRs (ADR-001 a ADR-039+) estão atualmente consolidados em um único arquivo: `docs/operations/DECISIONS.md`.

Esta pasta será populada quando os ADRs migrarem para arquivos individuais no formato `ADR-XXX-titulo.md`. Essa migração será feita em um Release específico com ADR correspondente documentando a transição.

## Formato futuro

```
docs/adr/
├── ADR-001-env-unica-fonte.md
├── ADR-002-...
└── ...
```

## Por que manter a pasta agora

A estrutura do Knowledge System é definida de forma completa e permanente, mesmo que alguns contêineres estejam vazios hoje. Criar a pasta agora sinaliza a intenção e reserva o espaço na hierarquia, evitando que ADRs futuros sejam colocados em locais incorretos.

## Quando criar arquivos aqui

Não criar arquivos individuais de ADR aqui até a migração formal ser decidida e documentada. Por enquanto, todos os ADRs novos vão para `docs/operations/DECISIONS.md` como sempre.
