import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/",
  "/transactions",
  "/wallets",
  "/categories",
  "/reports",
  "/telegram",
  "/backups",
  "/settings",
  "/split-bill",
  "/scan-receipt",
];

// Routes that are public (no auth required)
const PUBLIC_ROUTES = [
  "/login",
  "/api/telegram/webhook",
];

function isProtectedRoute(pathname: string): boolean {
  // Exact match for "/"
  if (pathname === "/") return true;
  // Prefix match for all other protected routes
  return PROTECTED_ROUTES.some(
    (route) => route !== "/" && pathname.startsWith(route),
  );
}

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth for public routes and static assets
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Only guard protected routes
  if (!isProtectedRoute(pathname)) {
    return NextResponse.next();
  }

  // Refresh the session and get user info
  const { supabaseResponse, user } = await updateSession(request);

  // If no user and trying to access protected route, redirect to /login
  if (!user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If user is logged in but on /login, redirect to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
