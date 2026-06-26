import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/merchant/dashboard";
  const error = searchParams.get("error");

  // Supabase sent an error (e.g. link expired)
  if (error) {
    const dest = new URL("/merchant/login", origin);
    dest.searchParams.set("error", error);
    return NextResponse.redirect(dest);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/merchant/login", origin));
  }

  // Collect cookies to set on the response
  const cookiesToSet: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(items) {
          items.forEach((item) => cookiesToSet.push(item as typeof cookiesToSet[number]));
        },
      },
    }
  );

  const { error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

  if (sessionError) {
    const dest = new URL("/merchant/login", origin);
    dest.searchParams.set("error", "email_confirmation_failed");
    return NextResponse.redirect(dest);
  }

  // Build redirect and forward auth cookies
  const response = NextResponse.redirect(new URL(next, origin));
  cookiesToSet.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options as Parameters<typeof response.cookies.set>[2]);
  });
  return response;
}
