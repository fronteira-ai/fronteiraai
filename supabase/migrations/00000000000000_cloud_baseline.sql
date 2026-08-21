-- ============================================================
-- BASELINE CANONICO — schema real do Supabase Cloud (public)
-- Sprint 38D — prova: CLOUD_SCHEMA == BASELINE == REBUILD
--
-- Gerado por scripts/build-canonical-baseline.sh a partir de:
--   pg_dump --schema-only --no-owner --no-privileges --schema=public
-- Ponto de corte: catalogo do Cloud em 2026-08-21 (Sprint 38C-R).
-- Autoridade: CATALOGO REAL DO CLOUD (nao replay de migrations).
--
-- Conteudo esperado: 68 tabelas, 226 indices, 50 policies,
-- 2 funcoes public, 0 views, 0 matviews, 0 sequences.
-- Sem dados, sem DELETE, sem secrets, sem owners especificos.
--
-- APLICAR APOS o bootstrap da plataforma (auth.users e as roles
-- anon/authenticated/service_role ja existentes). A dependencia
-- handle_new_user/on_auth_user_created (auth.users) e reproduzida
-- pela migration pos-bootstrap 20260821120000_post_bootstrap_auth_trigger.sql.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--



--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (new.id, COALESCE(new.email, ''), 'operator')
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  RETURN new;
END;
$$;


--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;




--
-- Name: attribute_dictionary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.attribute_dictionary (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    key text NOT NULL,
    label_pt text NOT NULL,
    label_es text NOT NULL,
    category text NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT attribute_dictionary_category_check CHECK ((category = ANY (ARRAY['physical'::text, 'technical'::text, 'identifier'::text])))
);


--
-- Name: brand_universal_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brand_universal_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_id uuid NOT NULL,
    canonical_brand_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    slug text NOT NULL,
    logo_url text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: buyer_alert_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyer_alert_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    product_id uuid,
    offer_id uuid,
    store_id uuid,
    market_change_id uuid,
    priority integer DEFAULT 0 NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    rate_limit_key text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT buyer_alert_candidates_alert_type_check CHECK ((alert_type = ANY (ARRAY['price_drop'::text, 'stock_returned'::text, 'new_promotion'::text, 'new_product'::text, 'relevant_change'::text]))),
    CONSTRAINT buyer_alert_candidates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'suppressed'::text, 'expired'::text])))
);


--
-- Name: buyer_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyer_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    event_type text NOT NULL,
    session_id uuid,
    buyer_id uuid,
    anonymous_id text NOT NULL,
    merchant_id uuid,
    store_id uuid,
    product_id uuid,
    search_query text,
    page_url text NOT NULL,
    referrer text,
    metadata jsonb DEFAULT '{}'::jsonb,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    brain_synced_at timestamp with time zone,
    brain_sync_error text
);


--
-- Name: buyer_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.buyer_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    buyer_id uuid,
    anonymous_id text NOT NULL,
    device_type text,
    browser text,
    country text,
    city text,
    language text,
    entry_page text,
    exit_page text,
    event_count integer DEFAULT 0 NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    last_event_at timestamp with time zone DEFAULT now() NOT NULL,
    ended_at timestamp with time zone,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_bootstrap_checkpoint; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_bootstrap_checkpoint (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    run_key text NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    last_product_id uuid,
    processed_count integer DEFAULT 0 NOT NULL,
    created_count integer DEFAULT 0 NOT NULL,
    linked_count integer DEFAULT 0 NOT NULL,
    enqueued_count integer DEFAULT 0 NOT NULL,
    failed_count integer DEFAULT 0 NOT NULL,
    last_error text,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT canonical_bootstrap_checkpoint_status_check CHECK ((status = ANY (ARRAY['running'::text, 'paused'::text, 'cancel_requested'::text, 'cancelled'::text, 'completed'::text, 'failed'::text])))
);


--
-- Name: TABLE canonical_bootstrap_checkpoint; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.canonical_bootstrap_checkpoint IS 'Mission Ω-Hardening. Checkpoint durável do HistoricalCanonicalBootstrapService — permite retomada após reinício de processo (keyset em last_product_id, mesmo padrão de IRecoveryRepository.fetchCandidates) e cancelamento seguro (operador marca status=cancel_requested; o serviço para após o batch atual, nunca no meio de um item).';


--
-- Name: canonical_brands; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_brands (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: canonical_products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_slug text NOT NULL,
    name text NOT NULL,
    brand_id uuid,
    category_id uuid,
    image_url text,
    specifications jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    merged_into_id uuid
);


--
-- Name: canonical_suggestion_outbox; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.canonical_suggestion_outbox (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_product_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    attempts integer DEFAULT 0 NOT NULL,
    last_error text,
    last_attempted_at timestamp with time zone,
    next_attempt_at timestamp with time zone DEFAULT now() NOT NULL,
    claimed_at timestamp with time zone,
    algorithm_version text,
    source text NOT NULL,
    enqueued_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    priority text DEFAULT 'normal'::text NOT NULL,
    CONSTRAINT canonical_suggestion_outbox_priority_check CHECK ((priority = ANY (ARRAY['high'::text, 'normal'::text, 'low'::text]))),
    CONSTRAINT canonical_suggestion_outbox_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'processing'::text, 'done'::text, 'failed'::text, 'dead_letter'::text, 'expired'::text])))
);


--
-- Name: TABLE canonical_suggestion_outbox; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.canonical_suggestion_outbox IS 'Program Ω — Mission Ω-Canonical Integration. Transactional Outbox, propriedade de connectors/, que desacopla suggestMergesFor() (Product Identity) do caminho crítico do Sync Pipeline. Contrato: AT LEAST ONCE DELIVERY — todo consumidor deste outbox (hoje só CanonicalMergeSuggestionService.suggestMergesFor) já é idempotente por construção; retries e reprocessamento são comportamento esperado, nunca condição de erro. dead_letter é estado terminal explícito e nunca silencioso — nunca reentra automaticamente na fila.';


--
-- Name: COLUMN canonical_suggestion_outbox.priority; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.canonical_suggestion_outbox.priority IS 'Mission Ω-Hardening. HIGH/NORMAL/LOW — claimBatch() ordena por prioridade primeiro, created_at em segundo. Default NORMAL preserva o comportamento de todo enqueue() já existente.';


--
-- Name: catalog_pending_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_pending_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    store_id uuid NOT NULL,
    field_type text NOT NULL,
    raw_value text NOT NULL,
    reasons text[] DEFAULT '{}'::text[] NOT NULL,
    payload jsonb NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    resolved_value text,
    resolved_brand_id uuid,
    resolved_category_id uuid,
    resolved_by text,
    resolved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_pending_reviews_field_type_check CHECK ((field_type = ANY (ARRAY['brand'::text, 'category'::text]))),
    CONSTRAINT catalog_pending_reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'resolved'::text])))
);


--
-- Name: catalog_recovery_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_recovery_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    field_type text NOT NULL,
    previous_value text,
    layer text NOT NULL,
    recovered_value text NOT NULL,
    recovered_brand_id uuid,
    recovered_category_id uuid,
    confidence text NOT NULL,
    evidence text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT catalog_recovery_decisions_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT catalog_recovery_decisions_field_type_check CHECK ((field_type = ANY (ARRAY['brand'::text, 'category'::text]))),
    CONSTRAINT catalog_recovery_decisions_layer_check CHECK ((layer = ANY (ARRAY['product_signature'::text, 'canonical_catalog'::text, 'merchant_memory'::text, 'universal_taxonomy'::text, 'brand_normalization'::text])))
);


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text,
    slug text,
    icon text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: category_universal_map; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.category_universal_map (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    category_id uuid NOT NULL,
    universal_category_id uuid NOT NULL,
    confidence text DEFAULT 'alta'::text NOT NULL,
    source text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT category_universal_map_confidence_check CHECK ((confidence = ANY (ARRAY['alta'::text, 'media'::text, 'manual'::text])))
);


--
-- Name: connector_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_id text NOT NULL,
    store_slug text NOT NULL,
    enabled boolean DEFAULT true NOT NULL,
    max_products integer DEFAULT 10 NOT NULL,
    request_delay_ms integer DEFAULT 500 NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: connector_sync_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_id uuid NOT NULL,
    connector_key text NOT NULL,
    merchant_id uuid,
    batch_id text NOT NULL,
    dry_run boolean DEFAULT false NOT NULL,
    status text DEFAULT 'running'::text NOT NULL,
    totals jsonb DEFAULT '{}'::jsonb NOT NULL,
    errors jsonb,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    completed_at timestamp with time zone,
    CONSTRAINT connector_sync_runs_status_check CHECK ((status = ANY (ARRAY['running'::text, 'success'::text, 'partial'::text, 'failed'::text])))
);


--
-- Name: connector_url_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connector_url_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_id text NOT NULL,
    url text NOT NULL,
    lastmod text NOT NULL,
    last_fetched_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: connectors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.connectors (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_key text NOT NULL,
    name text NOT NULL,
    version text NOT NULL,
    type text NOT NULL,
    store_slug text NOT NULL,
    description text,
    status text DEFAULT 'active'::text NOT NULL,
    config jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT connectors_status_check CHECK ((status = ANY (ARRAY['active'::text, 'disabled'::text]))),
    CONSTRAINT connectors_type_check CHECK ((type = ANY (ARRAY['json-file'::text, 'csv-file'::text, 'api-rest'::text, 'xml-file'::text, 'erp'::text, 'manual-upload'::text, 'crawler'::text])))
);


--
-- Name: exchange_conversion_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_conversion_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    from_currency text NOT NULL,
    to_currency text NOT NULL,
    amount numeric(18,2) NOT NULL,
    converted_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: exchange_provider_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_provider_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    provider_id text NOT NULL,
    status text NOT NULL,
    response_time_ms integer,
    error_message text,
    attempted_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exchange_provider_runs_status_check CHECK ((status = ANY (ARRAY['success'::text, 'failure'::text])))
);


--
-- Name: exchange_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exchange_rates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pair text NOT NULL,
    rate numeric(18,6) NOT NULL,
    source text NOT NULL,
    captured_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT exchange_rates_pair_check CHECK ((pair = ANY (ARRAY['USD/PYG'::text, 'USD/BRL'::text, 'BRL/PYG'::text])))
);


--
-- Name: favorites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.favorites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id uuid,
    product_id uuid,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: import_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.import_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    connector_id text NOT NULL,
    batch_id text NOT NULL,
    dry_run boolean DEFAULT false NOT NULL,
    success boolean DEFAULT false NOT NULL,
    total_raw integer DEFAULT 0 NOT NULL,
    total_persisted integer DEFAULT 0 NOT NULL,
    total_errors integer DEFAULT 0 NOT NULL,
    metrics jsonb DEFAULT '{}'::jsonb,
    errors jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: knowledge_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.knowledge_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    knowledge_key text NOT NULL,
    knowledge_type text NOT NULL,
    scope text NOT NULL,
    store_id uuid,
    raw_value text NOT NULL,
    resolved_value text NOT NULL,
    confidence text NOT NULL,
    occurrences integer DEFAULT 1 NOT NULL,
    distinct_store_count integer DEFAULT 1 NOT NULL,
    version integer NOT NULL,
    source_system text NOT NULL,
    source_id uuid,
    reason text NOT NULL,
    is_conflict boolean DEFAULT false NOT NULL,
    algorithm_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT knowledge_history_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT knowledge_history_scope_check CHECK ((scope = ANY (ARRAY['local'::text, 'global'::text]))),
    CONSTRAINT knowledge_history_source_system_check CHECK ((source_system = ANY (ARRAY['pending_review_resolution'::text, 'catalog_recovery_decision'::text, 'canonical_merge_approval'::text, 'learned_fact_confirmed'::text])))
);


