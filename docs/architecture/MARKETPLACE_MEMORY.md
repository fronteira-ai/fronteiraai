# MARKETPLACE_MEMORY.md
# Program Ξ (Xi) — Mission Ξ-1 — Autonomous Marketplace Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Status**: Proposta arquitetural pura. Zero código, zero migration. Descreve O QUE deveria ser lembrado permanentemente e POR QUÊ — não como implementar.

---

## 1. Princípio

Marketplace Memory não é um domínio novo, não é uma IA, não é um algoritmo — é a decisão de **persistir a saída de funções que já existem e já são determinísticas**, em vez de recomputá-las a cada leitura. Toda função candidata a alimentar essa memória (`buildProductSignature`, `extractManufacturerCode`, `findNodeByRealCategorySlug`, `normalizeBrandName`) já é pura, sem I/O, sem estado — a única mudança conceitual é: computar uma vez, guardar o resultado, reutilizar.

## 2. O que deveria ser lembrado para sempre (Objetivo 2)

| Fato | Fonte real hoje | Por que merece memória permanente |
|---|---|---|
| Manufacturer Code | `extractManufacturerCode(name)` — 53,63% de yield medido (Mission Π-1) | Recalculado do zero a cada sincronização sobre o mesmo texto — o achado central de `AUTONOMOUS_MARKETPLACE.md` §1 |
| Modelo | `ProductSignature.model` — 3,18% de yield medido | Mesmo padrão |
| Família / Linha | ❌ Não existe hoje (gap nomeado em `PRODUCT_KNOWLEDGE_GRAPH.md`, Mission Π-1) | Não pode ser lembrado porque nunca foi calculado — pré-requisito é modelar o conceito primeiro, fora do escopo desta Mission |
| Categoria (Universal Taxonomy) | `findNodeByRealCategorySlug()` — já wired em produção (Program Κ-4) | Já reexecutado a cada `suggestMergesFor` — mesmo padrão de recomputação desnecessária |
| Marca (normalizada) | `normalizeBrandName()` — construída (Κ-2), não wired (decisão de Κ-5: impacto real medido em 0 cross-merchant) | Baixa prioridade de memória — o dado bruto (`brand_id`) já é 100% estruturado, normalização só ajudaria os ~0,16% de casos de duplicata de marca já medidos |
| Relacionamentos (equivalente, sucessor, compatível) | ❌ Não existe hoje (gap nomeado em `PRODUCT_KNOWLEDGE_GRAPH.md` §4) | Mesma razão de Família/Linha — não há o que lembrar do que nunca foi calculado |
| Produtos equivalentes | Implícito em `merge_candidates.status='merged'` — já é um registro permanente (Program Ω) | **Já existe** — `merge_executions` é append-only, nunca apagado, é literalmente memória permanente de decisões de identidade já tomadas |
| Lojas confiáveis | `Trust` domain (Release 1.5+) — já existe, com histórico de eventos | **Já existe** — não é um gap desta Mission, é infraestrutura já madura, só não citada nas Missions recentes por não ser o gargalo |
| Padrões recorrentes (ex.: "para a Loja X, a chave 'COR' sempre significa cor") | ❌ Não existe — `ATTRIBUTE_KEY_ALIASES` é global, estático, o mesmo para todo merchant | **Gap real, de maior alavancagem que parece à primeira vista** — cada novo merchant hoje começa do zero na extração, mesmo que sua nomenclatura seja previsível desde a primeira sincronização |

## 3. Forma conceitual da memória (sem schema, sem migration)

Três categorias distintas de fato, cada uma com uma vida útil diferente:

1. **Fatos por produto** (manufacturerCode, model, atributos extraídos) — válidos enquanto o `products.name`/`specifications` de origem não mudar. Invalidação natural: mesma lógica que `CanonicalProductService.diffFromProduct` já usa para detectar drift (Κ-4) — se o dado de origem não mudou, o fato computado também não muda, então recomputar é sempre desperdício, nunca correção.
2. **Fatos por marca+identificador** (agrupamento — a mesma chave que a simulação de Mission Π-1 usou: `brand_id + manufacturerCode`) — cresce conforme mais produtos são vistos, nunca precisa ser recalculado do zero, só incrementado.
3. **Fatos por merchant** (padrões de chave de especificação observados) — a memória mais nova conceitualmente aqui; hoje simplesmente não existe, nem como ideia.

## 4. Por que isso não é uma migration ainda

Esta Mission não cria schema. A forma mais simples de "memória permanente" para a categoria 1 já existe parcialmente: `canonical_products.specifications` já é persistido — o gap não é armazenamento, é que o RESULTADO da extração (o `ProductSignature` inteiro, não o dado bruto) nunca é persistido, só recalculado. Uma Mission futura decidiria entre uma coluna nova (`canonical_products.extracted_signature jsonb`) ou uma tabela dedicada — decisão de schema fora do escopo "exclusivamente arquitetural" desta Mission.
