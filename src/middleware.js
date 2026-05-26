import { NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_VALUE,
} from "@/libs/auth_session";

export function middleware(request) {
  const { pathname } = request.nextUrl;
  const session = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isLoggedIn = session === SESSION_COOKIE_VALUE;

  if (pathname.startsWith("/dashboard")) {
    if (!isLoggedIn) {
      const loginUrl = new URL("/", request.url);
      if (pathname !== "/dashboard") {
        loginUrl.searchParams.set("redirect", pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === "/" && isLoggedIn) {
    const redirectTo =
      request.nextUrl.searchParams.get("redirect") || "/dashboard";
    const safeRedirect =
      redirectTo.startsWith("/dashboard") && !redirectTo.startsWith("//")
        ? redirectTo
        : "/dashboard";
    return NextResponse.redirect(new URL(safeRedirect, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
