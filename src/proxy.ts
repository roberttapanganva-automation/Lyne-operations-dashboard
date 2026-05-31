import { type NextRequest, NextResponse } from "next/server";
import {
  copySupabaseCookies,
  updateSession,
} from "@/lib/supabase/middleware";

const protectedRoutes = [
  "/dashboard",
  "/leads",
  "/jobs",
  "/tasks",
  "/calendar",
  "/automations",
  "/settings",
  "/owner",
];

function isProtectedRoute(pathname: string) {
  return protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function getSafeRedirectPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  return value;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { envError, response, user } = await updateSession(request);

  if (envError && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("error", "supabase-env");

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (!user && isProtectedRoute(pathname)) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && pathname === "/login") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = getSafeRedirectPath(
      request.nextUrl.searchParams.get("redirect") ??
        request.nextUrl.searchParams.get("next"),
    );
    redirectUrl.search = "";

    const redirectResponse = NextResponse.redirect(redirectUrl);
    copySupabaseCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|assets|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
