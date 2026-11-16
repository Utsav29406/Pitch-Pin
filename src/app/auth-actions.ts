"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { endSession, startSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/auth/crypto";
import { db } from "@/lib/db";
import { hasDatabase } from "@/lib/env";
import { sendWelcome } from "@/lib/mail";

type Result = { ok: true } | { ok: false; error: string };

const MIN_PASSWORD = 8;
const MAX_PASSWORD_FAILS = 8;
const LOCK_MIN = 15;

const credentials = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email("Enter a valid email, like name@gmail.com").max(254)),
  password: z.string().max(200),
});

function noDb(): Result {
  return { ok: false, error: "Sign-in isn't connected yet: the database is missing." };
}

export async function signUpAction(input: { email: string; password: string }): Promise<Result> {
  if (!hasDatabase) return noDb();
  const parsed = credentials.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;
  if (password.length < MIN_PASSWORD) return { ok: false, error: `Use at least ${MIN_PASSWORD} characters for your password.` };

  const existing = await db().profile.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "That email already has an account. Sign in instead." };

  const user = await db().profile.create({ data: { email, passwordHash: await hashPassword(password) } });
  await startSession(user.id);
  await sendWelcome(email);
  return { ok: true };
}

export async function signInAction(input: { email: string; password: string }): Promise<Result> {
  return signIn(input, false);
}

/** Admin console sign-in: only admin accounts get a session here. */
export async function adminSignInAction(input: { email: string; password: string }): Promise<Result> {
  return signIn(input, true);
}

async function signIn(input: { email: string; password: string }, adminOnly: boolean): Promise<Result> {
  if (!hasDatabase) return noDb();
  const parsed = credentials.safeParse(input);
  if (!parsed.success || !parsed.data.password) return { ok: false, error: "Enter your email and password." };
  const { email, password } = parsed.data;
  const wrong: Result = { ok: false, error: "Email or password is wrong." };

  const user = await db().profile.findUnique({ where: { email } });
  if (user && !user.passwordHash && user.googleId) {
    return { ok: false, error: "This account signs in with Google. Use “Continue with Google”." };
  }
  if (!user?.passwordHash) {
    await hashPassword(password); // similar timing for unknown emails
    return wrong;
  }
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return { ok: false, error: `Too many wrong passwords. Try again in ${LOCK_MIN} minutes.` };
  }
  if (!(await verifyPassword(password, user.passwordHash))) {
    const fails = user.failedLogins + 1;
    const lock = fails >= MAX_PASSWORD_FAILS;
    await db().profile.update({
      where: { id: user.id },
      data: { failedLogins: lock ? 0 : fails, lockedUntil: lock ? new Date(Date.now() + LOCK_MIN * 60_000) : null },
    });
    return wrong;
  }
  if (user.failedLogins) await db().profile.update({ where: { id: user.id }, data: { failedLogins: 0 } });
  if (adminOnly && !user.isAdmin) return { ok: false, error: "This account isn't an admin. Use the player sign-in on the main site." };
  await startSession(user.id);
  return { ok: true };
}

export async function signOutAction() {
  await endSession();
  redirect("/");
}

export async function adminSignOutAction() {
  await endSession();
  redirect("/admin/login");
}
