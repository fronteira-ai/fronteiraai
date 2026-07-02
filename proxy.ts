import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // ── Admin routes ──────────────────────────────────────────────────────────
  const isAdminPath = pathname.startsWith("/admin");
  const isAdminLogin = pathname.startsWith("/admin/login");

  if (isAdminPath && !isAdminLogin && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isAdminLogin && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/admin";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  // ── Auth callback (Supabase email confirmation) ───────────────────────────
  if (pathname.startsWith("/auth/callback")) {
    return supabaseResponse;
  }

  // ── Merchant routes ───────────────────────────────────────────────────────
  const isMerchantPath = pathname.startsWith("/merchant");
  const isMerchantPublic =
    pathname.startsWith("/merchant/login") ||
    pathname.startsWith("/merchant/register");

  if (isMerchantPath && !isMerchantPublic && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/merchant/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isMerchantPublic && user) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/merchant/dashboard";
    dashboardUrl.search = "";
    return NextResponse.redirect(dashboardUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/admin/:path*", "/merchant/:path*", "/auth/callback"],
};