--
-- Name: TABLE knowledge_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.knowledge_history IS 'Program Ω, Mission Ω-5 (Continuous Knowledge Engine). Ledger append-only de conhecimento confirmado (marcas, categorias, atributos, padrões por loja) — nunca UPDATE, nunca DELETE. Cada linha é uma versão imutável; o histórico completo de uma knowledge_key é a auditoria exigida pela missão. Aprende exclusivamente de correções humanas aprovadas e decisões determinísticas já confirmadas (ver source_system) — nunca de IA, nunca de inferência não confirmada.';


--
-- Name: market_changes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_changes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    change_type text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    product_id uuid,
    store_id uuid,
    field text NOT NULL,
    previous_value text,
    current_value text,
    confidence numeric(4,3) DEFAULT 1.0 NOT NULL,
    source text DEFAULT 'crawler'::text NOT NULL,
    detected_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT market_changes_change_type_check CHECK ((change_type = ANY (ARRAY['price_increased'::text, 'price_decreased'::text, 'stock_returned'::text, 'stock_out'::text, 'stock_quantity_changed'::text, 'product_created'::text, 'product_removed'::text, 'offer_created'::text, 'offer_removed'::text, 'image_changed'::text, 'description_changed'::text, 'category_changed'::text, 'brand_changed'::text, 'promotion_detected'::text, 'canonical_updated'::text]))),
    CONSTRAINT market_changes_confidence_check CHECK (((confidence >= (0)::numeric) AND (confidence <= (1)::numeric))),
    CONSTRAINT market_changes_entity_type_check CHECK ((entity_type = ANY (ARRAY['offer'::text, 'product'::text])))
);


--
-- Name: market_pulse_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.market_pulse_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date date NOT NULL,
    prices_changed_count integer DEFAULT 0 NOT NULL,
    prices_dropped_count integer DEFAULT 0 NOT NULL,
    prices_raised_count integer DEFAULT 0 NOT NULL,
    products_added_count integer DEFAULT 0 NOT NULL,
    products_removed_count integer DEFAULT 0 NOT NULL,
    top_categories jsonb DEFAULT '[]'::jsonb NOT NULL,
    top_stores jsonb DEFAULT '[]'::jsonb NOT NULL,
    cheapest_category jsonb,
    most_expensive_move_category jsonb,
    generated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    alert_type text NOT NULL,
    severity text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    subject_type text,
    subject_id text,
    title text NOT NULL,
    details jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_at timestamp with time zone,
    CONSTRAINT marketplace_alerts_alert_type_check CHECK ((alert_type = ANY (ARRAY['connector_down'::text, 'store_not_syncing'::text, 'low_coverage'::text, 'discovery_stalled'::text, 'claim_pending'::text, 'canonical_merge_backlog'::text, 'health_score_dropped'::text, 'low_freshness'::text]))),
    CONSTRAINT marketplace_alerts_severity_check CHECK ((severity = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text]))),
    CONSTRAINT marketplace_alerts_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'acknowledged'::text, 'resolved'::text, 'ignored'::text]))),
    CONSTRAINT marketplace_alerts_subject_type_check CHECK ((subject_type = ANY (ARRAY['connector'::text, 'store'::text, 'category'::text, 'brand'::text, 'marketplace'::text])))
);


--
-- Name: marketplace_health_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_health_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    snapshot_date date NOT NULL,
    overall_score numeric NOT NULL,
    factor_breakdown jsonb NOT NULL,
    metrics jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketplace_memory_facts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketplace_memory_facts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    canonical_product_id uuid NOT NULL,
    fact_type text NOT NULL,
    fact_value text NOT NULL,
    confidence text DEFAULT 'high'::text NOT NULL,
    source text NOT NULL,
    extracted_from text,
    merchant_id uuid,
    origin text DEFAULT 'backfill'::text NOT NULL,
    validation_status text DEFAULT 'unvalidated'::text NOT NULL,
    algorithm_version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT marketplace_memory_facts_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT marketplace_memory_facts_fact_type_check CHECK ((fact_type = ANY (ARRAY['manufacturer_code'::text, 'model'::text, 'category'::text, 'brand'::text, 'family'::text, 'line'::text, 'capacity_gb'::text, 'ram_gb'::text, 'screen_size_in'::text, 'color'::text, 'voltage'::text, 'power_w'::text, 'ean'::text, 'bundle_includes'::text, 'processor'::text, 'gpu'::text, 'tokens'::text]))),
    CONSTRAINT marketplace_memory_facts_origin_check CHECK ((origin = ANY (ARRAY['sync'::text, 'backfill'::text, 'manual'::text]))),
    CONSTRAINT marketplace_memory_facts_source_check CHECK ((source = ANY (ARRAY['specifications'::text, 'name'::text, 'brand_id'::text, 'taxonomy'::text]))),
    CONSTRAINT marketplace_memory_facts_validation_status_check CHECK ((validation_status = ANY (ARRAY['unvalidated'::text, 'confirmed'::text, 'invalidated'::text])))
);


--
-- Name: merchant_analytics_daily; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_analytics_daily (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    date date NOT NULL,
    views integer DEFAULT 0 NOT NULL,
    unique_visitors integer DEFAULT 0 NOT NULL,
    product_impressions integer DEFAULT 0 NOT NULL,
    product_clicks integer DEFAULT 0 NOT NULL,
    contact_clicks integer DEFAULT 0 NOT NULL,
    whatsapp_clicks integer DEFAULT 0 NOT NULL,
    phone_clicks integer DEFAULT 0 NOT NULL,
    website_clicks integer DEFAULT 0 NOT NULL,
    offer_saves integer DEFAULT 0 NOT NULL,
    search_appearances integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_analytics_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_analytics_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    store_id uuid,
    product_id uuid,
    event_type text NOT NULL,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_attribute_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_attribute_patterns (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    store_id uuid NOT NULL,
    raw_key text NOT NULL,
    concept text NOT NULL,
    confidence text DEFAULT 'medium'::text NOT NULL,
    occurrences integer DEFAULT 1 NOT NULL,
    algorithm_version text NOT NULL,
    validation_status text DEFAULT 'unvalidated'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resolved_value text,
    CONSTRAINT merchant_attribute_patterns_concept_check CHECK ((concept = ANY (ARRAY['manufacturer_code'::text, 'model'::text, 'category'::text, 'brand'::text, 'family'::text, 'line'::text, 'capacity_gb'::text, 'ram_gb'::text, 'screen_size_in'::text, 'color'::text, 'voltage'::text, 'power_w'::text, 'ean'::text, 'bundle_includes'::text, 'processor'::text, 'gpu'::text]))),
    CONSTRAINT merchant_attribute_patterns_confidence_check CHECK ((confidence = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text]))),
    CONSTRAINT merchant_attribute_patterns_occurrences_check CHECK ((occurrences > 0)),
    CONSTRAINT merchant_attribute_patterns_validation_status_check CHECK ((validation_status = ANY (ARRAY['unvalidated'::text, 'confirmed'::text, 'invalidated'::text])))
);


--
-- Name: COLUMN merchant_attribute_patterns.resolved_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchant_attribute_patterns.resolved_value IS 'Mission Ω-Gatekeeper: quando concept=brand ou concept=category, o valor canônico correto para este raw_key (ex.: raw_key="Apple Inc" -> resolved_value="Apple"). NULL para os usos anteriores desta tabela (mapeamento chave->conceito de especificação), preservados como estavam.';


--
-- Name: merchant_audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid,
    user_id uuid,
    event_type text NOT NULL,
    payload jsonb,
    ip_address text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    badge_type text NOT NULL,
    granted_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    revoked_at timestamp with time zone,
    revoke_reason text,
    granted_by uuid,
    is_active boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT merchant_badges_badge_type_check CHECK ((badge_type = ANY (ARRAY['none'::text, 'basic'::text, 'verified'::text, 'premium'::text])))
);


--
-- Name: TABLE merchant_badges; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_badges IS 'Badges públicos de merchants. is_active = true indica badge vigente. Apenas um badge ativo por merchant.';


--
-- Name: merchant_catalog_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_catalog_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    health_score integer NOT NULL,
    products_ideal integer DEFAULT 0 NOT NULL,
    products_attention integer DEFAULT 0 NOT NULL,
    products_critical integer DEFAULT 0 NOT NULL,
    total_products integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_catalog_snapshots_health_score_check CHECK (((health_score >= 0) AND (health_score <= 100))),
    CONSTRAINT merchant_catalog_snapshots_products_attention_check CHECK ((products_attention >= 0)),
    CONSTRAINT merchant_catalog_snapshots_products_critical_check CHECK ((products_critical >= 0)),
    CONSTRAINT merchant_catalog_snapshots_products_ideal_check CHECK ((products_ideal >= 0)),
    CONSTRAINT merchant_catalog_snapshots_total_products_check CHECK ((total_products >= 0))
);


--
-- Name: merchant_decision_actions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_decision_actions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    rule_id text NOT NULL,
    recommendation_id text NOT NULL,
    title text NOT NULL,
    category text NOT NULL,
    priority text NOT NULL,
    status text NOT NULL,
    notes text,
    acted_at timestamp with time zone,
    scheduled_for timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_decision_actions_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'completed'::text, 'ignored'::text, 'postponed'::text])))
);


--
-- Name: merchant_delegates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_delegates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    invited_email text NOT NULL,
    user_id uuid,
    role text NOT NULL,
    status text DEFAULT 'invited'::text NOT NULL,
    invite_token text NOT NULL,
    invited_by uuid,
    invited_at timestamp with time zone DEFAULT now() NOT NULL,
    accepted_at timestamp with time zone,
    revoked_at timestamp with time zone,
    CONSTRAINT merchant_delegates_role_check CHECK ((role = ANY (ARRAY['manager'::text, 'marketing'::text, 'agency'::text, 'administrator'::text, 'operator'::text]))),
    CONSTRAINT merchant_delegates_status_check CHECK ((status = ANY (ARRAY['invited'::text, 'active'::text, 'revoked'::text])))
);


--
-- Name: merchant_growth_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_growth_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    recommendation_id text NOT NULL,
    strategy_id text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    event_type text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    CONSTRAINT merchant_growth_history_event_type_check CHECK ((event_type = ANY (ARRAY['viewed'::text, 'accepted'::text, 'ignored'::text, 'completed'::text])))
);


--
-- Name: merchant_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_plans (
    plan text NOT NULL,
    display_name text NOT NULL,
    max_stores integer DEFAULT 1 NOT NULL,
    max_products integer DEFAULT 100 NOT NULL,
    max_imports_month integer DEFAULT 5 NOT NULL,
    has_api_access boolean DEFAULT false NOT NULL,
    has_analytics boolean DEFAULT false NOT NULL,
    has_connectors boolean DEFAULT false NOT NULL,
    has_priority_rank boolean DEFAULT false NOT NULL,
    price_monthly numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_recommendations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_recommendations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    type text NOT NULL,
    priority text DEFAULT 'info'::text NOT NULL,
    title text NOT NULL,
    body text NOT NULL,
    metadata jsonb,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_recommendations_priority_check CHECK ((priority = ANY (ARRAY['critical'::text, 'warning'::text, 'info'::text])))
);


--
-- Name: merchant_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_reviews (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    reviewer_id uuid NOT NULL,
    rating integer NOT NULL,
    title text,
    body text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    is_verified_purchase boolean DEFAULT false NOT NULL,
    purchase_ref uuid,
    merchant_reply text,
    merchant_reply_at timestamp with time zone,
    edited_at timestamp with time zone,
    edit_count integer DEFAULT 0 NOT NULL,
    helpful_count integer DEFAULT 0 NOT NULL,
    report_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT merchant_reviews_body_check CHECK (((char_length(body) >= 10) AND (char_length(body) <= 2000))),
    CONSTRAINT merchant_reviews_rating_check CHECK (((rating >= 1) AND (rating <= 5))),
    CONSTRAINT merchant_reviews_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'hidden'::text, 'removed'::text])))
);


