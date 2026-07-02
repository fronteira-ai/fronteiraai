# PRODUCT_POLICY.md
# Decisões de Produto Já Aprovadas — ParaguAI

**Versão**: 1.0
**Criado**: 2026-07-02 (Sprint Zero — Release 1.8 Project Preparation & Foundation Consolidation, mandato do CTO)
**Status**: PERMANENTE — não modifique sem aprovação explícita do CTO
**Hierarquia**: Subordinado à Foundation (`AI_CONSTITUTION.md`, `NORTH_STAR.md`, `BUSINESS_MODEL.md`) e a `PRODUCT_PRINCIPLES.md`. Superior a qualquer decisão operacional de feature específica — nenhuma Wave pode contradizer uma política registrada aqui sem um ADR revisando esta política explicitamente.

---

## Propósito

Este documento existe porque decisões de produto já aprovadas, quando não registradas num único lugar autoritativo, são re-litigadas — cada nova Wave reabre a mesma pergunta que uma Wave anterior já respondeu, gastando tempo estratégico em coisas já decididas. Toda política aqui foi aprovada pelo CTO em algum momento entre a Foundation original e o Release 1.8; este documento não cria política nova — consolida o que já existia espalhado em ADRs, Blueprints e mandatos de execução, para que seja consultável sem precisar reconstruir o histórico.

Uma política aqui só muda com uma revisão explícita, documentada, do CTO — nunca por inferência de uma decisão de feature isolada.

---

## Catálogo e Acesso

**O catálogo público nunca será limitado.** Todo produto, oferta e loja publicados são visíveis a qualquer visitante, autenticado ou não, independentemente do plano do lojista que os publicou. Restringir catálogo por plano contradiria a missão central (`AI_CONSTITUTION.md` II — eliminar assimetria de informação) e o Anti-Goal permanente contra privilegiar quem paga mais sobre relevância (`NORTH_STAR.md` §11).

**O plano Free limita funcionalidades, nunca produtos publicados.** Um lojista no plano gratuito pode publicar catálogo completo — o que o plano paga é capacidade operacional (analytics, automação, conectores, destaque), nunca visibilidade básica de catálogo. Consistente com `BUSINESS_MODEL.md` §6: "o plano gratuito oferece valor real... porque lojistas sem valor demonstrável não convertem para pago."

---

## Moeda e Câmbio

**Os planos de merchant serão cobrados em USD.** Decisão de estabilidade — preços em moeda local (PYG/BRL) sofreriam variação cambial que complicaria previsibilidade de receita e cobrança, especialmente considerando que compradores atravessam de múltiplos países com moedas diferentes.

**O ParaguAI exibe USD e BRL simultaneamente** em toda superfície de preço voltada ao comprador — nunca uma moeda escondendo a outra.

**Conversão é automática, nunca manual.** Nenhuma tela pede ao comprador para escolher/converter moeda — a conversão acontece antes de qualquer exibição.

**O câmbio é atualizado continuamente**, nunca em ciclo diário — ver `RELEASE_1_8_BLUEPRINT.md` Capítulo 3 (Exchange Engine) e ADR-043 (fornecedor, cadência de 5 minutos). O preço original e a moeda original nunca são sobrescritos por uma conversão — a conversão é sempre um valor derivado, auditável, com a cotação usada registrada.

---

## Atualização de Preço e Freshness

**O Live Pricing Engine é um diferencial estratégico**, não uma otimização de performance — atualização diária de preço é estruturalmente incompatível com a missão de eliminar assimetria de informação (`RELEASE_1_8_BLUEPRINT.md` Capítulo 2). Produtos populares atualizam em minutos, não horas.

**O Freshness Score é exibido ao comprador**, sempre honestamente — uma oferta desatualizada é rotulada como tal, nunca escondida ou apresentada como recente quando não é (`RELEASE_1_8_BLUEPRINT.md` Capítulo 4; princípio derivado de `AI_CONSTITUTION.md` V, "Estado honesto, sempre").

---

## Fronteira e Identidade de Marca

**A Home possui um bloco "Fronteira Agora"** — a Home deixa de ser apenas uma porta de entrada de busca de catálogo e passa a comunicar a proposta de valor de "inteligência da fronteira" desde o primeiro contato (`RELEASE_1_8_BLUEPRINT.md` Capítulo 9).

**O ParaguAI é o Marketplace Inteligente da Fronteira** — não um comparador de preços genérico. Todo posicionamento de produto, SEO e comunicação reflete essa identidade, consistente com a transformação de estágio já descrita em `VISION_2035.md` Capítulo 3 (Comparador de Preços → Ecossistema de Comércio).

---

## Monetização e Conversão de Lojistas

**O objetivo principal continua sendo converter lojistas Premium** — toda decisão de priorização de Release, quando em conflito, favorece o que aumenta conversão Premium sustentável (não vaidosa) sobre o que não a afeta.

**Valor antes da cobrança, sempre.** Nenhum gatilho de upgrade aparece antes de o lojista já ter recebido e sentido valor real e demonstrado (não prometido) — `RELEASE_1_8_BLUEPRINT.md` Capítulo 8. Um gatilho nasce de um limite atingido ou de um insight já visível mas bloqueado, nunca de um push genérico.

**Nenhuma funcionalidade poderá reduzir a conversão de lojistas.** Qualquer proposta de feature que crie fricção adicional no funil de aquisição/claim/upgrade de lojista sem benefício compensatório claro deve ser rejeitada ou redesenhada antes de entrar em uma Wave.

---

## Identidade de Comprador e Privacidade

**O Buyer Domain é independente** — nunca reaproveita `profiles` (identidade de staff/operator/merchant, ADR-031) nem referencia `auth.users` diretamente fora do próprio domínio. Decisão definitiva, ADR-045/ADR-046 (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md`).

**O Brain nunca armazenará PII.** O pipeline de ingestão do Brain só recebe identificadores pseudônimos (`buyer_id`, o UUID do aggregate root) — nunca e-mail, nome ou telefone. A separação é arquitetural (controlada por RLS), não uma política que depende de disciplina de código (`RELEASE_1_8_BUYER_IDENTITY_MODEL.md` §8, mesmo princípio de `SUPABASE_SERVICE_ROLE_KEY` nunca alcançar o browser).

**LGPD é cumprida por anonimização, nunca por hard delete.** O direito ao apagamento é honrado sobrescrevendo dado pessoal identificável (e-mail, nome, telefone) enquanto o identificador (`buyer_id`) e o sinal comportamental agregado que ele acumulou permanecem — preservando `C-6 Buyer Behavioral Knowledge` como patrimônio, sem violar conformidade (ADR-045, ADR-046).

---

## Princípio Geral de Priorização

**Toda funcionalidade deverá fortalecer compradores, lojistas ou patrimônio estratégico** — pelo menos um dos três pilares (`RELEASE_1_8_BLUEPRINT.md`, Princípio do mandato do CTO). Se uma funcionalidade proposta não fortalece nenhum dos três, ela não pertence ao Release 1.8, independentemente de quão interessante seja tecnicamente — mesma disciplina de `NORTH_STAR.md` §7 ("o que nunca deve ser prioridade").

---

## Como este documento é usado

Antes de aprovar qualquer feature de uma Wave, verificar se ela contradiz alguma política acima. Contradição não é automaticamente um veto — mas exige uma revisão explícita e documentada desta política pelo CTO antes de a feature avançar, nunca uma exceção silenciosa. Este documento é consultado no mesmo momento do fluxo que `NORTH_STAR.md` — antes de iniciar qualquer nova implementação, antes de aprovar um PR, antes de planejar uma Wave.
