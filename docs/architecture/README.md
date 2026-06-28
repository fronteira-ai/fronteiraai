# docs/architecture/

Documentação da arquitetura técnica real do ParaguAI. Esta pasta descreve como o projeto está organizado *agora* — não como foi planejado nem como deveria ser, mas como o código realmente funciona após cada Release.

## Propósito

Garantir que qualquer desenvolvedor (humano ou IA) possa entender a estrutura técnica do projeto sem precisar ler o código inteiro. Documentação aqui é um espelho do código: se diverge, o código prevalece e o documento deve ser corrigido.

## Documentos desta pasta

| Documento | Atualiza quando |
|---|---|
| `ARCHITECTURE.md` | Nova rota, serviço, padrão ou estrutura de pasta adicionada |
| `DOMAIN_MODEL.md` | Mudança de schema, tipo novo ou relação nova no banco |
| `COMPONENT_INDEX.md` | Componente criado, removido ou renomeado |
| `API_CONTRACTS.md` | Service novo, função nova ou contrato alterado |
| `DEPENDENCY_GRAPH.md` | Novo import entre camadas ou dependência nova |

## Quando criar um novo documento aqui

Quando surgir um aspecto estrutural suficientemente amplo para não caber em nenhum dos 5 documentos existentes. Exemplos válidos: `SECURITY_MODEL.md` (quando auth for implementada), `CACHE_STRATEGY.md` (quando caching complexo for adicionado). Criar novos documentos requer ADR em `operations/DECISIONS.md`.

## Quando não criar

- Para registrar uma decisão pontual → `operations/DECISIONS.md` (ADR)
- Para listar componentes → adicionar seção em `COMPONENT_INDEX.md`
- Para documentar um service específico → adicionar seção em `API_CONTRACTS.md`
- Para filosofia de como construir → `foundation/ENGINEERING_PRINCIPLES.md`

## Convenção

Todos os documentos aqui descrevem estado real, gerado por leitura do código. Nunca descrever intenções como fatos. Usar ✅ (implementado), 🔄 (em desenvolvimento), ⏳ (planejado) para distinguir estado.
