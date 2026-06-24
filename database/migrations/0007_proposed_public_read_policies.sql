-- PROPOSTA DE MIGRATION — NÃO APLICADA — URGENTE
--
-- Achado crítico do adendo da Sprint 3.9 (ver docs/DECISIONS.md ADR-019):
-- com dados reais existentes desde a Sprint 3.8, confirmou-se que a chave
-- anônima (NEXT_PUBLIC_SUPABASE_ANON_KEY, a única usada por toda a
-- aplicação via lib/supabase.ts) NÃO consegue ler nenhuma linha de
-- `brands`/`categories`/`products`/`offers`/`price_history` — SELECT
-- retorna sempre `{ error: null, data: [] }` (RLS filtra silenciosamente,
-- sem erro), mesmo havendo linhas reais visíveis com a chave de serviço.
-- `stores` é a única tabela do domínio confirmada com leitura pública
-- funcionando para a chave anônima.
--
-- Impacto: o catálogo, a página de produto/loja, a busca e as ofertas
-- provavelmente aparecem vazios para qualquer usuário real hoje, mesmo após
-- o seed da Sprint 3.8 ter inserido dados reais — porque a aplicação nunca
-- usa outra chave além da anônima. Isso não foi causado pela Sprint 3.8/3.9
-- (a falha de policy já existia, só ficou invisível enquanto as tabelas
-- estavam vazias — 0 linhas reais com RLS bloqueando looks exactly like 0
-- linhas reais sem RLS nenhuma).
--
-- Esta migration só adiciona policies de LEITURA pública (SELECT) — nunca
-- INSERT/UPDATE/DELETE, que devem continuar restritos à chave de serviço
-- (ADR-016/017/018). `ENABLE ROW LEVEL SECURITY` é idempotente (no-op se já
-- estiver habilitado); ajuste os nomes de policy se já existir uma com o
-- mesmo nome em alguma destas tabelas.

ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON brands FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON offers FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public read access" ON price_history FOR SELECT TO anon, authenticated USING (true);

-- Não incluído: policy de escrita para `anon`/`authenticated` em nenhuma
-- destas tabelas — permanece exclusivo da chave de serviço (ferramentas de
-- dados) até existir Admin (Release 0.7)/Crawler (Release 0.8) com a própria
-- estratégia de autenticação/autorização.
