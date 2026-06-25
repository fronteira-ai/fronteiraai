-- ============================================================
-- 0007 — Leitura pública para o catálogo ParaguAI
-- Status: PRONTO PARA EXECUÇÃO (Sprint 4.1, hotfix)
-- ============================================================
--
-- Contexto (ADR-019):
-- A chave anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY), única usada por
-- lib/supabase.ts e por toda a aplicação Next.js, não lê nenhuma linha
-- de brands/categories/products/offers/price_history. SELECT retorna
-- sempre { error: null, data: [] } silenciosamente, mesmo havendo linhas
-- reais (confirmado com a chave de serviço nas Sprints 3.8/3.9).
-- `stores` é a única tabela do domínio com leitura pública funcionando.
--
-- Segurança:
-- * FOR SELECT = nunca INSERT/UPDATE/DELETE.
-- * TO anon, authenticated = visitante e usuário logado podem ler.
-- * USING (true) = todas as linhas visíveis, sem filtro por linha.
-- * Sem WITH CHECK = impossível usar esta policy para escrever.
-- * Nenhuma policy de escrita para anon/authenticated = RLS bloqueia
--   qualquer INSERT/UPDATE/DELETE com erro explícito.
-- * service_role bypassa RLS por design — seed scripts mantêm acesso
--   total de escrita independente desta migration.
--
-- Idempotência:
-- DROP POLICY IF EXISTS é no-op se a policy não existir.
-- Seguro para re-executar quantas vezes for necessário.
--
-- Tabelas não incluídas intencionalmente:
-- * stores       — já tem leitura pública funcionando
-- * profiles     — não deve ser lida publicamente
-- * favorites    — não deve ser lida publicamente
--
-- Como executar:
-- 1. Abra Supabase Dashboard -> SQL Editor
-- 2. Cole este arquivo inteiro
-- 3. Clique Run
-- 4. Confirme que a query de verificação no final retorna 5 linhas
--    com cmd = 'r' e roles = {anon,authenticated}
-- ============================================================

-- Garante que RLS está ativo em cada tabela.
-- Idempotente: no-op se já habilitado.
ALTER TABLE brands        ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories    ENABLE ROW LEVEL SECURITY;
ALTER TABLE products      ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers        ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- brands
DROP POLICY IF EXISTS "Public read access" ON brands;
CREATE POLICY "Public read access"
  ON brands FOR SELECT TO anon, authenticated USING (true);

-- categories
DROP POLICY IF EXISTS "Public read access" ON categories;
CREATE POLICY "Public read access"
  ON categories FOR SELECT TO anon, authenticated USING (true);

-- products
DROP POLICY IF EXISTS "Public read access" ON products;
CREATE POLICY "Public read access"
  ON products FOR SELECT TO anon, authenticated USING (true);

-- offers
DROP POLICY IF EXISTS "Public read access" ON offers;
CREATE POLICY "Public read access"
  ON offers FOR SELECT TO anon, authenticated USING (true);

-- price_history
DROP POLICY IF EXISTS "Public read access" ON price_history;
CREATE POLICY "Public read access"
  ON price_history FOR SELECT TO anon, authenticated USING (true);

-- ============================================================
-- Verificação pós-execução
-- Resultado esperado: 5 linhas, todas com cmd = 'r' e
-- roles = {anon,authenticated}. Nenhuma linha com cmd = 'w'.
-- ============================================================
SELECT
  tablename,
  policyname,
  cmd,
  roles,
  qual
FROM pg_policies
WHERE tablename IN ('brands','categories','products','offers','price_history')
ORDER BY tablename;
