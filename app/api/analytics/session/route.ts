import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";
import { createAnalyticsServices } from "@/lib/analytics-factory";
import type { SessionPayload } from "@/src/domains/merchant-analytics/types";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();
  const { session } = createAnalyticsServices(serviceClient);

  const result = await session.createSession(body as SessionPayload);
  if (!result) {
    return NextResponse.json({ error: "session_creation_failed" }, { status: 400 });
  }
  return NextResponse.json({ session_id: result.id }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("id");
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  const serviceClient = getSupabaseServiceClient();
  const { session, eventStream } = createAnalyticsServices(serviceClient);

  const [sessionData, stream] = await Promise.all([
    session.getSession(sessionId),
    eventStream.getStream(sessionId),
  ]);

  if (!sessionData) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json({ session: sessionData, stream });
}