--
-- Name: merchant_stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    is_primary boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_timeline; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_timeline (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    event_type text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    reference_id uuid,
    reference_type text,
    visibility text DEFAULT 'public'::text NOT NULL,
    occurred_at timestamp with time zone DEFAULT now() NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_timeline_category_check CHECK ((category = ANY (ARRAY['verification'::text, 'review'::text, 'badge'::text, 'profile'::text, 'operational'::text]))),
    CONSTRAINT merchant_timeline_visibility_check CHECK ((visibility = ANY (ARRAY['public'::text, 'merchant_only'::text, 'admin_only'::text])))
);


--
-- Name: merchant_trust; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_trust (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    trust_score integer DEFAULT 0 NOT NULL,
    status text DEFAULT 'unverified'::text NOT NULL,
    badge_level text DEFAULT 'none'::text NOT NULL,
    last_verified_at timestamp with time zone,
    last_event_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_trust_badge_level_check CHECK ((badge_level = ANY (ARRAY['none'::text, 'basic'::text, 'verified'::text, 'premium'::text]))),
    CONSTRAINT merchant_trust_status_check CHECK ((status = ANY (ARRAY['unverified'::text, 'pending'::text, 'verified'::text, 'suspended'::text, 'rejected'::text]))),
    CONSTRAINT merchant_trust_trust_score_check CHECK (((trust_score >= 0) AND (trust_score <= 100)))
);


--
-- Name: TABLE merchant_trust; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_trust IS 'Estado de confiança atual de cada merchant. Um registro por merchant.';


--
-- Name: COLUMN merchant_trust.trust_score; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchant_trust.trust_score IS 'Score 0-100. Não computado automaticamente nesta migration — resultado de algoritmo definido em ADR-041.';


--
-- Name: COLUMN merchant_trust.badge_level; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchant_trust.badge_level IS 'Badge público exibido ao comprador. Concedido manualmente pelo admin até Sprint 1.5.5.';


--
-- Name: merchant_trust_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_trust_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    merchant_trust_id uuid,
    event_type text NOT NULL,
    source text NOT NULL,
    reason text,
    delta integer DEFAULT 0 NOT NULL,
    score_before integer,
    score_after integer,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    CONSTRAINT merchant_trust_events_source_check CHECK ((source = ANY (ARRAY['system'::text, 'admin'::text, 'merchant'::text, 'buyer'::text, 'crawler'::text])))
);


--
-- Name: TABLE merchant_trust_events; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_trust_events IS 'Log imutável de eventos de trust. Fonte primária do ParaguAI Brain para MerchantTrust e HistoricalData.';


--
-- Name: COLUMN merchant_trust_events.delta; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchant_trust_events.delta IS 'Variação do trust_score causada por este evento. 0 = evento informacional sem impacto em score.';


--
-- Name: COLUMN merchant_trust_events.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.merchant_trust_events.metadata IS 'Payload livre por tipo de evento. Schema por event_type documentado em src/domains/trust/events/event-registry.ts.';


--
-- Name: merchant_upgrade_leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_upgrade_leads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    trigger_context text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: merchant_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchant_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    verification_type text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    submitted_at timestamp with time zone DEFAULT now() NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    rejection_reason text,
    expires_at timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchant_verifications_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'expired'::text, 'revoked'::text]))),
    CONSTRAINT merchant_verifications_verification_type_check CHECK ((verification_type = ANY (ARRAY['document'::text, 'address'::text, 'phone'::text, 'email'::text, 'bank'::text, 'social_media'::text, 'manual'::text, 'identity'::text, 'company'::text, 'location'::text, 'contact'::text, 'hours'::text, 'operation'::text, 'partner'::text, 'documentation'::text, 'store_claim'::text])))
);


--
-- Name: TABLE merchant_verifications; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.merchant_verifications IS 'Verificações formais de identidade e documentação do merchant.';


--
-- Name: merchants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merchants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    company_name text DEFAULT ''::text NOT NULL,
    company_doc text,
    company_website text,
    contact_phone text,
    contact_whatsapp text,
    contact_email text,
    onboarding_step integer DEFAULT 0 NOT NULL,
    onboarding_done boolean DEFAULT false NOT NULL,
    status text DEFAULT 'draft'::text NOT NULL,
    plan text DEFAULT 'free'::text NOT NULL,
    merchant_score integer DEFAULT 0 NOT NULL,
    trust_score integer DEFAULT 0 NOT NULL,
    verified_level text DEFAULT 'none'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merchants_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'pending'::text, 'active'::text, 'suspended'::text, 'blocked'::text]))),
    CONSTRAINT merchants_verified_level_check CHECK ((verified_level = ANY (ARRAY['none'::text, 'verified'::text, 'premium'::text, 'official'::text])))
);


--
-- Name: merge_candidates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merge_candidates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_canonical_product_id uuid NOT NULL,
    target_canonical_product_id uuid NOT NULL,
    confidence numeric(5,2) NOT NULL,
    algorithm_version text NOT NULL,
    matched_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    mismatched_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    penalties jsonb DEFAULT '[]'::jsonb NOT NULL,
    reason text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_at timestamp with time zone,
    reviewed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT merge_candidates_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text, 'ignored'::text, 'merged'::text, 'rolled_back'::text])))
);


--
-- Name: merge_executions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.merge_executions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merge_candidate_id uuid NOT NULL,
    source_canonical_product_id uuid NOT NULL,
    target_canonical_product_id uuid NOT NULL,
    moved_offer_ids jsonb DEFAULT '[]'::jsonb NOT NULL,
    status text DEFAULT 'executed'::text NOT NULL,
    executed_at timestamp with time zone DEFAULT now() NOT NULL,
    executed_by text,
    rolled_back_at timestamp with time zone,
    rolled_back_by text,
    CONSTRAINT merge_executions_status_check CHECK ((status = ANY (ARRAY['executed'::text, 'rolled_back'::text])))
);


--
-- Name: model_aliases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.model_aliases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    brand_slug text NOT NULL,
    raw_token text NOT NULL,
    canonical_model text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: offers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.offers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid,
    store_id uuid,
    price_usd numeric(10,2),
    price_brl numeric,
    old_price numeric,
    installment text,
    in_stock boolean DEFAULT true,
    stock_quantity integer,
    product_url text,
    updated_by_ai boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    currency text,
    condition text,
    warranty text,
    cashback numeric,
    pix_discount numeric,
    delivery boolean,
    pickup boolean,
    available boolean,
    source text,
    created_at timestamp without time zone,
    canonical_product_id uuid
);


--
-- Name: price_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.price_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    offer_id uuid NOT NULL,
    price_usd numeric NOT NULL,
    price_brl numeric,
    old_price_usd numeric,
    source text DEFAULT 'manual'::text NOT NULL,
    recorded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: product_identifiers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_identifiers (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    product_id uuid NOT NULL,
    identifier_type text NOT NULL,
    identifier_value text NOT NULL,
    brand_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_identifiers_identifier_type_check CHECK ((identifier_type = ANY (ARRAY['ean'::text, 'manufacturer_code'::text])))
);


--
-- Name: product_identity_match_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.product_identity_match_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    batch_id text NOT NULL,
    connector_id text NOT NULL,
    candidate_slug text NOT NULL,
    candidate_store_slug text NOT NULL,
    suggested_product_id uuid,
    suggested_product_slug text,
    algorithm_version text NOT NULL,
    confidence_score numeric(5,2) NOT NULL,
    tier text NOT NULL,
    strategy text NOT NULL,
    matched_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    mismatched_attributes jsonb DEFAULT '[]'::jsonb NOT NULL,
    penalties jsonb DEFAULT '[]'::jsonb NOT NULL,
    final_decision text NOT NULL,
    explainability_reason text NOT NULL,
    processing_time_ms integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT product_identity_match_log_final_decision_check CHECK ((final_decision = ANY (ARRAY['auto-merge'::text, 'review'::text, 'new-product'::text]))),
    CONSTRAINT product_identity_match_log_strategy_check CHECK ((strategy = ANY (ARRAY['exact-slug'::text, 'fuzzy-attribute'::text]))),
    CONSTRAINT product_identity_match_log_tier_check CHECK ((tier = ANY (ARRAY['auto'::text, 'probable'::text, 'possible'::text, 'new_product'::text])))
);


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    image_url text,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    slug text,
    brand_id uuid,
    category_id uuid,
    model text,
    sku text,
    gtin text,
    gallery jsonb,
    specifications jsonb,
    active boolean DEFAULT true,
    weight numeric,
    featured boolean DEFAULT false,
    created_by_ai boolean DEFAULT false,
    normalized_name text,
    search_keywords jsonb,
    aliases jsonb,
    release_date date,
    updated_at timestamp with time zone,
    popularity_score numeric
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    email text,
    created_at timestamp without time zone DEFAULT now(),
    role text DEFAULT 'operator'::text NOT NULL,
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['admin'::text, 'operator'::text, 'merchant'::text])))
);


--
-- Name: review_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    action text NOT NULL,
    previous_body text,
    new_body text,
    previous_status text,
    new_status text,
    performed_by uuid,
    performed_by_role text,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT review_history_action_check CHECK ((action = ANY (ARRAY['created'::text, 'edited'::text, 'approved'::text, 'hidden'::text, 'removed'::text, 'restored'::text, 'merchant_replied'::text, 'report_added'::text, 'marked_helpful'::text])))
);


--
-- Name: review_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.review_reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    review_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    reporter_id uuid NOT NULL,
    reason text NOT NULL,
    description text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    action_taken text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT review_reports_description_check CHECK ((char_length(description) <= 1000)),
    CONSTRAINT review_reports_reason_check CHECK ((reason = ANY (ARRAY['spam'::text, 'fake'::text, 'offensive'::text, 'irrelevant'::text, 'conflict_of_interest'::text, 'other'::text]))),
    CONSTRAINT review_reports_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'reviewed'::text, 'dismissed'::text, 'actioned'::text])))
);


--
-- Name: signal_provenance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.signal_provenance (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    signal_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    generated_by uuid,
    verification_id uuid,
    evidence_summary text DEFAULT ''::text NOT NULL,
    how_obtained text DEFAULT ''::text NOT NULL,
    approved_by uuid,
    trust_level text DEFAULT 'medium'::text NOT NULL,
    is_auditable boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT signal_provenance_trust_level_check CHECK ((trust_level = ANY (ARRAY['high'::text, 'medium'::text, 'low'::text])))
);


--
-- Name: store_claims; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.store_claims (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    store_id uuid NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    claimant_name text NOT NULL,
    claimant_phone text NOT NULL,
    claimant_email text NOT NULL,
    claimant_role text NOT NULL,
    automated_confidence numeric(5,2) DEFAULT 0 NOT NULL,
    signal_breakdown jsonb DEFAULT '[]'::jsonb NOT NULL,
    verification_id uuid,
    rejection_reason text,
    admin_note text,
    reviewed_at timestamp with time zone,
    reviewed_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT store_claims_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'awaiting_review'::text, 'approved'::text, 'rejected'::text, 'cancelled'::text])))
);


--
-- Name: stores; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stores (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    whatsapp text,
    website text,
    address text,
    city text DEFAULT 'Ciudad del Este'::text,
    rating numeric(2,1) DEFAULT 5.0,
    created_at timestamp without time zone DEFAULT now(),
    logo_url text,
    instagram text,
    is_verified boolean DEFAULT true,
    opening_hours text DEFAULT 'Seg-Sáb 06:30 às 17:00'::text,
    latitude numeric,
    longitude numeric,
    slug text,
    cover_image text,
    delivery boolean,
    pickup boolean,
    pix_br boolean,
    active boolean,
    phone text,
    email text,
    country text DEFAULT 'Paraguai'::text,
    discovered_at timestamp with time zone,
    discovery_connector_key text
);


