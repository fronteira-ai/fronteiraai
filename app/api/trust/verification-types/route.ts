import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { SupabaseVerificationTypeCatalogRepository } from "@/src/domains/trust/infrastructure/SupabaseVerificationTypeCatalogRepository";

export async function GET(): Promise<NextResponse> {
  const client = getSupabaseServiceClient();
  const repo = new SupabaseVerificationTypeCatalogRepository(client);
  const types = await repo.findAll(true);
  return NextResponse.json({ data: types });
}
