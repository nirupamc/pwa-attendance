import { NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";

const PUBLIC_ROUTES = ["/login"];

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const supabase = createSupabaseMiddlewareClient(request, response);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  if (!user && !isPublicRoute) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const { data: profile } = await supabase
      .from("employees")
      .select("role, must_change_password")
      .eq("id", user.id)
      .single();

    const mustChange = Boolean(profile?.must_change_password);
    const role = profile?.role ?? "employee";

    if (pathname === "/login") {
      if (mustChange) {
        return NextResponse.redirect(new URL("/change-password", request.url));
      }
      const destination = role === "admin" ? "/admin" : "/home";
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (mustChange && pathname !== "/change-password") {
      const changeUrl = new URL("/change-password", request.url);
      return NextResponse.redirect(changeUrl);
    }

    if (!mustChange && pathname === "/change-password") {
      const nextUrl = new URL(role === "admin" ? "/admin" : "/home", request.url);
      return NextResponse.redirect(nextUrl);
    }

    if (role !== "admin" && pathname.startsWith("/admin")) {
      const homeUrl = new URL("/home", request.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/|sw.js).*)",
  ],
};
