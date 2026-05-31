import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "./lib/supabase/middleware-client";

/**
 * Protected route prefixes — any request to these paths requires a valid session.
 */
const PROTECTED_PREFIXES = [
  "/projects",
  "/inbox",
  "/account",
  "/admin",
  "/audit-log",
  "/activity",
  "/payments",
  "/approvals",
  "/funding",
  "/notifications",
  "/settings",
  "/requests",
  "/reviews",
  "/packages",
  "/summary",
];

const isProtected = (pathname: string) =>
  pathname === "/" || PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));

const isAuthRoute = (pathname: string) => pathname.startsWith("/auth");

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  // Create a Supabase client that can read and refresh session cookies.
  const supabase = createMiddlewareClient(request, response);

  // getUser() validates the JWT with the Supabase server — do not use getSession()
  // as it only reads the local cookie without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // If the user is authenticated and hits the login page, send them to /projects.
  if (user && isAuthRoute(pathname)) {
    return NextResponse.redirect(new URL("/projects", request.url));
  }

  // If the user is not authenticated and tries to access a protected route,
  // redirect to /auth/login with the original destination so we can restore it.
  if (!user && isProtected(pathname)) {
    const loginUrl = new URL("/auth/login", request.url);
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Return the response — this carries any refreshed session cookies set by
  // createMiddlewareClient so the browser stays authenticated.
  return response;
}

export const config = {
  matcher: [
    /*
     * Run only on page navigations — skip API routes, Next.js internals,
     * static files and the auth callback. API routes perform their own auth
     * via createClient(); running middleware on them doubles round-trips.
     */
    "/((?!api/|_next/static|_next/image|favicon\\.ico|brand/|auth/callback).*)",
  ],
};
