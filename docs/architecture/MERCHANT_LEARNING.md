# MERCHANT_LEARNING.md
# Program Ξ (Xi) — Mission Ξ-2 — Marketplace Learning Engine

**Categoria**: `docs/architecture/`
**Criado**: 2026-07-16
**Metodologia**: amostras reais (300 produtos por loja, `specifications` reais de `products`), não hipotéticas — os 4 merchants nomeados no brief, medidos diretamente.

---

## Objetivo 5 — os padrões reais medidos, um por um

### Mega Eletrônicos — escreve capacidade (e modelo, e cor) via chave estruturada, Português, CAIXA ALTA

Amostra real: `MODELO="MF-07"`, `MODELO="Grow:Turn 3D Volume"` · `MEMÓRIA INTERNA="1TB"`, `CAPACIDADE="591ml (20 oz)"`, `ARMAZENAMENTO="Compatível com cartão de memória SD..."` (3 chaves diferentes para o mesmo conceito, inconsistente mesmo dentro da própria loja) · `COR="Branco/Dourado"`, `COR="Preta"`.

**Padrão aprendível**: chaves em CAIXA ALTA, português, mas o conceito "capacidade" já varia entre 3 grafias na mesma loja — a Memória por merchant precisaria registrar as 3 como sinônimos LOCAIS, não assumir que "capacidade" tem uma única chave por loja.

### Mobile Zone — escreve via chave estruturada, Espanhol, Title Case

Amostra real: `Modelo="MHJE3CI/A"`, `Modelo="OT-5530"` · `Capacidad de almacenamiento="256GB"`, `Capacidad="8000 mAh"` (mesma chave "Capacidad" usada tanto para armazenamento quanto para bateria — ambíguo, um humano teria que desambiguar por contexto de categoria) · `Color="White"`, `Color="Blanco"`, `Color="Black"` (mistura inglês/espanhol nos VALORES, não só nas chaves).

**Padrão aprendível**: chaves em Title Case, espanhol — mas "Capacidad" sozinha é ambígua sem o contexto de categoria do produto (bateria vs. armazenamento). Memória por merchant precisaria ser por (merchant, categoria), não só por merchant.

### Shopping China — não usa chaves estruturadas para nenhum dos 3 conceitos

Amostra real (300 produtos): zero ocorrência de chave de modelo, capacidade, ou cor. Tudo embutido no título: `"AURICULAR INALÁMBRICO JBL TUNE 520BT NEGRO"` — cor ("NEGRO") é um sufixo do título, maiúsculas, espanhol.

**Padrão aprendível**: não é um padrão de CHAVE — é um padrão de POSIÇÃO no título (cor tende a ser o último token). Este merchant exigiria um extrator de padrão de título, não de chave de especificação — categoria de aprendizado diferente dos outros 3.

### Roma Shopping — mesmo padrão de Shopping China, mas com um sinal extra real

Amostra real: `"Smartphone realme C71 RMX5303 Dual SIM 8GB+256GB 6.67″ – White Swan BR 631011005954"`. Zero chaves estruturadas — mas o título carrega um código de 12 dígitos no final (`631011005954`), com formato consistente com EAN-13 (faltando 1 dígito verificador, ou truncado). **Achado não previsto pelo brief, real**: isso não foi capturado pela auditoria de identificadores de Mission Π-1 (que só olhou chaves de `specifications`, nunca títulos) — um sinal de código de barras pode estar escondido em títulos da Roma Shopping, não medido em profundidade aqui (fora do escopo desta Mission), nomeado para investigação futura.

## Por que isso deveria ser aprendido uma única vez (Objetivo 5, resposta direta)

Cada um dos 4 padrões acima é **determinístico por merchant** — Mega sempre escreve "MODELO" em caixa alta (ou uma de suas 3 variantes de capacidade), Mobile Zone sempre escreve "Modelo" em Title Case. Hoje, `ATTRIBUTE_KEY_ALIASES` (Κ-3) já mapeia esses casos — mas como uma lista GLOBAL fixa, escrita manualmente uma vez, nunca atualizada automaticamente quando um merchant novo aparece com uma convenção diferente das já mapeadas. A Memória por merchant (`MARKETPLACE_LEARNING_ENGINE.md` §3, Learning Repository) proposta aqui persistiria, por `store_id`, qual variante de chave aquele merchant específico usa para cada conceito — aprendida da primeira vez que aparece, nunca reinferida.