--
-- Name: trust_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    snapshot_date date DEFAULT CURRENT_DATE NOT NULL,
    trust_score integer NOT NULL,
    status text NOT NULL,
    badge_level text,
    event_count integer DEFAULT 0 NOT NULL,
    verification_count integer DEFAULT 0 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE trust_history; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.trust_history IS 'Histórico permanente de snapshots diários de trust. INSERT-ONLY — nunca atualizar ou deletar entradas históricas.';


--
-- Name: trust_signals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.trust_signals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    merchant_id uuid NOT NULL,
    signal_type text NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    category text NOT NULL,
    title text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    evidence_summary text DEFAULT ''::text NOT NULL,
    source text DEFAULT 'admin'::text NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    issued_at timestamp with time zone DEFAULT now() NOT NULL,
    expires_at timestamp with time zone,
    last_updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_public boolean DEFAULT true NOT NULL,
    verification_id uuid,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT trust_signals_category_check CHECK ((category = ANY (ARRAY['identity'::text, 'business'::text, 'operational'::text, 'compliance'::text]))),
    CONSTRAINT trust_signals_status_check CHECK ((status = ANY (ARRAY['active'::text, 'inactive'::text, 'expired'::text, 'revoked'::text])))
);


--
-- Name: universal_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.universal_categories (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    parent_id uuid,
    level integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: verification_evidence; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_evidence (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    verification_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    evidence_type text NOT NULL,
    label text NOT NULL,
    content text,
    file_path text,
    mime_type text,
    file_size_bytes bigint,
    uploaded_by uuid,
    is_valid boolean,
    review_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    CONSTRAINT verification_evidence_evidence_type_check CHECK ((evidence_type = ANY (ARRAY['document'::text, 'image'::text, 'url'::text, 'text'::text, 'json'::text]))),
    CONSTRAINT verification_evidence_file_size_bytes_check CHECK (((file_size_bytes IS NULL) OR (file_size_bytes >= 0)))
);


--
-- Name: verification_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    verification_id uuid NOT NULL,
    merchant_id uuid NOT NULL,
    action text NOT NULL,
    previous_status text,
    new_status text,
    performed_by uuid,
    performed_by_role text,
    reason text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_history_action_check CHECK ((action = ANY (ARRAY['created'::text, 'submitted'::text, 'approved'::text, 'rejected'::text, 'revoked'::text, 'expired'::text, 'evidence_added'::text, 'evidence_removed'::text, 'metadata_updated'::text]))),
    CONSTRAINT verification_history_performed_by_role_check CHECK ((performed_by_role = ANY (ARRAY['admin'::text, 'merchant'::text, 'system'::text, 'buyer'::text])))
);


--
-- Name: verification_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification_types (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    label text NOT NULL,
    description text DEFAULT ''::text NOT NULL,
    category text NOT NULL,
    requires_evidence boolean DEFAULT false NOT NULL,
    validity_days integer,
    sort_order integer DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT verification_types_category_check CHECK ((category = ANY (ARRAY['identity'::text, 'business'::text, 'operational'::text, 'compliance'::text]))),
    CONSTRAINT verification_types_validity_days_check CHECK (((validity_days IS NULL) OR (validity_days > 0)))
);


--
-- Name: attribute_dictionary attribute_dictionary_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_dictionary
    ADD CONSTRAINT attribute_dictionary_key_key UNIQUE (key);


--
-- Name: attribute_dictionary attribute_dictionary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.attribute_dictionary
    ADD CONSTRAINT attribute_dictionary_pkey PRIMARY KEY (id);


--
-- Name: brand_universal_map brand_universal_map_brand_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_universal_map
    ADD CONSTRAINT brand_universal_map_brand_id_key UNIQUE (brand_id);


--
-- Name: brand_universal_map brand_universal_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_universal_map
    ADD CONSTRAINT brand_universal_map_pkey PRIMARY KEY (id);


--
-- Name: brands brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_pkey PRIMARY KEY (id);


--
-- Name: brands brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_key UNIQUE (slug);


--
-- Name: brands brands_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brands
    ADD CONSTRAINT brands_slug_unique UNIQUE (slug);


--
-- Name: buyer_alert_candidates buyer_alert_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_alert_candidates
    ADD CONSTRAINT buyer_alert_candidates_pkey PRIMARY KEY (id);


--
-- Name: buyer_events buyer_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_pkey PRIMARY KEY (id);


--
-- Name: buyer_sessions buyer_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_sessions
    ADD CONSTRAINT buyer_sessions_pkey PRIMARY KEY (id);


--
-- Name: canonical_bootstrap_checkpoint canonical_bootstrap_checkpoint_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_bootstrap_checkpoint
    ADD CONSTRAINT canonical_bootstrap_checkpoint_pkey PRIMARY KEY (id);


--
-- Name: canonical_bootstrap_checkpoint canonical_bootstrap_checkpoint_run_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_bootstrap_checkpoint
    ADD CONSTRAINT canonical_bootstrap_checkpoint_run_key_key UNIQUE (run_key);


--
-- Name: canonical_brands canonical_brands_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_brands
    ADD CONSTRAINT canonical_brands_pkey PRIMARY KEY (id);


--
-- Name: canonical_brands canonical_brands_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_brands
    ADD CONSTRAINT canonical_brands_slug_key UNIQUE (slug);


--
-- Name: canonical_products canonical_products_canonical_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_products
    ADD CONSTRAINT canonical_products_canonical_slug_key UNIQUE (canonical_slug);


--
-- Name: canonical_products canonical_products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_products
    ADD CONSTRAINT canonical_products_pkey PRIMARY KEY (id);


--
-- Name: canonical_suggestion_outbox canonical_suggestion_outbox_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_suggestion_outbox
    ADD CONSTRAINT canonical_suggestion_outbox_pkey PRIMARY KEY (id);


--
-- Name: catalog_pending_reviews catalog_pending_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_pending_reviews
    ADD CONSTRAINT catalog_pending_reviews_pkey PRIMARY KEY (id);


--
-- Name: catalog_recovery_decisions catalog_recovery_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_recovery_decisions
    ADD CONSTRAINT catalog_recovery_decisions_pkey PRIMARY KEY (id);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: categories categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_key UNIQUE (slug);


--
-- Name: categories categories_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_slug_unique UNIQUE (slug);


--
-- Name: category_universal_map category_universal_map_category_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_universal_map
    ADD CONSTRAINT category_universal_map_category_id_key UNIQUE (category_id);


--
-- Name: category_universal_map category_universal_map_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_universal_map
    ADD CONSTRAINT category_universal_map_pkey PRIMARY KEY (id);


--
-- Name: connector_configs connector_configs_connector_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_configs
    ADD CONSTRAINT connector_configs_connector_id_key UNIQUE (connector_id);


--
-- Name: connector_configs connector_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_configs
    ADD CONSTRAINT connector_configs_pkey PRIMARY KEY (id);


--
-- Name: connector_sync_runs connector_sync_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_runs
    ADD CONSTRAINT connector_sync_runs_pkey PRIMARY KEY (id);


--
-- Name: connector_url_snapshots connector_url_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_url_snapshots
    ADD CONSTRAINT connector_url_snapshots_pkey PRIMARY KEY (id);


--
-- Name: connectors connectors_connector_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connectors
    ADD CONSTRAINT connectors_connector_key_key UNIQUE (connector_key);


--
-- Name: connectors connectors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connectors
    ADD CONSTRAINT connectors_pkey PRIMARY KEY (id);


--
-- Name: exchange_conversion_log exchange_conversion_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_conversion_log
    ADD CONSTRAINT exchange_conversion_log_pkey PRIMARY KEY (id);


--
-- Name: exchange_provider_runs exchange_provider_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_provider_runs
    ADD CONSTRAINT exchange_provider_runs_pkey PRIMARY KEY (id);


--
-- Name: exchange_rates exchange_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exchange_rates
    ADD CONSTRAINT exchange_rates_pkey PRIMARY KEY (id);


--
-- Name: favorites favorites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_pkey PRIMARY KEY (id);


--
-- Name: import_logs import_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.import_logs
    ADD CONSTRAINT import_logs_pkey PRIMARY KEY (id);


--
-- Name: knowledge_history knowledge_history_knowledge_key_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_history
    ADD CONSTRAINT knowledge_history_knowledge_key_version_key UNIQUE (knowledge_key, version);


--
-- Name: knowledge_history knowledge_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_history
    ADD CONSTRAINT knowledge_history_pkey PRIMARY KEY (id);


--
-- Name: market_changes market_changes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_changes
    ADD CONSTRAINT market_changes_pkey PRIMARY KEY (id);


--
-- Name: market_pulse_snapshots market_pulse_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pulse_snapshots
    ADD CONSTRAINT market_pulse_snapshots_pkey PRIMARY KEY (id);


--
-- Name: market_pulse_snapshots market_pulse_snapshots_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_pulse_snapshots
    ADD CONSTRAINT market_pulse_snapshots_snapshot_date_key UNIQUE (snapshot_date);


--
-- Name: marketplace_alerts marketplace_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_alerts
    ADD CONSTRAINT marketplace_alerts_pkey PRIMARY KEY (id);


--
-- Name: marketplace_health_snapshots marketplace_health_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_health_snapshots
    ADD CONSTRAINT marketplace_health_snapshots_pkey PRIMARY KEY (id);


--
-- Name: marketplace_health_snapshots marketplace_health_snapshots_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_health_snapshots
    ADD CONSTRAINT marketplace_health_snapshots_snapshot_date_key UNIQUE (snapshot_date);


--
-- Name: marketplace_memory_facts marketplace_memory_facts_canonical_product_id_fact_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_memory_facts
    ADD CONSTRAINT marketplace_memory_facts_canonical_product_id_fact_type_key UNIQUE (canonical_product_id, fact_type);


--
-- Name: marketplace_memory_facts marketplace_memory_facts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_memory_facts
    ADD CONSTRAINT marketplace_memory_facts_pkey PRIMARY KEY (id);


--
-- Name: merchant_analytics_daily merchant_analytics_daily_merchant_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_daily
    ADD CONSTRAINT merchant_analytics_daily_merchant_id_date_key UNIQUE (merchant_id, date);


--
-- Name: merchant_analytics_daily merchant_analytics_daily_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_daily
    ADD CONSTRAINT merchant_analytics_daily_pkey PRIMARY KEY (id);


--
-- Name: merchant_analytics_events merchant_analytics_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_events
    ADD CONSTRAINT merchant_analytics_events_pkey PRIMARY KEY (id);


--
-- Name: merchant_attribute_patterns merchant_attribute_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_attribute_patterns
    ADD CONSTRAINT merchant_attribute_patterns_pkey PRIMARY KEY (id);


--
-- Name: merchant_attribute_patterns merchant_attribute_patterns_store_id_raw_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_attribute_patterns
    ADD CONSTRAINT merchant_attribute_patterns_store_id_raw_key_key UNIQUE (store_id, raw_key);


--
-- Name: merchant_audit_logs merchant_audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_audit_logs
    ADD CONSTRAINT merchant_audit_logs_pkey PRIMARY KEY (id);


--
-- Name: merchant_badges merchant_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_badges
    ADD CONSTRAINT merchant_badges_pkey PRIMARY KEY (id);


--
-- Name: merchant_catalog_snapshots merchant_catalog_snapshots_merchant_id_snapshot_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_catalog_snapshots
    ADD CONSTRAINT merchant_catalog_snapshots_merchant_id_snapshot_date_key UNIQUE (merchant_id, snapshot_date);


