import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { startSession } from "@/lib/auth";
import { exchangeCode, OAUTH_COOKIE } from "@/lib/auth/google";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/env";
import { sendWelcome } from "@/lib/mail";

export async function GET(req: NextRequest) {
  const store = await cookies();
  const raw = store.get(OAUTH_COOKIE)?.value;
  store.delete({ name: OAUTH_COOKIE, path: "/api/auth/google" });
  const fail = (why: string, next = "/") => {
    console.warn("[google] sign-in failed:", why);
    return NextResponse.redirect(new URL(`/login?error=google&next=${encodeURIComponent(next)}`, appUrl));
  };

  let saved: { state: string; verifier: string; next: string };
  try {
    saved = JSON.parse(raw ?? "");
  } catch {
    return fail("missing state cookie");
  }
  const sp = req.nextUrl.searchParams;
  if (sp.get("error")) return fail(`google said ${sp.get("error")}`, saved.next); // e.g. the user pressed Cancel
  const code = sp.get("code");
  if (!code || sp.get("state") !== saved.state) return fail("state mismatch", saved.next);

  try {
    const g = await exchangeCode(code, saved.verifier);
    const byGoogle = await db().profile.findUnique({ where: { googleId: g.sub } });
    let userId = byGoogle?.id;
    if (!userId) {
      // Google has verified this email, so it's safe to link an existing account with the same address.
      const byEmail = await db().profile.findUnique({ where: { email: g.email } });
      if (byEmail) {
        await db().profile.update({ where: { id: byEmail.id }, data: { googleId: g.sub, name: byEmail.name ?? g.name ?? null } });
        userId = byEmail.id;
      } else {
        const created = await db().profile.create({ data: { email: g.email, googleId: g.sub, name: g.name ?? null } });
        userId = created.id;
        await sendWelcome(g.email);
      }
    }
    await startSession(userId);
    return NextResponse.redirect(new URL(saved.next, appUrl));
  } catch (err) {
    console.error(err);
    return fail("exchange failed", saved.next);
  }
}
