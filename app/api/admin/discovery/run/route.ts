import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { DiscoveryService } from "@/src/domains/connectors/discovery/services/DiscoveryService";
import { SitemapDiscoverySource } from "@/src/domains/connectors/discovery/services/SitemapDiscoverySource";
import { HttpFetchStrategy } from "@/src/domains/connectors/sdk/fetch/HttpFetchStrategy";

// Release 1.7 — Wave 2: admin-triggered, single-domain discovery. No seed-list
// table, no automatic bulk sweep — deferred until there's a decided source
// for candidate domains (see RELEASE_1_7_WAVE_2_EXECUTION_PLAN.md).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const body = (await request.json()) as Record<string, unknown>;
  const domain = String(body.domain ?? "").trim();
  if (!domain) return NextResponse.json({ error: "domain é obrigatório" }, { status: 400 });

  const source = new SitemapDiscoverySource(new HttpFetchStrategy());
  const discoveryService = new DiscoveryService(auth.serviceClient, source);

  const outcome = await discoveryService.discoverAndCreateStore(domain);

  if (!outcome) {
    return NextResponse.json(
      { error: "Não foi possível descobrir esta loja (robots.txt bloqueou, sitemap indisponível, ou nome inválido)." },
      { status: 422 }
    );
  }

  return NextResponse.json({ data: outcome, message: outcome.created ? "Loja descoberta e criada" : "Loja já existente" });
}
