import { getServiceClient } from "./lib/client";

async function main() {
  const supabase = getServiceClient();
  const { data: categories } = await supabase.from("categories").select("id, slug, name");
  const byName = new Map<string, { id: string; slug: string }[]>();
  for (const c of categories ?? []) {
    const key = (c.name as string).trim().toLowerCase();
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key)!.push({ id: c.id as string, slug: c.slug as string });
  }
  const dupes = [...byName.entries()].filter(([, rows]) => rows.length > 1);
  console.log(`Total categories: ${(categories ?? []).length}`);
  console.log(`Nomes distintos (case-insensitive): ${byName.size}`);
  console.log(`Nomes com 2+ linhas (mesma etiqueta, IDs diferentes): ${dupes.length}`);
  for (const [name, rows] of dupes.slice(0, 15)) {
    console.log(`  "${name}": ${rows.length} linha(s) -> ${rows.map((r) => r.id).join(", ")}`);
  }
}
main();
