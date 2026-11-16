import { NextResponse, type NextRequest } from "next/server";
import { appUrl } from "@/lib/env";
import { isAdminHost } from "@/lib/hosts";

/** Keep the admin console and the player site on separate addresses. */
export function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const inAdmin = pathname === "/admin" || pathname.startsWith("/admin/");

  if (isAdminHost(host)) {
    if (inAdmin) return NextResponse.next();
    if (pathname === "/") return NextResponse.redirect(new URL("/admin", req.url));
    // Anything else (a turf page, say) lives on the player site.
    const site = new URL(appUrl);
    if (isAdminHost(site.host)) return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.redirect(new URL(pathname + search, site));
  }

  // Player site: there is no admin area here.
  if (inAdmin) return NextResponse.rewrite(new URL("/_admin-is-elsewhere", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|icons/|.*\\.[a-z0-9]+$).*)"],
};
