-- Scan de integridade referencial (Sprint 38F) — todas as FKs de public
-- 1 linha = FK|child|parent|violations ; total no final.
DO $$
DECLARE
  r record; cond text; nullcond text; v bigint; bad bigint := 0; fk_count int := 0; pfirst text;
BEGIN
  FOR r IN
    SELECT c.conname, c.conrelid, c.confrelid, c.conkey, c.confkey
    FROM pg_constraint c
    WHERE c.contype='f' AND c.connamespace='public'::regnamespace
    ORDER BY c.conname
  LOOP
    SELECT string_agg(format('c.%I = p.%I', cattr.attname, pattr.attname), ' AND '),
           string_agg(format('c.%I IS NULL', cattr.attname), ' OR ')
    INTO cond, nullcond
    FROM unnest(r.conkey) WITH ORDINALITY ca(attnum, ord)
    JOIN pg_attribute cattr ON cattr.attrelid = r.conrelid AND cattr.attnum = ca.attnum
    JOIN unnest(r.confkey) WITH ORDINALITY pa(attnum, ord) ON pa.ord = ca.ord
    JOIN pg_attribute pattr ON pattr.attrelid = r.confrelid AND pattr.attnum = pa.attnum;
    SELECT attname INTO pfirst
    FROM unnest(r.confkey) WITH ORDINALITY pa(attnum, ord)
    JOIN pg_attribute pattr ON pattr.attrelid = r.confrelid AND pattr.attnum = pa.attnum
    ORDER BY pa.ord LIMIT 1;
    -- Semantica MATCH SIMPLE: linha com QUALQUER coluna FK NULL satisfaz a FK.
    EXECUTE format('SELECT count(*) FROM %s c WHERE NOT (%s) AND NOT EXISTS (SELECT 1 FROM %s p WHERE %s)',
                   r.conrelid::regclass, nullcond, r.confrelid::regclass, cond) INTO v;
    fk_count := fk_count + 1;
    IF v > 0 THEN bad := bad + 1; END IF;
    RAISE NOTICE 'FK|%|%|%|%', r.conname, r.conrelid::regclass, r.confrelid::regclass, v;
  END LOOP;
  RAISE NOTICE 'FK_TOTAL=% FK_VIOLATIONS=%', fk_count, bad;
END $$;
