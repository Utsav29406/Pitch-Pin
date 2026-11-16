import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { authUrl, newPkce, OAUTH_COOKIE } from "@/lib/auth/google";
import { appUrl, hasGoogle } from "@/lib/env";
import { isInAppBrowser } from "@/lib/in-app";

function safeNext(raw: string | null) {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
}

/** Start "Continue with Google". Always runs on the main address so the callback finds its cookie. */
export async function GET(req: NextRequest) {
  const next = safeNext(req.nextUrl.searchParams.get("next"));
  if (!hasGoogle) return NextResponse.redirect(new URL(`/login?error=google-off&next=${encodeURIComponent(next)}`, req.url));

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const main = new URL(appUrl);
  if (host && host !== main.host) {
    return NextResponse.redirect(new URL(`/api/auth/google?next=${encodeURIComponent(next)}`, main));
  }

  // Google blocks sign-in inside WhatsApp/Instagram/Facebook browsers: explain and offer a real browser instead.
  if (isInAppBrowser(req.headers.get("user-agent"))) {
    return NextResponse.redirect(new URL(`/login?error=inapp&next=${encodeURIComponent(next)}`, main));
  }

  const { verifier, challenge, state } = newPkce();
  (await cookies()).set(OAUTH_COOKIE, JSON.stringify({ state, verifier, next }), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/auth/google",
    maxAge: 600,
  });
  return NextResponse.redirect(authUrl(state, challenge));
}
