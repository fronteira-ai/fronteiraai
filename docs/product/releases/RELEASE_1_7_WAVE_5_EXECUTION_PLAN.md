# RELEASE_1_7_WAVE_5_EXECUTION_PLAN.md
# Plano de Execução Técnica — Wave 5: Merchant Acquisition & Ownership Platform

**Versão**: 1.0
**Criado**: 2026-07-01
**Status**: Entregue e certificado
**Referência**: `docs/product/releases/RELEASE_1_7_BLUEPRINT.md` v1.3 (Capítulo 4 — Waves, re-escopo do CTO)
**Arquitetura base**: Release 1.7 — Wave 4 — `docs/product/releases/RELEASE_1_7_WAVE_4_EXECUTION_PLAN.md`

---

## Premissa

Este documento detalha a execução técnica da Wave 5. A Wave 6 será detalhada em documento equivalente quando sua vez chegar.

## Re-escopo do CTO (pré-implementação)

A Wave 5 original deste Release era "Merchant Claim + Onboarding" (2 bullets). Em 2026-07-01 o CTO expandiu o escopo para "Merchant Acquisition & Ownership Platform" (8 Epics), com uma mudança explícita de prioridade: infraestrutura dá lugar a crescimento de negócio. Toda decisão desta Wave respondeu à pergunta obrigatória do mandato: "isso aumenta a conversão de lojistas para clientes do ParaguAI?".

## Decisões numeradas

1. **`src/domains/merchant-ownership/` depende de `trust/` deliberadamente.** Diferente de `canonical-catalog/` (Wave 4, que não pode depender de nada), este domínio reaproveita a infraestrutura de verificação já existente desde o Release 1.5 (`VerificationService`, `VerificationEvidenceService`, `EventService`) em vez de duplicar uma segunda máquina de estados de verificação. Um novo `VerificationType.StoreClaim` foi adicionado (não cinco tipos granulares por sinal) — o breakdown de sinais vive como evidência/metadata sobre essa única verificação.
2. **Claim Review Center ganha uma página real de admin nesta Wave** (`/admin/claims`, `/admin/claims/[id]`) — confirmado com o CTO, diferente do precedente de Shadow Mode/backend-only das Waves 3/4. Mesma UX (lista + detalhe + botões de ação) já estabelecida em `/admin/trust/verifications` e `/admin/trust/reviews`.
3. **Progressive Verification é comparação de consistência interna, não chamadas a APIs de terceiros.** Este ambiente não tem credenciais do Meta Graph API / WhatsApp Business API — confirmado com o CTO antes da implementação. `ProgressiveVerificationEngine` compara e-mail/telefone/WhatsApp/website/Instagram submetidos pelo requerente contra os já cadastrados na própria loja (`stores.email/phone/whatsapp/website/instagram` — colunas já existentes). Sem checagem de Facebook: `stores` não tem essa coluna, e adicioná-la está fora do escopo deste domínio — gap documentado, não corrigido silenciosamente.
4. **Confidence é calculado só sobre sinais aplicáveis, não sobre todos os pesos possíveis.** Um sinal que a loja não tem cadastrado (ex.: sem Instagram) é "não aplicável", não "não bateu" — o requerente não é penalizado pelos dados incompletos da própria loja. Um piso de peso aplicável mínimo (45 de 100) impede aprovação automática só porque um único sinal isolado bateu.
5. **Gate anti-fraude estrutural, não apenas convencional**: um claim com tudo divergente tem confidence 0 e nunca é auto-aprovado — testado explicitamente (`ProgressiveVerificationEngine.test.ts`). "Falso positivo (impostor aprovado) é inaceitável; falso negativo (dono legítimo precisa de revisão manual) é aceitável" — mesma régua de precisão da Wave 3 (Product Identity), aplicada agora à identidade de propriedade.
6. **Mesmo "aprovar" nunca é automático de verdade sem verificação prévia.** Mesmo no caminho de auto-aprovação (`ClaimService.create`, quando `autoApprovable=true`), a aprovação passa pelo mesmo código (`storeLinkRepo.link` + `verificationService.approveVerification`) que o caminho manual do admin usa — não existe um atalho que pule a verificação, só um atalho que dispensa a espera por um humano quando a confiança já é suficientemente alta.
7. **Revogação preserva histórico — nunca deleta a claim.** `ClaimService.revoke` desfaz o vínculo `merchant_stores` e revoga a verificação, mas a linha em `store_claims` permanece com seu status histórico `approved` (ela foi legitimamente aprovada quando aprovada) — auditoria append-only, mesmo princípio das Waves 3/4.
8. **Delegação: apenas o proprietário pode convidar/revogar, reforçado no serviço, não só na rota.** `DelegationService.invite`/`revoke` recebem um `actingRole` explícito e lançam exceção se não for `"owner"` — mesmo que uma rota fosse escrita incorretamente usando `requireMerchantContext()` (que também resolve delegados) em vez de `requireMerchant()`, a garantia estrutural continua no serviço. Testado explicitamente.
9. **`requireMerchantContext()` é aditivo — `requireMerchant()` não muda.** Uma nova função em `lib/merchant-auth.ts` resolve proprietário OU delegado ativo; usada só nas novas rotas desta Wave (delegação). Nenhuma das ~15 rotas de merchant já existentes precisou mudar — retrofitting de acesso de delegado nelas é explicitamente adiado, nomeado, não uma lacuna silenciosa.
10. **Premium Upgrade Journey é lead-capture, não billing** (confirmado com o CTO, ADR-035 já existente). `merchant_upgrade_leads` é append-only; nenhuma rota altera `merchants.plan`. `PremiumTrialStarted`/`PremiumActivated` ficam taxonomia apenas — não há trial nem ativação reais para emiti-los honestamente.
11. **8 dos 10 novos eventos do Brain têm emissão real** — diferente de toda Wave anterior deste Release. Uma claim, uma delegação, um clique de interesse em upgrade sempre acontecem dentro de um contexto de merchant já conhecido (`merchantId` sempre disponível), ao contrário dos eventos de sistema/descoberta das Waves 2–4.
12. **Sem fila/queue de processamento** — confirmado com o CTO. Este projeto não tem nenhuma infraestrutura de fila (nem Redis, nem BullMQ) — apenas um cron diário síncrono. "Milhares de claims simultâneos" é processado de forma síncrona (request/response) na escala real deste projeto; construir uma fila do zero para essa Wave seria desproporcional. Nomeado como preocupação de escala futura, não construído agora.

## Verificação / Quality Gate

`npm run lint` (0) · `npx tsc --noEmit` (0) · `npm test` (279/279, suíte completa — 34 novos testes) · `npm run build` (152 rotas, +11 novas) · `npm run db:lint` (5 migrations, nenhum SELECT embutido).

**Migration `0026` requer `npm run db:push` pelo CTO.**

**Deferido explicitamente para Waves futuras**: retrofitting de `requireMerchantContext()` nas rotas de merchant já existentes (delegados só operam via as rotas novas desta Wave); onboarding pós-claim guiado (checklist completo além do que `OnboardingWizard`/`computeProfileCompletion()` já cobrem); fila de processamento real, se o volume de claims um dia justificar; emissão real de `PremiumTrialStarted`/`PremiumActivated` (dependem de um mecanismo real de trial/billing, ainda inexistente); verificação real via Meta Graph API/WhatsApp Business API (precisa de credenciais que só o CTO pode fornecer); checagem de Facebook em Progressive Verification (precisa de uma coluna `stores.facebook`, fora do escopo deste domínio).
