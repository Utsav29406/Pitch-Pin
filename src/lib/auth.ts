import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { after, connection } from "next/server";
import { cache } from "react";
import { newSessionToken, sha256 } from "./auth/crypto";
import { db } from "./db";
import { hasDatabase } from "./env";

export type CurrentUser = { id: string; email: string; isAdmin: boolean };

export const SESSION_COOKIE = "turfup_session";
const SESSION_DAYS = 30;

/** The signed-in user, or null. Reads cookies, so call it inside <Suspense>. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  if (!hasDatabase) return null;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  await connection(); // the expiry check below compares against the current time
  const session = await db().session.findUnique({
    where: { id: sha256(token) },
    select: { expiresAt: true, user: { select: { id: true, email: true, isAdmin: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session.user;
});

export async function requireUser(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Signed-in admin. Signed-out visitors go to the admin sign-in; players get a 404. */
export async function requireAdmin(next: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  if (!user.isAdmin) notFound();
  return user;
}

/** Start a session and set the cookie. Call only from a Server Action or Route Handler. */
export async function startSession(userId: string) {
  const { token, id } = newSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400_000);
  await db().session.create({ data: { id, userId, expiresAt } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Sign out: the cookie goes at once; the database row is removed after the response so the redirect isn't held up. */
export async function endSession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  store.delete(SESSION_COOKIE);
  if (token) after(() => db().session.deleteMany({ where: { id: sha256(token) } }).then(() => undefined));
}
