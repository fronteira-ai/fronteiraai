import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import {
  SupabaseTrustSignalRepository,
  SupabaseSignalProvenanceRepository,
} from "@/src/domains/trust/infrastructure";
import { TrustSignalService } from "@/src/domains/trust/services";
import { requireAdmin, isAuthError } from "@/lib/admin-auth";

type Params = Promise<{ merchantId: string }>;

function buildServices() {
  const client = getSupabaseServiceClient();
  return new TrustSignalService(
    new SupabaseTrustSignalRepository(client),
    new SupabaseSignalProvenanceRepository(client)
  );
}

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const { merchantId } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const perPage = parseInt(searchParams.get("perPage") ?? "20");

  const svc = buildServices();
  const result = await svc.getSignals(merchantId, { page, perPage });
  return NextResponse.json({ data: result });
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await requireAdmin();
  if (isAuthError(auth)) return auth;

  const { merchantId } = await params;
  const body = await req.json();

  const client = getSupabaseServiceClient();
  const signalRepo = new SupabaseTrustSignalRepository(client);
  const provenanceRepo = new SupabaseSignalProvenanceRepository(client);

  const signal = await signalRepo.create({
    merchant_id: merchantId,
    signal_type: body.signal_type,
    status: "active" as never,
    category: body.category,
    title: body.title,
    description: body.description ?? "",
    evidence_summary: body.evidence_summary ?? "",
    source: "admin",
    sort_order: body.sort_order ?? 0,
    issued_at: new Date().toISOString(),
    expires_at: body.expires_at ?? null,
    is_public: body.is_public ?? true,
    verification_id: body.verification_id ?? null,
    metadata: body.metadata ?? {},
  });

  if (!signal) return NextResponse.json({ error: "Erro ao criar sinal" }, { status: 500 });

  if (body.provenance) {
    await provenanceRepo.create({
      signal_id: signal.id,
      merchant_id: merchantId,
      generated_by: auth.userId,
      verification_id: body.provenance.verification_id ?? null,
      evidence_summary: body.provenance.evidence_summary ?? "",
      how_obtained: body.provenance.how_obtained ?? "",
      approved_by: auth.userId,
      trust_level: body.provenance.trust_level ?? "medium",
      is_auditable: true,
      notes: body.provenance.notes ?? null,
    });
  }

  return NextResponse.json({ data: signal }, { status: 201 });
}
