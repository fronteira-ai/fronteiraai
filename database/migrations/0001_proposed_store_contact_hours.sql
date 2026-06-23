-- ████ SUPERADA — NÃO APLICAR ████
--
-- Status atualizado na Sprint 3.4.1 (auditoria de dados): esta proposta
-- partiu de `types/store.ts` e `database/DATABASE.md`, sem consultar o
-- schema real do Supabase. A auditoria da Sprint 3.4.1 (query direta via
-- PostgREST) revelou que a tabela `stores` real JÁ TEM `phone`, `whatsapp`,
-- `email`, `website` (não `website_url`), `address` e `opening_hours`
-- (texto livre, não `business_hours jsonb`) — ou seja, NENHUMA das colunas
-- abaixo deveria ser adicionada, pois já existem (a maioria com nomes
-- diferentes do que esta proposta assumia).
--
-- Ver a versão revisada: `0002_revised_store_data_layer.sql`.
-- Ver `docs/DECISIONS.md`, ADR-008, para o achado completo.
--
-- Mantido neste arquivo (não apagado) para registro histórico de como o
-- engano aconteceu: a causa raiz foi gerar a proposta a partir do tipo
-- TypeScript existente em vez de consultar o banco real diretamente —
-- exatamente o tipo de suposição que `docs/CONVENTIONS.md` já alertava
-- ("antes de assumir que um arquivo está implementado, sempre abra-o") e
-- que ADR-007 já tinha começado a expor.
--
-- ---------------------------------------------------------------------
-- Conteúdo original abaixo (histórico, não aplicar):
-- ---------------------------------------------------------------------
--
-- PROPOSTA DE MIGRATION — NÃO APLICADA
--
-- Gerada na Sprint 3.4 (Domínio de Loja) a pedido do CTO, para avaliação
-- antes de qualquer alteração real no banco. Este arquivo NÃO é executado
-- automaticamente (o projeto não tem CI nem runner de migrations — ver
-- docs/PROJECT_STATUS.md) e não deve ser aplicado ao Supabase sem revisão
-- e aprovação explícitas.
--
-- Contexto: a página de loja (app/store/[slug]/) foi implementada na
-- Sprint 3.4 usando apenas os campos hoje existentes em `stores`
-- (name, slug, description, city, country, rating, logo_url, banner_url,
-- verified, created_at). As seções de "Contato" e "Horário de
-- Funcionamento" pedidas na missão da Sprint não puderam ser implementadas
-- porque essas colunas não existem na tabela real — ver docs/DECISIONS.md
-- (ADR-006) e docs/TECH_DEBT.md.
--
-- Esta proposta cobre apenas os campos necessários para essas duas seções.
-- Não inclui colunas para avaliações/reviews (tabela própria, fora de
-- escopo aqui) nem geolocalização precisa (lat/lng) — podem ser objeto de
-- uma proposta separada se o produto precisar de mapa/distância.

ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS whatsapp text,
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS business_hours jsonb;

-- Todas as colunas são nullable e sem default: lojas existentes continuam
-- válidas sem dados de contato/horário, e o código (StoreDetails/futura
-- seção de contato) deve tratar a ausência como "informação não
-- disponível", nunca como erro.
--
-- Formato sugerido para `business_hours` (estrutura livre, validada na
-- aplicação, não no banco):
-- {
--   "mon": "09:00-18:00", "tue": "09:00-18:00", "wed": "09:00-18:00",
--   "thu": "09:00-18:00", "fri": "09:00-18:00",
--   "sat": "09:00-13:00", "sun": null
-- }
-- (null/ausente = fechado naquele dia)

COMMENT ON COLUMN stores.phone IS 'Telefone de contato da loja, formato livre.';
COMMENT ON COLUMN stores.whatsapp IS 'Número de WhatsApp da loja, formato livre (ex: link wa.me ou número).';
COMMENT ON COLUMN stores.email IS 'E-mail de contato público da loja.';
COMMENT ON COLUMN stores.website_url IS 'Site oficial da loja, se houver.';
COMMENT ON COLUMN stores.address IS 'Endereço descritivo (rua/número/bairro), complementar a city/country.';
COMMENT ON COLUMN stores.business_hours IS 'Horário de funcionamento por dia da semana, ver formato sugerido no comentário desta migration.';

-- NOTA SEPARADA (não é uma migration de schema, é um achado de dados):
-- verificado nesta sprint que as 5 linhas reais de `stores` no Supabase têm
-- `slug = NULL`, e a tabela `products` está vazia (0 linhas). Isso é
-- independente desta proposta de colunas novas — é um backfill de dados
-- (UPDATE), não um ALTER TABLE — e está fora do escopo deste arquivo. Ver
-- docs/TECH_DEBT.md e o relatório da Sprint 3.4 para detalhes; não
-- corrigido automaticamente por não ser uma decisão de schema/código.