--
-- Name: merchant_catalog_snapshots merchant_catalog_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_catalog_snapshots
    ADD CONSTRAINT merchant_catalog_snapshots_pkey PRIMARY KEY (id);


--
-- Name: merchant_decision_actions merchant_decision_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_decision_actions
    ADD CONSTRAINT merchant_decision_actions_pkey PRIMARY KEY (id);


--
-- Name: merchant_delegates merchant_delegates_invite_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_delegates
    ADD CONSTRAINT merchant_delegates_invite_token_key UNIQUE (invite_token);


--
-- Name: merchant_delegates merchant_delegates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_delegates
    ADD CONSTRAINT merchant_delegates_pkey PRIMARY KEY (id);


--
-- Name: merchant_growth_history merchant_growth_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_growth_history
    ADD CONSTRAINT merchant_growth_history_pkey PRIMARY KEY (id);


--
-- Name: merchant_plans merchant_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_plans
    ADD CONSTRAINT merchant_plans_pkey PRIMARY KEY (plan);


--
-- Name: merchant_recommendations merchant_recommendations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_recommendations
    ADD CONSTRAINT merchant_recommendations_pkey PRIMARY KEY (id);


--
-- Name: merchant_reviews merchant_reviews_merchant_id_reviewer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_reviews
    ADD CONSTRAINT merchant_reviews_merchant_id_reviewer_id_key UNIQUE (merchant_id, reviewer_id);


--
-- Name: merchant_reviews merchant_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_reviews
    ADD CONSTRAINT merchant_reviews_pkey PRIMARY KEY (id);


--
-- Name: merchant_stores merchant_stores_merchant_id_store_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_stores
    ADD CONSTRAINT merchant_stores_merchant_id_store_id_key UNIQUE (merchant_id, store_id);


--
-- Name: merchant_stores merchant_stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_stores
    ADD CONSTRAINT merchant_stores_pkey PRIMARY KEY (id);


--
-- Name: merchant_timeline merchant_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_timeline
    ADD CONSTRAINT merchant_timeline_pkey PRIMARY KEY (id);


--
-- Name: merchant_trust_events merchant_trust_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust_events
    ADD CONSTRAINT merchant_trust_events_pkey PRIMARY KEY (id);


--
-- Name: merchant_trust merchant_trust_merchant_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust
    ADD CONSTRAINT merchant_trust_merchant_unique UNIQUE (merchant_id);


--
-- Name: merchant_trust merchant_trust_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust
    ADD CONSTRAINT merchant_trust_pkey PRIMARY KEY (id);


--
-- Name: merchant_upgrade_leads merchant_upgrade_leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_upgrade_leads
    ADD CONSTRAINT merchant_upgrade_leads_pkey PRIMARY KEY (id);


--
-- Name: merchant_verifications merchant_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_verifications
    ADD CONSTRAINT merchant_verifications_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_pkey PRIMARY KEY (id);


--
-- Name: merchants merchants_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_user_id_key UNIQUE (user_id);


--
-- Name: merge_candidates merge_candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_candidates
    ADD CONSTRAINT merge_candidates_pkey PRIMARY KEY (id);


--
-- Name: merge_candidates merge_candidates_source_canonical_product_id_target_canonic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_candidates
    ADD CONSTRAINT merge_candidates_source_canonical_product_id_target_canonic_key UNIQUE (source_canonical_product_id, target_canonical_product_id);


--
-- Name: merge_executions merge_executions_merge_candidate_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_executions
    ADD CONSTRAINT merge_executions_merge_candidate_id_key UNIQUE (merge_candidate_id);


--
-- Name: merge_executions merge_executions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_executions
    ADD CONSTRAINT merge_executions_pkey PRIMARY KEY (id);


--
-- Name: model_aliases model_aliases_brand_slug_raw_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_aliases
    ADD CONSTRAINT model_aliases_brand_slug_raw_token_key UNIQUE (brand_slug, raw_token);


--
-- Name: model_aliases model_aliases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.model_aliases
    ADD CONSTRAINT model_aliases_pkey PRIMARY KEY (id);


--
-- Name: offers offers_product_store_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_product_store_unique UNIQUE (product_id, store_id);


--
-- Name: price_history price_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_pkey PRIMARY KEY (id);


--
-- Name: offers prices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT prices_pkey PRIMARY KEY (id);


--
-- Name: product_identifiers product_identifiers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identifiers
    ADD CONSTRAINT product_identifiers_pkey PRIMARY KEY (id);


--
-- Name: product_identifiers product_identifiers_product_id_identifier_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identifiers
    ADD CONSTRAINT product_identifiers_product_id_identifier_type_key UNIQUE (product_id, identifier_type);


--
-- Name: product_identity_match_log product_identity_match_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identity_match_log
    ADD CONSTRAINT product_identity_match_log_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_slug_unique UNIQUE (slug);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: review_history review_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_history
    ADD CONSTRAINT review_history_pkey PRIMARY KEY (id);


--
-- Name: review_reports review_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_pkey PRIMARY KEY (id);


--
-- Name: review_reports review_reports_review_id_reporter_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_review_id_reporter_id_key UNIQUE (review_id, reporter_id);


--
-- Name: signal_provenance signal_provenance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_pkey PRIMARY KEY (id);


--
-- Name: store_claims store_claims_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_claims
    ADD CONSTRAINT store_claims_pkey PRIMARY KEY (id);


--
-- Name: stores stores_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_pkey PRIMARY KEY (id);


--
-- Name: stores stores_slug_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stores
    ADD CONSTRAINT stores_slug_unique UNIQUE (slug);


--
-- Name: trust_history trust_history_merchant_date_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_history
    ADD CONSTRAINT trust_history_merchant_date_unique UNIQUE (merchant_id, snapshot_date);


--
-- Name: trust_history trust_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_history
    ADD CONSTRAINT trust_history_pkey PRIMARY KEY (id);


--
-- Name: trust_signals trust_signals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_signals
    ADD CONSTRAINT trust_signals_pkey PRIMARY KEY (id);


--
-- Name: universal_categories universal_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universal_categories
    ADD CONSTRAINT universal_categories_pkey PRIMARY KEY (id);


--
-- Name: universal_categories universal_categories_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universal_categories
    ADD CONSTRAINT universal_categories_slug_key UNIQUE (slug);


--
-- Name: verification_evidence verification_evidence_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_evidence
    ADD CONSTRAINT verification_evidence_pkey PRIMARY KEY (id);


--
-- Name: verification_history verification_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_history
    ADD CONSTRAINT verification_history_pkey PRIMARY KEY (id);


--
-- Name: verification_types verification_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_types
    ADD CONSTRAINT verification_types_pkey PRIMARY KEY (id);


--
-- Name: buyer_events_unsynced_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX buyer_events_unsynced_merchant_idx ON public.buyer_events USING btree (merchant_id) WHERE ((merchant_id IS NOT NULL) AND (brain_synced_at IS NULL));


--
-- Name: idx_badges_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_active ON public.merchant_badges USING btree (merchant_id) WHERE (is_active = true);


--
-- Name: idx_badges_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_badges_merchant_id ON public.merchant_badges USING btree (merchant_id);


--
-- Name: idx_brand_universal_map_canonical; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_brand_universal_map_canonical ON public.brand_universal_map USING btree (canonical_brand_id);


--
-- Name: idx_buyer_alert_candidates_rate_limit_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_buyer_alert_candidates_rate_limit_key ON public.buyer_alert_candidates USING btree (rate_limit_key);


--
-- Name: idx_buyer_alert_candidates_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_alert_candidates_status_created ON public.buyer_alert_candidates USING btree (status, created_at DESC);


--
-- Name: idx_buyer_events_anon_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_anon_time ON public.buyer_events USING btree (anonymous_id, occurred_at DESC);


--
-- Name: idx_buyer_events_buyer_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_buyer_time ON public.buyer_events USING btree (buyer_id, occurred_at DESC) WHERE (buyer_id IS NOT NULL);


--
-- Name: idx_buyer_events_merchant_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_merchant_time ON public.buyer_events USING btree (merchant_id, occurred_at DESC) WHERE (merchant_id IS NOT NULL);


--
-- Name: idx_buyer_events_product_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_product_time ON public.buyer_events USING btree (product_id, occurred_at DESC) WHERE (product_id IS NOT NULL);


--
-- Name: idx_buyer_events_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_search ON public.buyer_events USING btree (event_type, occurred_at DESC) WHERE (event_type = 'SearchPerformed'::text);


--
-- Name: idx_buyer_events_session; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_session ON public.buyer_events USING btree (session_id, occurred_at) WHERE (session_id IS NOT NULL);


--
-- Name: idx_buyer_events_type_time; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_events_type_time ON public.buyer_events USING btree (event_type, occurred_at DESC);


--
-- Name: idx_buyer_sessions_anon; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_sessions_anon ON public.buyer_sessions USING btree (anonymous_id, started_at DESC);


--
-- Name: idx_buyer_sessions_buyer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_sessions_buyer ON public.buyer_sessions USING btree (buyer_id, started_at DESC) WHERE (buyer_id IS NOT NULL);


--
-- Name: idx_buyer_sessions_started; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_buyer_sessions_started ON public.buyer_sessions USING btree (started_at DESC);


--
-- Name: idx_canonical_products_brand; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canonical_products_brand ON public.canonical_products USING btree (brand_id);


--
-- Name: idx_canonical_products_inactive; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_canonical_products_inactive ON public.canonical_products USING btree (merged_into_id) WHERE (is_active = false);


--
-- Name: idx_category_universal_map_universal; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_category_universal_map_universal ON public.category_universal_map USING btree (universal_category_id);


--
-- Name: idx_cbc_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cbc_status ON public.canonical_bootstrap_checkpoint USING btree (status);


--
-- Name: idx_connector_sync_runs_connector; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_sync_runs_connector ON public.connector_sync_runs USING btree (connector_id, started_at DESC);


--
-- Name: idx_connector_sync_runs_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_sync_runs_merchant ON public.connector_sync_runs USING btree (merchant_id, started_at DESC);


--
-- Name: idx_connector_url_snapshots_connector_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connector_url_snapshots_connector_id ON public.connector_url_snapshots USING btree (connector_id);


--
-- Name: idx_connector_url_snapshots_connector_url; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_connector_url_snapshots_connector_url ON public.connector_url_snapshots USING btree (connector_id, url);


--
-- Name: idx_connectors_store_slug; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_connectors_store_slug ON public.connectors USING btree (store_slug);


--
-- Name: idx_cpr_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpr_status ON public.catalog_pending_reviews USING btree (status);


--
-- Name: idx_cpr_store_field_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpr_store_field_value ON public.catalog_pending_reviews USING btree (store_id, field_type, raw_value);


--
-- Name: idx_crd_layer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crd_layer ON public.catalog_recovery_decisions USING btree (layer);


--
-- Name: idx_crd_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_crd_product ON public.catalog_recovery_decisions USING btree (product_id);


--
-- Name: idx_cso_active_per_canonical; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_cso_active_per_canonical ON public.canonical_suggestion_outbox USING btree (canonical_product_id) WHERE (status = ANY (ARRAY['pending'::text, 'processing'::text]));


--
-- Name: idx_cso_algorithm_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_algorithm_version ON public.canonical_suggestion_outbox USING btree (algorithm_version);


--
-- Name: idx_cso_claim_pending; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_claim_pending ON public.canonical_suggestion_outbox USING btree (next_attempt_at) WHERE (status = 'pending'::text);


--
-- Name: idx_cso_claim_stale; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_claim_stale ON public.canonical_suggestion_outbox USING btree (claimed_at) WHERE (status = 'processing'::text);


