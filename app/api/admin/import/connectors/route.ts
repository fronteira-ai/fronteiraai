import { NextResponse } from "next/server";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";
import { connectorRegistry } from "@/acquisition/core/registry";
import "@/acquisition/connectors/bootstrap";

export async function GET() {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const connectors = connectorRegistry.list().map((c) => ({
    id: c.metadata.id,
    name: c.metadata.name,
    version: c.metadata.version,
    type: c.metadata.type,
    storeSlug: c.metadata.storeSlug,
    description: c.metadata.description ?? null,
  }));

  return NextResponse.json({ data: connectors });
}
