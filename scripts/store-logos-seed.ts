// PR-004 — Logomarcas oficiais das lojas (Sprint "Autonomy Upgrade V1 + Store Experience").
//
// Popula `stores.logo_url` com a logomarca OFICIAL de cada loja (asset serve
// do próprio site oficial da loja — proveniência clara, nunca Google Images
// aleatório nem asset de terceiros). Dry-run por padrão; aplicar exige
// `--execute`. Produção exige SUPABASE_TARGET=production +
// SUPABASE_ALLOW_PRODUCTION=yes (trava dura, ver scripts/lib/supabaseTarget.ts).
//
// Para lojas sem logomarca oficial verificável no site próprio, `logo_url`
// permanece null e a UI usa o fallback de monograma (nunca imagem quebrada).
//
// ADITIVO / NÃO DESTRUTIVO: apenas preenche coluna existente (null → URL),
// nunca remove nem transforma dados. Rollback = setar null de volta.

import { getServiceClient } from "./lib/client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Lojas com logotipo oficial identificável no PRÓPRIO site (verificado por
// fetch no site oficial de cada loja). Se uma URL quebrar, a UI (StoreLogo)
// cai no monograma — nunca quebra a página.
const OFFICIAL_LOGOS: Record<string, string> = {
  "mega-eletronicos": "https://megaeletronicos.com/img/new-mega/isotipo_br.png",
  "shopping-china": "https://www.shoppingchina.com.py/img/photos/logo/logo.webp",
  "roma-shopping": "https://media.romapy.com/themes/classic_child/assets/img/logo-roma.webp",
  "atacado-connect": "https://atacadoconnect.com/favicon.png",
};

const DRY_RUN = !process.argv.includes("--execute");

async function seedLogos(sb: SupabaseClient) {
  const { data: stores, error } = await sb.from("stores").select("id, slug, name, logo_url");
  if (error) throw new Error(`Falha ao ler stores: ${error.message}`);

  const rows = stores ?? [];
  let updated = 0;
  let skipped = 0;

  for (const store of rows as Array<{ id: string; slug: string; name: string; logo_url: string | null }>) {
    const target = OFFICIAL_LOGOS[store.slug];
    if (!target) {
      // Loja sem logomarca oficial verificável — mantém null (fallback monograma na UI).
      skipped++;
      if (DRY_RUN) console.log(`(dry) ${store.slug} — sem logo oficial; mantém null`);
      continue;
    }
    if (store.logo_url === target) {
      skipped++;
      if (DRY_RUN) console.log(`(dry) ${store.slug} — já ok`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`(dry) ${store.slug} — logo_url=${target}`);
      updated++;
      continue;
    }

    const { error: upErr } = await sb.from("stores").update({ logo_url: target }).eq("id", store.id);
    if (upErr) {
      console.error(`  ERRO ${store.slug}: ${upErr.message}`);
    } else {
      updated++;
      console.log(`✓ ${store.slug} — logo_url atualizado`);
    }
  }

  console.log(
    `\n[store-logos] ${DRY_RUN ? "DRY-RUN (use --execute)" : "EXECUTADO"} — alvo=${rows.length} lojas, preparadas=${updated}, sem-logo/skips=${skipped}`
  );
}

async function main() {
  const sb = getServiceClient();
  await seedLogos(sb);
}

main().catch((e) => {
  console.error(`[store-logos] FATAL: ${e.message}`);
  process.exit(1);
});
