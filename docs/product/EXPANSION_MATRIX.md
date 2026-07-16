# EXPANSION_MATRIX.md
# Program Ψ (Psi) — Mission Ψ-1 — Marketplace Dominance

**Categoria**: `docs/product/`
**Criado**: 2026-07-16
**Metodologia**: Merchant Opportunity Matrix e Comparable Opportunity Matrix medidas por uma verificação pontual read-only reaproveitando `CanonicalMergeSuggestionService` real (Program Κ, Mission Κ-4, inalterado) sobre os 17.991 canonical_products ativos — mesma disciplina "código real, dado real, zero escrita em produção" já estabelecida. Universo de merchants (10 Tier 1) e status comercial (`Not Contacted` etc.) citados de `docs/business/TIER1_PARTNERS.md` e `docs/marketplace/Tier1_Merchants.md`, não remedidos.

---

## 1. Merchant Opportunity Matrix (Objetivo 2)

### Merchants conectados (dado real de catálogo)

| Merchant | Ofertas reais | Produtos que ganham comparação cross-merchant (medido) | Categoria | Confiança do connector |
|---|---:|---:|---|---|
| atacado-connect | 1.552 | **106** | Informática/Eletrônicos | Certificado |
| mega-eletronicos | 5.245 | **82** | Eletrônicos | Certificado |
| mobile-zone | 7.204 (maior catálogo) | **48** | Eletrônicos/Celulares | Certificado |
| roma-shopping | 1.564 | **24** | Geral (7 departamentos) | Certificado |
| shopping-china | 2.446 | **2** | Importados/Geral | Em progresso (não recertificado) |
| nissei | 2 | 0 (amostra insuficiente) | Informática/Eletrodomésticos | Amostra, não sincronizado |
| cellshop | 2 | 0 (amostra insuficiente) | Eletrônicos/Celulares | Amostra, não sincronizado |

**Achado real, não esperado**: `atacado-connect`, não o maior catálogo (`mobile-zone`, 7.204 ofertas), é quem mais contribui para comparabilidade real (106 produtos) — quase o dobro de `mega-eletronicos` e mais que o dobro de `mobile-zone`. Catálogo grande não implica alto impacto comparável; overlap de categoria e qualidade de especificação sim. `shopping-china`, apesar de ser o 3º maior catálogo (2.446 ofertas), contribui com apenas 2 produtos — desproporcionalmente baixo, provavelmente por seu perfil "Importados/Geral" divergir do perfil eletrônicos/informática dos demais, e por não estar recertificado. Nenhuma correção é proposta aqui (fora do escopo — sem código); nomeado como achado.

### Merchants candidatos (bloqueados, sem dado real de catálogo)

| Merchant | Status técnico | Status comercial | Categoria declarada | Prioridade histórica |
|---|---|---|---|---|
| Cellshop | `robots.txt` bloqueia ClaudeBot nomeadamente | **Not Contacted** | Eletrônicos/Celulares | Máxima (mesmo cluster do único par comparável já provado historicamente) |
| Nissei | `robots.txt` bloqueia ClaudeBot nomeadamente | **Not Contacted** | Informática/Eletrodomésticos; distribuidor oficial Apple/Sony/Canon/Nikon | Máxima (único caminho real para categoria Fotografia/marcas premium) |
| Visão VIP | `robots.txt` bloqueia ClaudeBot nomeadamente (reclassificado 2026-07-08 de "spike técnico" para bloqueio comercial) | **Not Contacted** | Informática | Média-Alta |
| Casa Americana | `robots.txt` bloqueia ClaudeBot + `Disallow: /catalogo` | **Not Contacted** | Eletrônicos/Geral | Média |
| New Zone | `robots.txt` + `Content-Signal: ai-train=no` | **Not Contacted** | Importados/Atacado | Média-Baixa (perfil "atacado" tem precedente real de 0% overlap, ver Roma Shopping) |

**Nenhum dos 5 tem uma linha de contato comercial preenchida** — confirmado em `TIER1_PARTNERS.md`, nenhuma abordagem foi feita. Isso não é um gap técnico, é a ausência completa de execução comercial sobre um pipeline já preparado.

## 2. Comparable Opportunity Matrix (Objetivo 3) — nunca estimado, sempre medido

Medição real: para os merchants já conectados, a matriz de pares que efetivamente geram candidato cross-merchant (≥70% de confiança, `ProductIdentityEngine` real e inalterado, categoria via Universal Taxonomy, especificações via Product Signature — mesma wiring de Κ-4):

