-- Marketplace Density Baseline (PROGRAM Ω — Mission Ω-4.0, 2026-07-08)
--
-- Read-only. Every statement below is a SELECT — no INSERT/UPDATE/DELETE/DDL.
-- Mirrors the counts already captured live (via @supabase/supabase-js with
-- the service-role key, same access pattern every service in this codebase
-- already uses) for KPI_BASELINE.md/MARKETPLACE_BASELINE.md. Kept here so
-- the same measurement is reproducible from the SQL Editor without needing
-- a script, per this project's standing convention (see scripts/db-verify.ts).
--
-- Paste any block below into the Supabase SQL Editor to re-run it.

-- ── Products ─────────────────────────────────────────────────────────────
select count(*) as products_total from products;
select count(*) as products_with_image from products where image_url is not null;
select count(*) as products_with_brand from products where brand_id is not null;
select count(*) as products_with_category from products where category_id is not null;

-- ── Offers ───────────────────────────────────────────────────────────────
select count(*) as offers_total from offers;
select count(*) as offers_with_canonical from offers where canonical_product_id is not null;
select count(*) as offers_in_stock from offers where in_stock = true;
select count(*) as offers_out_of_stock from offers where in_stock = false;
select count(distinct product_id) as products_with_at_least_one_offer from offers;

-- ── Price History ────────────────────────────────────────────────────────
select count(*) as price_history_total from price_history;
select count(distinct offer_id) as offers_with_price_history from price_history;

-- ── Canonical Catalog ────────────────────────────────────────────────────
select count(*) as canonical_products_total from canonical_products;
select status, count(*) from merge_candidates group by status;

-- ── Brands / Categories ──────────────────────────────────────────────────
select count(*) as brands_total from brands;
select count(*) as categories_total from categories;

-- ── Stores ───────────────────────────────────────────────────────────────
select count(*) as stores_total from stores;
select count(*) as stores_discovered from stores where discovered_at is not null;
select count(*) as stores_admin_created from stores where discovered_at is null;
select count(*) as stores_verified from stores where is_verified = true;
select count(*) as stores_active from stores where active = true;

-- ── Merchant Ownership ───────────────────────────────────────────────────
select count(*) as merchant_stores_total from merchant_stores;
select count(distinct store_id) as claimed_stores_distinct from merchant_stores;

-- ── Connector Platform ───────────────────────────────────────────────────
select count(*) as connectors_total from connectors;
select count(*) as sync_runs_total from connector_sync_runs;
select status, count(*) from connector_sync_runs group by status;
select count(distinct connector_id) as connectors_with_at_least_one_run from connector_sync_runs;