--
-- Name: idx_cso_expired; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_expired ON public.canonical_suggestion_outbox USING btree (status) WHERE (status = 'expired'::text);


--
-- Name: idx_cso_priority_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_priority_created ON public.canonical_suggestion_outbox USING btree (priority, created_at);


--
-- Name: idx_cso_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cso_status ON public.canonical_suggestion_outbox USING btree (status);


--
-- Name: idx_exchange_conversion_log_converted_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_conversion_log_converted_at ON public.exchange_conversion_log USING btree (converted_at DESC);


--
-- Name: idx_exchange_provider_runs_provider_attempted; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_provider_runs_provider_attempted ON public.exchange_provider_runs USING btree (provider_id, attempted_at DESC);


--
-- Name: idx_exchange_rates_pair_captured_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_exchange_rates_pair_captured_at ON public.exchange_rates USING btree (pair, captured_at DESC);


--
-- Name: idx_knowledge_history_key_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_history_key_version ON public.knowledge_history USING btree (knowledge_key, version DESC);


--
-- Name: idx_knowledge_history_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_history_store ON public.knowledge_history USING btree (store_id);


--
-- Name: idx_knowledge_history_type_resolved_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_history_type_resolved_value ON public.knowledge_history USING btree (knowledge_type, resolved_value, scope);


--
-- Name: idx_knowledge_history_type_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_knowledge_history_type_scope ON public.knowledge_history USING btree (knowledge_type, scope);


--
-- Name: idx_map_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_map_store ON public.merchant_attribute_patterns USING btree (store_id);


--
-- Name: idx_market_changes_detected_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_changes_detected_at ON public.market_changes USING btree (detected_at DESC);


--
-- Name: idx_market_changes_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_changes_entity ON public.market_changes USING btree (entity_type, entity_id, detected_at DESC);


--
-- Name: idx_market_changes_product_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_changes_product_detected ON public.market_changes USING btree (product_id, detected_at DESC);


--
-- Name: idx_market_changes_store_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_changes_store_detected ON public.market_changes USING btree (store_id, detected_at DESC);


--
-- Name: idx_market_changes_type_detected; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_market_changes_type_detected ON public.market_changes USING btree (change_type, detected_at DESC);


--
-- Name: idx_marketplace_alerts_open_key; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_alerts_open_key ON public.marketplace_alerts USING btree (alert_type, subject_type, subject_id, status);


--
-- Name: idx_marketplace_alerts_status_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_marketplace_alerts_status_created ON public.marketplace_alerts USING btree (status, created_at DESC);


--
-- Name: idx_merchant_analytics_daily_merchant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_analytics_daily_merchant_date ON public.merchant_analytics_daily USING btree (merchant_id, date DESC);


--
-- Name: idx_merchant_catalog_snapshots_merchant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_catalog_snapshots_merchant_date ON public.merchant_catalog_snapshots USING btree (merchant_id, snapshot_date DESC);


--
-- Name: idx_merchant_decision_actions_merchant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_decision_actions_merchant_status ON public.merchant_decision_actions USING btree (merchant_id, status, created_at DESC);


--
-- Name: idx_merchant_decision_actions_rule; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_decision_actions_rule ON public.merchant_decision_actions USING btree (merchant_id, rule_id, status);


--
-- Name: idx_merchant_decision_actions_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_decision_actions_timeline ON public.merchant_decision_actions USING btree (merchant_id, acted_at DESC) WHERE (acted_at IS NOT NULL);


--
-- Name: idx_merchant_delegates_merchant_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_delegates_merchant_status ON public.merchant_delegates USING btree (merchant_id, status);


--
-- Name: idx_merchant_growth_history_event; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_growth_history_event ON public.merchant_growth_history USING btree (merchant_id, event_type, occurred_at DESC);


--
-- Name: idx_merchant_growth_history_recommendation; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_growth_history_recommendation ON public.merchant_growth_history USING btree (merchant_id, recommendation_id);


--
-- Name: idx_merchant_growth_history_timeline; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_growth_history_timeline ON public.merchant_growth_history USING btree (merchant_id, occurred_at DESC);


--
-- Name: idx_merchant_trust_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_trust_merchant_id ON public.merchant_trust USING btree (merchant_id);


--
-- Name: idx_merchant_trust_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_trust_status ON public.merchant_trust USING btree (status);


--
-- Name: idx_merchant_upgrade_leads_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merchant_upgrade_leads_merchant ON public.merchant_upgrade_leads USING btree (merchant_id, created_at DESC);


--
-- Name: idx_merge_candidates_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merge_candidates_status ON public.merge_candidates USING btree (status, created_at DESC);


--
-- Name: idx_merge_executions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_merge_executions_status ON public.merge_executions USING btree (status, executed_at DESC);


--
-- Name: idx_mmf_canonical_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mmf_canonical_product ON public.marketplace_memory_facts USING btree (canonical_product_id);


--
-- Name: idx_mmf_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mmf_merchant ON public.marketplace_memory_facts USING btree (merchant_id) WHERE (merchant_id IS NOT NULL);


--
-- Name: idx_mmf_type_value; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mmf_type_value ON public.marketplace_memory_facts USING btree (fact_type, fact_value);


--
-- Name: idx_offers_canonical_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_offers_canonical_product ON public.offers USING btree (canonical_product_id);


--
-- Name: idx_product_identifiers_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_identifiers_lookup ON public.product_identifiers USING btree (identifier_type, identifier_value);


--
-- Name: idx_product_identity_match_log_algorithm_version; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_identity_match_log_algorithm_version ON public.product_identity_match_log USING btree (algorithm_version);


--
-- Name: idx_product_identity_match_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_identity_match_log_created_at ON public.product_identity_match_log USING btree (created_at DESC);


--
-- Name: idx_product_identity_match_log_suggested_product; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_identity_match_log_suggested_product ON public.product_identity_match_log USING btree (suggested_product_id);


--
-- Name: idx_product_identity_match_log_tier; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_product_identity_match_log_tier ON public.product_identity_match_log USING btree (tier);


--
-- Name: idx_store_claims_merchant; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_claims_merchant ON public.store_claims USING btree (merchant_id);


--
-- Name: idx_store_claims_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_claims_status ON public.store_claims USING btree (status, created_at DESC);


--
-- Name: idx_store_claims_store; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_store_claims_store ON public.store_claims USING btree (store_id);


--
-- Name: idx_stores_discovered_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_stores_discovered_at ON public.stores USING btree (discovered_at) WHERE (discovered_at IS NOT NULL);


--
-- Name: idx_trust_events_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_events_created_at ON public.merchant_trust_events USING btree (created_at DESC);


--
-- Name: idx_trust_events_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_events_merchant_id ON public.merchant_trust_events USING btree (merchant_id);


--
-- Name: idx_trust_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_events_type ON public.merchant_trust_events USING btree (event_type);


--
-- Name: idx_trust_history_merchant_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_trust_history_merchant_date ON public.trust_history USING btree (merchant_id, snapshot_date DESC);


--
-- Name: idx_universal_categories_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_universal_categories_parent ON public.universal_categories USING btree (parent_id);


--
-- Name: idx_verification_evidence_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_evidence_active ON public.verification_evidence USING btree (verification_id) WHERE (deleted_at IS NULL);


--
-- Name: idx_verification_evidence_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_evidence_merchant_id ON public.verification_evidence USING btree (merchant_id);


--
-- Name: idx_verification_evidence_verification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_evidence_verification_id ON public.verification_evidence USING btree (verification_id);


--
-- Name: idx_verification_history_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_history_created_at ON public.verification_history USING btree (created_at DESC);


--
-- Name: idx_verification_history_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_history_merchant_id ON public.verification_history USING btree (merchant_id);


--
-- Name: idx_verification_history_verification_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verification_history_verification_id ON public.verification_history USING btree (verification_id);


--
-- Name: idx_verifications_merchant_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verifications_merchant_id ON public.merchant_verifications USING btree (merchant_id);


--
-- Name: idx_verifications_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_verifications_status ON public.merchant_verifications USING btree (status) WHERE (status = 'pending'::text);


--
-- Name: merchant_analytics_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_analytics_merchant_idx ON public.merchant_analytics_events USING btree (merchant_id);


--
-- Name: merchant_audit_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_audit_created_at_idx ON public.merchant_audit_logs USING btree (created_at DESC);


--
-- Name: merchant_audit_merchant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_audit_merchant_id_idx ON public.merchant_audit_logs USING btree (merchant_id);


--
-- Name: merchant_recs_merchant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_recs_merchant_id_idx ON public.merchant_recommendations USING btree (merchant_id);


--
-- Name: merchant_recs_read_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_recs_read_at_idx ON public.merchant_recommendations USING btree (read_at) WHERE (read_at IS NULL);


--
-- Name: merchant_reviews_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_reviews_merchant_idx ON public.merchant_reviews USING btree (merchant_id);


--
-- Name: merchant_reviews_public_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_reviews_public_idx ON public.merchant_reviews USING btree (merchant_id, rating) WHERE ((status = 'approved'::text) AND (deleted_at IS NULL));


--
-- Name: merchant_reviews_reviewer_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_reviews_reviewer_idx ON public.merchant_reviews USING btree (reviewer_id);


--
-- Name: merchant_reviews_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_reviews_status_idx ON public.merchant_reviews USING btree (status);


--
-- Name: merchant_stores_merchant_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_stores_merchant_id_idx ON public.merchant_stores USING btree (merchant_id);


--
-- Name: merchant_stores_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_stores_store_id_idx ON public.merchant_stores USING btree (store_id);


--
-- Name: merchant_timeline_category_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_timeline_category_idx ON public.merchant_timeline USING btree (category);


--
-- Name: merchant_timeline_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_timeline_merchant_idx ON public.merchant_timeline USING btree (merchant_id);


--
-- Name: merchant_timeline_occurred_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_timeline_occurred_idx ON public.merchant_timeline USING btree (occurred_at DESC);


--
-- Name: merchant_timeline_visibility_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchant_timeline_visibility_idx ON public.merchant_timeline USING btree (visibility);


--
-- Name: merchants_user_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX merchants_user_id_idx ON public.merchants USING btree (user_id);


--
-- Name: offers_price_usd_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_price_usd_idx ON public.offers USING btree (price_usd);


--
-- Name: offers_product_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_product_id_idx ON public.offers USING btree (product_id);


--
-- Name: offers_store_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX offers_store_id_idx ON public.offers USING btree (store_id);


--
-- Name: price_history_offer_recorded_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX price_history_offer_recorded_idx ON public.price_history USING btree (offer_id, recorded_at DESC);


--
-- Name: products_brand_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_brand_id_idx ON public.products USING btree (brand_id);


--
-- Name: products_category_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX products_category_id_idx ON public.products USING btree (category_id);


--
-- Name: review_history_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_history_merchant_idx ON public.review_history USING btree (merchant_id);


--
-- Name: review_history_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_history_review_idx ON public.review_history USING btree (review_id);


--
-- Name: review_reports_reporter_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_reports_reporter_idx ON public.review_reports USING btree (reporter_id);


--
-- Name: review_reports_review_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_reports_review_idx ON public.review_reports USING btree (review_id);


--
-- Name: review_reports_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX review_reports_status_idx ON public.review_reports USING btree (status);


--
-- Name: signal_provenance_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX signal_provenance_merchant_idx ON public.signal_provenance USING btree (merchant_id);


--
-- Name: signal_provenance_signal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX signal_provenance_signal_idx ON public.signal_provenance USING btree (signal_id);


--
-- Name: trust_signals_merchant_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trust_signals_merchant_idx ON public.trust_signals USING btree (merchant_id);


--
-- Name: trust_signals_status_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trust_signals_status_idx ON public.trust_signals USING btree (status);


--
-- Name: trust_signals_type_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX trust_signals_type_idx ON public.trust_signals USING btree (signal_type);


