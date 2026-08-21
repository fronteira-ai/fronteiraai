-- Fingerprint deterministico por tabela (Sprint 38F, FASE 11)
-- 1 linha = schema.tabela|linhas|md5
-- Metodo: hash de cada linha via to_jsonb (jsonb canoniza a ordem das
-- chaves -> representacao INDEPENDENTE da ordem das colunas; distingue
-- NULL de ''; inclui nomes de colunas), agregado em md5 ordenado pelo
-- proprio hash (deterministico e imune a ordem fisica das linhas).
DO $$
DECLARE r record; h text; n bigint;
BEGIN
  FOR r IN
    SELECT schemaname, tablename FROM pg_tables WHERE schemaname='public'
    UNION ALL SELECT 'auth','users'
    UNION ALL SELECT 'auth','identities'
    ORDER BY 1,2
  LOOP
    EXECUTE format('SELECT count(*) FROM %I.%I', r.schemaname, r.tablename) INTO n;
    EXECUTE format(
      'SELECT COALESCE(md5(string_agg(x.h, '''' ORDER BY x.h)), ''empty'')
       FROM (SELECT md5(to_jsonb(t)::text) AS h FROM %I.%I t) x',
      r.schemaname, r.tablename) INTO h;
    RAISE NOTICE '%|%|%', r.schemaname||'.'||r.tablename, n, h;
  END LOOP;
END $$;
