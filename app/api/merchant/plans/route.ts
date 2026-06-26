import { NextResponse } from "next/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase.from("merchant_plans").select("*").order("price_monthly");
  return NextResponse.json({ data: data ?? [] });
}
