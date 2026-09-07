import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the auth session cookie on every request, redirects
// unauthenticated users away from protected areas, and actually terminates
// a deactivated employee's session (see the employment_status check below —
// this is the ONE place in the app that can do that; see the note there for
// why). Role-based access (driver vs admin) is enforced again in each route
// group's layout AND by RLS at the database level — this middleware only
// handles "logged in or not" plus deactivation.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // getUser() (and, below, signOut()) can rewrite `response` via the
  // `setAll` callback above — e.g. a rotated refresh token, or a cleared
  // session. Any redirect we return MUST carry those cookies forward, or a
  // legitimate session refresh (or a sign-out) silently gets dropped the
  // moment this function takes a redirect branch instead of returning
  // `response` directly. This wraps NextResponse.redirect() so every branch
  // below gets that for free.
  function redirectTo(url: URL): NextResponse {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const path = request.nextUrl.pathname;
  const isPublicPath = path.startsWith("/login") || path.startsWith("/reset-password") || path.startsWith("/auth");

  if (!user && !isPublicPath) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return redirectTo(redirectUrl);
  }

  // A deactivated account keeps a valid Supabase Auth session (Auth doesn't
  // know about our employment_status column) until something actually signs
  // it out. That can only happen here, in middleware: a Server Component
  // render (e.g. getCurrentProfile in a layout) has no response to attach a
  // cookie mutation to, so calling auth.signOut() there is a silent no-op —
  // it looks like it works but the session cookie survives, which used to
  // cause an infinite redirect loop between "/" and "/login?deactivated=1"
  // for a deactivated driver. Checking it here, where cookies can actually
  // be cleared, is what makes deactivation effective rather than cosmetic.
  if (user && !isPublicPath) {
    const { data: profile } = await supabase.from("profiles").select("employment_status").eq("id", user.id).maybeSingle();
    if (profile && profile.employment_status !== "active") {
      await supabase.auth.signOut();
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/login";
      redirectUrl.search = "?deactivated=1";
      return redirectTo(redirectUrl);
    }
  }

  if (user && path === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    return redirectTo(redirectUrl);
  }

  return response;
}