| Par de merchants | Candidatos cross-merchant medidos |
|---|---:|
| atacado-connect × mega-eletronicos | **31** |
| atacado-connect × mobile-zone | **17** |
| mega-eletronicos × roma-shopping | 5 |
| atacado-connect × roma-shopping | 5 |
| mega-eletronicos × mobile-zone | 5 |
| mobile-zone × roma-shopping | 2 |
| atacado-connect × shopping-china | 1 |
| **Todos os outros 14 pares possíveis entre os 7 merchants** | **0** |

Se todos os 66 candidatos cross-merchant medidos fossem aprovados e executados (decisão humana futura, não automática — Shadow Mode permanente): **64 grupos alcançariam 2+ lojas, 2 grupos alcançariam 3+, 0 alcançariam 4+ ou 5+**. Isso é uma simulação sobre dado real, não uma medição de produção (nada foi executado) — rotulada como tal, nunca combinada com o número real de produção (CPC = 0,03%, inalterado).

**Para os 5 merchants candidatos bloqueados**: **não é possível medir** esta matriz — nenhum dado real de produto existe para eles (robots.txt impede sync completo; nissei/cellshop têm apenas 2 ofertas de amostra cada, insuficiente estatisticamente). Qualquer número aqui seria estimativa, proibida pela Mission ("Nunca estimar. Sempre medir."). A única leitura honesta possível é qualitativa, apoiada em precedente real: Cellshop/Nissei/Visão VIP compartilham o perfil de categoria (Eletrônicos/Celulares/Informática) dos 3 merchants que juntos respondem por 62 dos 66 candidatos cross-merchant medidos (atacado-connect+mega-eletronicos+mobile-zone) — o precedente medido favorece esses 3 candidatos sobre Casa Americana/New Zone (perfil "geral/atacado", mesmo perfil de `roma-shopping`, que mede apenas 24 produtos de contribuição apesar de ser um catálogo real e conectado).

## 3. Expansion Roadmap — 3 prioridades (Objetivo 6)

### Prioridade 1 — Executar o que já está construído (Program Κ)

- **Lojas**: as 5 já conectadas (nenhuma nova).
- **Categorias**: Eletrônicos/Informática/Celulares — onde os 66 candidatos medidos já existem.
- **Produtos**: os 130 canonical products já identificados em pares cross-merchant reais (Κ-4/Κ-5).
- **Impacto esperado**: CPC de 0,03% para até ~0,36% (64/17.990) — medido como teto de simulação, não garantido até execução real.
- **Risco**: baixo — mesma disciplina de Shadow Mode, rollback provado (Κ-4: 95% de sucesso, 5% rollback em amostra real).
- **Esforço**: **zero engenharia nova** — é uma decisão de autorização/revisão humana (aprovar merge_candidates Média/Alta), não um projeto técnico.

### Prioridade 2 — Cellshop + Nissei (parceria comercial)

- **Lojas**: Cellshop, Nissei.
- **Categorias**: Eletrônicos/Celulares (Cellshop), Informática/Fotografia/marcas premium (Nissei) — únicos candidatos com precedente de cluster medido (mesmo perfil dos 3 merchants que respondem por 94% dos candidatos cross-merchant reais).
- **Produtos**: não mensurável hoje (§2) — potencial qualitativo alto por precedente de cluster, não por medição direta.
- **Impacto esperado**: qualitativo, não numérico — "maior probabilidade de replicar o padrão de overlap já medido em atacado-connect/mega-eletronicos/mobile-zone", não uma projeção de CPC.
- **Risco**: médio-alto — depende inteiramente de terceiro aceitar parceria; zero contato feito até hoje.
- **Esforço**: comercial, não técnico — `docs/business/PARTNERSHIP_PROPOSAL.md`/`PARTNERSHIP_EMAIL_TEMPLATE.md` já existem, prontos, nunca usados.

### Prioridade 3 — Visão VIP, Casa Americana, New Zone

- **Lojas**: os 3 restantes do universo Tier 1.
- **Categorias**: Informática (Visão VIP); Eletrônicos/Geral e Importados/Atacado (Casa Americana, New Zone) — perfil mais próximo de Roma Shopping, que mede apenas 24 produtos de contribuição apesar de catálogo real conectado.
- **Produtos**: não mensurável.
- **Impacto esperado**: qualitativo, baixo-médio — precedente real (Roma Shopping) sugere que catálogo "geral/atacado" adiciona volume sem proporcionalmente adicionar comparabilidade.
- **Risco**: mesmo risco comercial da Prioridade 2, mais baixo retorno esperado por precedente.
- **Esforço**: comercial, mesmo pipeline pronto e não usado.

Nenhuma prioridade envolve escrever código, alterar arquitetura, ou criar migration — confirma a restrição da Mission.