--
-- Name: merchants merchants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER merchants_updated_at BEFORE UPDATE ON public.merchants FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: brand_universal_map brand_universal_map_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_universal_map
    ADD CONSTRAINT brand_universal_map_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE CASCADE;


--
-- Name: brand_universal_map brand_universal_map_canonical_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.brand_universal_map
    ADD CONSTRAINT brand_universal_map_canonical_brand_id_fkey FOREIGN KEY (canonical_brand_id) REFERENCES public.canonical_brands(id) ON DELETE CASCADE;


--
-- Name: buyer_alert_candidates buyer_alert_candidates_market_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_alert_candidates
    ADD CONSTRAINT buyer_alert_candidates_market_change_id_fkey FOREIGN KEY (market_change_id) REFERENCES public.market_changes(id) ON DELETE CASCADE;


--
-- Name: buyer_alert_candidates buyer_alert_candidates_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_alert_candidates
    ADD CONSTRAINT buyer_alert_candidates_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: buyer_alert_candidates buyer_alert_candidates_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_alert_candidates
    ADD CONSTRAINT buyer_alert_candidates_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: buyer_events buyer_events_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: buyer_events buyer_events_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: buyer_events buyer_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: buyer_events buyer_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.buyer_sessions(id) ON DELETE SET NULL;


--
-- Name: buyer_events buyer_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_events
    ADD CONSTRAINT buyer_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: buyer_sessions buyer_sessions_buyer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.buyer_sessions
    ADD CONSTRAINT buyer_sessions_buyer_id_fkey FOREIGN KEY (buyer_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: canonical_products canonical_products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_products
    ADD CONSTRAINT canonical_products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id) ON DELETE SET NULL;


--
-- Name: canonical_products canonical_products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_products
    ADD CONSTRAINT canonical_products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE SET NULL;


--
-- Name: canonical_products canonical_products_merged_into_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_products
    ADD CONSTRAINT canonical_products_merged_into_id_fkey FOREIGN KEY (merged_into_id) REFERENCES public.canonical_products(id) ON DELETE SET NULL;


--
-- Name: canonical_suggestion_outbox canonical_suggestion_outbox_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.canonical_suggestion_outbox
    ADD CONSTRAINT canonical_suggestion_outbox_canonical_product_id_fkey FOREIGN KEY (canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: catalog_pending_reviews catalog_pending_reviews_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_pending_reviews
    ADD CONSTRAINT catalog_pending_reviews_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: catalog_pending_reviews catalog_pending_reviews_resolved_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_pending_reviews
    ADD CONSTRAINT catalog_pending_reviews_resolved_brand_id_fkey FOREIGN KEY (resolved_brand_id) REFERENCES public.brands(id);


--
-- Name: catalog_pending_reviews catalog_pending_reviews_resolved_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_pending_reviews
    ADD CONSTRAINT catalog_pending_reviews_resolved_category_id_fkey FOREIGN KEY (resolved_category_id) REFERENCES public.categories(id);


--
-- Name: catalog_pending_reviews catalog_pending_reviews_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_pending_reviews
    ADD CONSTRAINT catalog_pending_reviews_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: catalog_recovery_decisions catalog_recovery_decisions_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_recovery_decisions
    ADD CONSTRAINT catalog_recovery_decisions_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: catalog_recovery_decisions catalog_recovery_decisions_recovered_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_recovery_decisions
    ADD CONSTRAINT catalog_recovery_decisions_recovered_brand_id_fkey FOREIGN KEY (recovered_brand_id) REFERENCES public.brands(id);


--
-- Name: catalog_recovery_decisions catalog_recovery_decisions_recovered_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_recovery_decisions
    ADD CONSTRAINT catalog_recovery_decisions_recovered_category_id_fkey FOREIGN KEY (recovered_category_id) REFERENCES public.categories(id);


--
-- Name: category_universal_map category_universal_map_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_universal_map
    ADD CONSTRAINT category_universal_map_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id) ON DELETE CASCADE;


--
-- Name: category_universal_map category_universal_map_universal_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.category_universal_map
    ADD CONSTRAINT category_universal_map_universal_category_id_fkey FOREIGN KEY (universal_category_id) REFERENCES public.universal_categories(id) ON DELETE CASCADE;


--
-- Name: connector_configs connector_configs_store_slug_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_configs
    ADD CONSTRAINT connector_configs_store_slug_fkey FOREIGN KEY (store_slug) REFERENCES public.stores(slug);


--
-- Name: connector_sync_runs connector_sync_runs_connector_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_runs
    ADD CONSTRAINT connector_sync_runs_connector_id_fkey FOREIGN KEY (connector_id) REFERENCES public.connectors(id) ON DELETE CASCADE;


