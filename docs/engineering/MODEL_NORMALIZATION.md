# MODEL_NORMALIZATION.md
# Program Κ — Mission Κ-2 — Objetivo 5 ("maior missão", per o mandato)

**Categoria**: `docs/engineering/`
**Criado**: 2026-07-15

---

## 1. Por que este é o objetivo mais difícil

`ProductIdentityEngine` não tem um campo de modelo dedicado — o fator `model-number` extrai tokens alfanuméricos direto do texto do nome (`src/domains/product-identity/domain/ProductIdentityEngine.ts`, `offerModelTokens = offerTokens.filter(token => /\d/.test(token))`), confirmado por leitura direta do código, não suposição. Normalizar "modelo" universalmente para 852 marcas exigiria uma gramática de parsing por marca — o mandato já nomeia isso como "a maior missão" e esta Mission trata como tal: **incremental, grounded, nunca uma alegação de cobertura total.**

## 2. O que foi medido antes de escrever qualquer regra

`scripts/kappa2-model-variance-sample.ts` (read-only) amostrou nomes reais das 5 marcas com mais `canonical_products` — Outros(149)/Hasbro(55)/Cuisinart(48)/Apple(42)/Jbl(29). Exemplos reais de variância de modelo confirmados em produção:

```
Apple iPhone 17 Pro Max A3257 eSIM 1TB 12GB RAM de 6.9" 48+48+48MP 18MP - Silver (CX Feia S Lacre)
Apple iPhone 17 A3519 eSIM 256GB 8GB RAM de 6.3" 48+48MP 18MP - Mist Blue (Caixa Feia S Lacre)
Apple iPhone 17e A3575 LL 256GB eSIM Tela 6.1" - Branco
MacBook Air M3 13" 256GB
Apple Watch SE 3rd Generation 44 mm M L MEPJ4LW A3328 GPS + Celular - Midnight Aluminum
```

```
Speaker JBL Flip 7 Bluetooth 35W RMS IP68 – Preto JBLFLIP7BLKAM
Fone de Ouvido JBL Tune 730BT Lifestyle ANC Bluetooth – Azul JBLT730BTBLUAM
```

## 3. O que foi construído (escopo real, não a dictionary completa)

`normalizeAppleModelToken(rawName)` (`src/domains/taxonomy/data/model-normalization.ts`) — parser regex para 4 famílias Apple (iPhone/MacBook/iPad/Apple Watch), a marca de maior volume com nomenclatura mais previsível. Exemplo:

```
"iPhone 16 Pro 256GB Titânio Preto"                       → IPHONE_16_PRO
"Apple iPhone 17 Pro Max A3257 eSIM 1TB"                   → IPHONE_17_PRO_MAX
"Apple iPhone 17e A3575 LL 256GB"                          → IPHONE_17E
"MacBook Air M3 13\" 256GB"                                 → MACBOOK_AIR_M3
```

8 entradas seedadas em `KNOWN_MODEL_ALIASES`, cada `rawToken` um fragmento literal observado em produção — nenhuma inventada.

## 4. O que a medição real mostrou

O mandato ilustra "iPhone16Pro / IP16PRO / 16 PRO / Apple 16 Pro / A3293" como se fossem grafias caóticas coexistindo no catálogo. **A medição real não confirma esse cenário**: os nomes reais de produto (`canonical_products.name`) já seguem um padrão de escrita razoavelmente consistente por conector (frase completa "Apple iPhone 17 Pro Max A3257..."), porque vêm direto da página do produto, não de digitação manual variável. A variância real está em **quais tokens aparecem** (código de peça `A3257` vs. ausência dele, presença de "eSIM"/"S Lacre"/observações de condição), não em formas caóticas do mesmo modelo. Isso é reportado honestamente — o problema real de normalização de modelo é mais sutil (separar sinal de modelo de ruído de condição/observação) do que o exemplo do brief sugeria, não mais simples.

## 5. Como isso se conecta ao Engine sem alterá-lo

`ProductIdentityEngine`'s fator `specifications` já pontua no peso máximo quando duas ofertas compartilham exatamente a mesma chave/valor (`specOverlap`, comparação exata). Se um `canonical_products.specifications.model` canônico (ex.: `IPHONE_17_PRO_MAX`) fosse populado em ambos os lados de um par cross-merchant, o fator `specifications` já pontuaria isso automaticamente — **sem nenhuma mudança no Engine**. Essa é a única forma prevista de o Model Normalization eventualmente ajudar o matching: alimentar um campo que o Engine já sabe ler, nunca ensinar o Engine a ler um campo novo.

## 6. Limitação honesta

Cobertura hoje: 2 famílias de marca (Apple parcialmente, JBL apenas amostrado, sem parser ainda). Estender para as 852 marcas é trabalho incremental futuro, fora do escopo desta Mission — construir isso de uma vez seria "assumir", não "medir".

## Fontes

`scripts/kappa2-model-variance-sample.ts`, `src/domains/product-identity/domain/ProductIdentityEngine.ts`, `src/domains/taxonomy/data/model-normalization.ts`.