--
-- Name: connector_sync_runs connector_sync_runs_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.connector_sync_runs
    ADD CONSTRAINT connector_sync_runs_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: favorites favorites_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: favorites favorites_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.favorites
    ADD CONSTRAINT favorites_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: knowledge_history knowledge_history_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.knowledge_history
    ADD CONSTRAINT knowledge_history_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: market_changes market_changes_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_changes
    ADD CONSTRAINT market_changes_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: market_changes market_changes_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.market_changes
    ADD CONSTRAINT market_changes_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: marketplace_memory_facts marketplace_memory_facts_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_memory_facts
    ADD CONSTRAINT marketplace_memory_facts_canonical_product_id_fkey FOREIGN KEY (canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: marketplace_memory_facts marketplace_memory_facts_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketplace_memory_facts
    ADD CONSTRAINT marketplace_memory_facts_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: merchant_analytics_daily merchant_analytics_daily_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_daily
    ADD CONSTRAINT merchant_analytics_daily_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_analytics_events merchant_analytics_events_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_events
    ADD CONSTRAINT merchant_analytics_events_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: merchant_analytics_events merchant_analytics_events_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_events
    ADD CONSTRAINT merchant_analytics_events_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: merchant_analytics_events merchant_analytics_events_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_analytics_events
    ADD CONSTRAINT merchant_analytics_events_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE SET NULL;


--
-- Name: merchant_attribute_patterns merchant_attribute_patterns_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_attribute_patterns
    ADD CONSTRAINT merchant_attribute_patterns_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: merchant_audit_logs merchant_audit_logs_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_audit_logs
    ADD CONSTRAINT merchant_audit_logs_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE SET NULL;


--
-- Name: merchant_audit_logs merchant_audit_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_audit_logs
    ADD CONSTRAINT merchant_audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: merchant_badges merchant_badges_granted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_badges
    ADD CONSTRAINT merchant_badges_granted_by_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: merchant_badges merchant_badges_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_badges
    ADD CONSTRAINT merchant_badges_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_catalog_snapshots merchant_catalog_snapshots_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_catalog_snapshots
    ADD CONSTRAINT merchant_catalog_snapshots_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_decision_actions merchant_decision_actions_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_decision_actions
    ADD CONSTRAINT merchant_decision_actions_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_delegates merchant_delegates_invited_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_delegates
    ADD CONSTRAINT merchant_delegates_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: merchant_delegates merchant_delegates_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_delegates
    ADD CONSTRAINT merchant_delegates_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_delegates merchant_delegates_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_delegates
    ADD CONSTRAINT merchant_delegates_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: merchant_growth_history merchant_growth_history_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_growth_history
    ADD CONSTRAINT merchant_growth_history_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_recommendations merchant_recommendations_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_recommendations
    ADD CONSTRAINT merchant_recommendations_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_reviews merchant_reviews_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_reviews
    ADD CONSTRAINT merchant_reviews_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: merchant_reviews merchant_reviews_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_reviews
    ADD CONSTRAINT merchant_reviews_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: merchant_stores merchant_stores_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_stores
    ADD CONSTRAINT merchant_stores_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_stores merchant_stores_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_stores
    ADD CONSTRAINT merchant_stores_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: merchant_timeline merchant_timeline_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_timeline
    ADD CONSTRAINT merchant_timeline_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: merchant_trust_events merchant_trust_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust_events
    ADD CONSTRAINT merchant_trust_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: merchant_trust_events merchant_trust_events_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust_events
    ADD CONSTRAINT merchant_trust_events_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_trust_events merchant_trust_events_merchant_trust_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust_events
    ADD CONSTRAINT merchant_trust_events_merchant_trust_id_fkey FOREIGN KEY (merchant_trust_id) REFERENCES public.merchant_trust(id) ON DELETE SET NULL;


--
-- Name: merchant_trust merchant_trust_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_trust
    ADD CONSTRAINT merchant_trust_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_upgrade_leads merchant_upgrade_leads_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_upgrade_leads
    ADD CONSTRAINT merchant_upgrade_leads_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_verifications merchant_verifications_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_verifications
    ADD CONSTRAINT merchant_verifications_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: merchant_verifications merchant_verifications_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchant_verifications
    ADD CONSTRAINT merchant_verifications_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: merchants merchants_plan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_plan_fkey FOREIGN KEY (plan) REFERENCES public.merchant_plans(plan);


--
-- Name: merchants merchants_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merchants
    ADD CONSTRAINT merchants_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: merge_candidates merge_candidates_source_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_candidates
    ADD CONSTRAINT merge_candidates_source_canonical_product_id_fkey FOREIGN KEY (source_canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: merge_candidates merge_candidates_target_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_candidates
    ADD CONSTRAINT merge_candidates_target_canonical_product_id_fkey FOREIGN KEY (target_canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: merge_executions merge_executions_merge_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_executions
    ADD CONSTRAINT merge_executions_merge_candidate_id_fkey FOREIGN KEY (merge_candidate_id) REFERENCES public.merge_candidates(id) ON DELETE CASCADE;


--
-- Name: merge_executions merge_executions_source_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_executions
    ADD CONSTRAINT merge_executions_source_canonical_product_id_fkey FOREIGN KEY (source_canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: merge_executions merge_executions_target_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.merge_executions
    ADD CONSTRAINT merge_executions_target_canonical_product_id_fkey FOREIGN KEY (target_canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE CASCADE;


--
-- Name: offers offers_canonical_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT offers_canonical_product_id_fkey FOREIGN KEY (canonical_product_id) REFERENCES public.canonical_products(id) ON DELETE SET NULL;


--
-- Name: price_history price_history_offer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.price_history
    ADD CONSTRAINT price_history_offer_id_fkey FOREIGN KEY (offer_id) REFERENCES public.offers(id) ON DELETE CASCADE;


--
-- Name: offers prices_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT prices_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: offers prices_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.offers
    ADD CONSTRAINT prices_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: product_identifiers product_identifiers_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identifiers
    ADD CONSTRAINT product_identifiers_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: product_identifiers product_identifiers_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identifiers
    ADD CONSTRAINT product_identifiers_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE;


--
-- Name: product_identity_match_log product_identity_match_log_suggested_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.product_identity_match_log
    ADD CONSTRAINT product_identity_match_log_suggested_product_id_fkey FOREIGN KEY (suggested_product_id) REFERENCES public.products(id) ON DELETE SET NULL;


--
-- Name: products products_brand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_brand_id_fkey FOREIGN KEY (brand_id) REFERENCES public.brands(id);


--
-- Name: products products_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: review_history review_history_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_history
    ADD CONSTRAINT review_history_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: review_history review_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_history
    ADD CONSTRAINT review_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: review_history review_history_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_history
    ADD CONSTRAINT review_history_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.merchant_reviews(id) ON DELETE CASCADE;


--
-- Name: review_reports review_reports_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: review_reports review_reports_reporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: review_reports review_reports_review_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_review_id_fkey FOREIGN KEY (review_id) REFERENCES public.merchant_reviews(id) ON DELETE CASCADE;


--
-- Name: review_reports review_reports_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.review_reports
    ADD CONSTRAINT review_reports_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: signal_provenance signal_provenance_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: signal_provenance signal_provenance_generated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: signal_provenance signal_provenance_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: signal_provenance signal_provenance_signal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_signal_id_fkey FOREIGN KEY (signal_id) REFERENCES public.trust_signals(id) ON DELETE CASCADE;


--
-- Name: signal_provenance signal_provenance_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.signal_provenance
    ADD CONSTRAINT signal_provenance_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.merchant_verifications(id) ON DELETE SET NULL;


--
-- Name: store_claims store_claims_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_claims
    ADD CONSTRAINT store_claims_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: store_claims store_claims_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_claims
    ADD CONSTRAINT store_claims_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: store_claims store_claims_store_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_claims
    ADD CONSTRAINT store_claims_store_id_fkey FOREIGN KEY (store_id) REFERENCES public.stores(id) ON DELETE CASCADE;


--
-- Name: store_claims store_claims_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.store_claims
    ADD CONSTRAINT store_claims_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.merchant_verifications(id) ON DELETE SET NULL;


--
-- Name: trust_history trust_history_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_history
    ADD CONSTRAINT trust_history_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.merchants(id) ON DELETE CASCADE;


--
-- Name: trust_signals trust_signals_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_signals
    ADD CONSTRAINT trust_signals_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: trust_signals trust_signals_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.trust_signals
    ADD CONSTRAINT trust_signals_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.merchant_verifications(id) ON DELETE SET NULL;


--
-- Name: universal_categories universal_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.universal_categories
    ADD CONSTRAINT universal_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.universal_categories(id) ON DELETE SET NULL;


--
-- Name: verification_evidence verification_evidence_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_evidence
    ADD CONSTRAINT verification_evidence_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: verification_evidence verification_evidence_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_evidence
    ADD CONSTRAINT verification_evidence_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: verification_evidence verification_evidence_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_evidence
    ADD CONSTRAINT verification_evidence_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.merchant_verifications(id) ON DELETE CASCADE;


--
-- Name: verification_history verification_history_merchant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_history
    ADD CONSTRAINT verification_history_merchant_id_fkey FOREIGN KEY (merchant_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: verification_history verification_history_performed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_history
    ADD CONSTRAINT verification_history_performed_by_fkey FOREIGN KEY (performed_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: verification_history verification_history_verification_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification_history
    ADD CONSTRAINT verification_history_verification_id_fkey FOREIGN KEY (verification_id) REFERENCES public.merchant_verifications(id) ON DELETE CASCADE;


--
-- Name: verification_types Admin can manage verification types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin can manage verification types" ON public.verification_types USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: verification_evidence Admin reads all evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all evidence" ON public.verification_evidence FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: verification_history Admin reads all verification history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admin reads all verification history" ON public.verification_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'admin'::text)))));


--
-- Name: verification_evidence Merchant reads own evidence; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchant reads own evidence" ON public.verification_evidence FOR SELECT USING (((merchant_id = auth.uid()) AND (deleted_at IS NULL)));


--
-- Name: verification_history Merchant reads own verification history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Merchant reads own verification history" ON public.verification_history FOR SELECT USING ((merchant_id = auth.uid()));


--
-- Name: verification_types Public can read active verification types; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read active verification types" ON public.verification_types FOR SELECT USING ((is_active = true));


--
-- Name: brands Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.brands FOR SELECT TO authenticated, anon USING (true);


--
-- Name: categories Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.categories FOR SELECT TO authenticated, anon USING (true);


--
-- Name: offers Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.offers FOR SELECT TO authenticated, anon USING (true);


--
-- Name: price_history Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.price_history FOR SELECT TO authenticated, anon USING (true);


--
-- Name: products Public read access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read access" ON public.products FOR SELECT TO authenticated, anon USING (true);


--
-- Name: stores Public read stores; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public read stores" ON public.stores FOR SELECT USING (true);


--
-- Name: attribute_dictionary; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.attribute_dictionary ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_badges badges_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY badges_admin_all ON public.merchant_badges USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_badges badges_public_read_active; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY badges_public_read_active ON public.merchant_badges FOR SELECT USING ((is_active = true));


--
-- Name: brand_universal_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brand_universal_map ENABLE ROW LEVEL SECURITY;

--
-- Name: brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;

--
-- Name: buyer_alert_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyer_alert_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: buyer_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyer_events ENABLE ROW LEVEL SECURITY;

--
-- Name: buyer_events buyer_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_events_insert ON public.buyer_events FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: buyer_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.buyer_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: buyer_sessions buyer_sessions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_sessions_insert ON public.buyer_sessions FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: buyer_sessions buyer_sessions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY buyer_sessions_update ON public.buyer_sessions FOR UPDATE TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: canonical_bootstrap_checkpoint; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_bootstrap_checkpoint ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_brands; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_brands ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_products ENABLE ROW LEVEL SECURITY;

--
-- Name: canonical_suggestion_outbox; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.canonical_suggestion_outbox ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_pending_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_pending_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_recovery_decisions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_recovery_decisions ENABLE ROW LEVEL SECURITY;

--
-- Name: categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

--
-- Name: category_universal_map; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.category_universal_map ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_configs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connector_configs ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_configs connector_configs_service_only; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY connector_configs_service_only ON public.connector_configs USING (false) WITH CHECK (false);


--
-- Name: connector_sync_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connector_sync_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: connector_url_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connector_url_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: connectors; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.connectors ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_conversion_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_conversion_log ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_provider_runs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_provider_runs ENABLE ROW LEVEL SECURITY;

--
-- Name: exchange_rates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exchange_rates ENABLE ROW LEVEL SECURITY;

--
-- Name: favorites; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

--
-- Name: import_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: knowledge_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.knowledge_history ENABLE ROW LEVEL SECURITY;

--
-- Name: market_changes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_changes ENABLE ROW LEVEL SECURITY;

--
-- Name: market_pulse_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.market_pulse_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_health_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_health_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: marketplace_memory_facts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketplace_memory_facts ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_analytics_daily; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_analytics_daily ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_analytics_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_analytics_events ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_analytics_events merchant_analytics_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_analytics_read ON public.merchant_analytics_events FOR SELECT USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: merchant_attribute_patterns; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_attribute_patterns ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_audit_logs merchant_audit_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_audit_read ON public.merchant_audit_logs FOR SELECT USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: merchant_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_catalog_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_catalog_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_decision_actions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_decision_actions ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_delegates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_delegates ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_growth_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_growth_history ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_recommendations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_recommendations ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_recommendations merchant_recs_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_recs_access ON public.merchant_recommendations USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: merchant_reviews; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_reviews ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_reviews merchant_reviews_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_reviews_admin_all ON public.merchant_reviews USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_reviews merchant_reviews_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_reviews_auth_insert ON public.merchant_reviews FOR INSERT WITH CHECK ((auth.uid() = reviewer_id));


--
-- Name: merchant_reviews merchant_reviews_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_reviews_public_read ON public.merchant_reviews FOR SELECT USING (((status = 'approved'::text) AND (deleted_at IS NULL)));


--
-- Name: merchant_reviews merchant_reviews_reviewer_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_reviews_reviewer_update ON public.merchant_reviews FOR UPDATE USING (((auth.uid() = reviewer_id) AND (status = ANY (ARRAY['pending'::text, 'approved'::text])))) WITH CHECK ((auth.uid() = reviewer_id));


--
-- Name: merchant_stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_stores ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_stores merchant_stores_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_stores_access ON public.merchant_stores USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: merchant_timeline; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_timeline ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_timeline merchant_timeline_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_timeline_admin_all ON public.merchant_timeline USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_timeline merchant_timeline_merchant_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_timeline_merchant_read ON public.merchant_timeline FOR SELECT USING ((merchant_id IN ( SELECT merchants.user_id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: merchant_timeline merchant_timeline_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_timeline_public_read ON public.merchant_timeline FOR SELECT USING ((visibility = 'public'::text));


--
-- Name: merchant_timeline merchant_timeline_service_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchant_timeline_service_insert ON public.merchant_timeline FOR INSERT WITH CHECK (true);


--
-- Name: merchant_trust; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_trust ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_trust_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_trust_events ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_upgrade_leads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_upgrade_leads ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_verifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchant_verifications ENABLE ROW LEVEL SECURITY;

--
-- Name: merchants; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;

--
-- Name: merchants merchants_self_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY merchants_self_access ON public.merchants USING ((auth.uid() = user_id));


--
-- Name: merge_candidates; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merge_candidates ENABLE ROW LEVEL SECURITY;

--
-- Name: merge_executions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.merge_executions ENABLE ROW LEVEL SECURITY;

--
-- Name: model_aliases; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.model_aliases ENABLE ROW LEVEL SECURITY;

--
-- Name: offers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_plans plans_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY plans_public_read ON public.merchant_plans FOR SELECT USING (true);


--
-- Name: price_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

--
-- Name: product_identifiers; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_identifiers ENABLE ROW LEVEL SECURITY;

--
-- Name: product_identity_match_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.product_identity_match_log ENABLE ROW LEVEL SECURITY;

--
-- Name: products; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_self_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_self_read ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: review_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_history ENABLE ROW LEVEL SECURITY;

--
-- Name: review_history review_history_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_history_admin_insert ON public.review_history FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: review_history review_history_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_history_admin_read ON public.review_history FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: review_history review_history_service_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_history_service_insert ON public.review_history FOR INSERT WITH CHECK (true);


--
-- Name: review_reports; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.review_reports ENABLE ROW LEVEL SECURITY;

--
-- Name: review_reports review_reports_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_reports_admin_all ON public.review_reports USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: review_reports review_reports_auth_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_reports_auth_insert ON public.review_reports FOR INSERT WITH CHECK ((auth.uid() = reporter_id));


--
-- Name: review_reports review_reports_reporter_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY review_reports_reporter_read ON public.review_reports FOR SELECT USING ((auth.uid() = reporter_id));


--
-- Name: signal_provenance; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.signal_provenance ENABLE ROW LEVEL SECURITY;

--
-- Name: signal_provenance signal_provenance_admin_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY signal_provenance_admin_read ON public.signal_provenance FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: signal_provenance signal_provenance_admin_write; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY signal_provenance_admin_write ON public.signal_provenance FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: store_claims; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.store_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: store_claims store_claims_merchant_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY store_claims_merchant_read_own ON public.store_claims FOR SELECT USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- Name: stores; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_trust trust_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_admin_all ON public.merchant_trust USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_trust_events trust_events_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_events_admin_all ON public.merchant_trust_events USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: trust_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trust_history ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_history trust_history_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_history_admin_all ON public.trust_history USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_trust trust_public_read_verified; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_public_read_verified ON public.merchant_trust FOR SELECT USING ((status = 'verified'::text));


--
-- Name: trust_signals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.trust_signals ENABLE ROW LEVEL SECURITY;

--
-- Name: trust_signals trust_signals_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_signals_admin_all ON public.trust_signals USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: trust_signals trust_signals_public_read; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY trust_signals_public_read ON public.trust_signals FOR SELECT USING (((is_public = true) AND (status = 'active'::text)));


--
-- Name: universal_categories; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.universal_categories ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_evidence; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_evidence ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_history; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_history ENABLE ROW LEVEL SECURITY;

--
-- Name: verification_types; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.verification_types ENABLE ROW LEVEL SECURITY;

--
-- Name: merchant_verifications verifications_admin_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY verifications_admin_all ON public.merchant_verifications USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'operator'::text]))))));


--
-- Name: merchant_verifications verifications_merchant_read_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY verifications_merchant_read_own ON public.merchant_verifications FOR SELECT USING ((merchant_id IN ( SELECT merchants.id
   FROM public.merchants
  WHERE (merchants.user_id = auth.uid()))));


--
-- PostgreSQL database dump complete
--



