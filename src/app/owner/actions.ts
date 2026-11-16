"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { BookingError } from "@/lib/bookings";
import { claimListing, decideClaim, saveTurf } from "@/lib/owner";
import type { ClaimInput, TurfInput } from "@/lib/turf-schema";

type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string; needLogin?: boolean };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof BookingError) return { ok: false, error: err.message };
  console.error(err);
  return { ok: false, error: "Something went wrong. Please try again." };
}

export async function saveTurfAction(input: TurfInput): Promise<Result<{ slug: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    const slug = await saveTurf(user, input);
    revalidatePath("/owner");
    return { ok: true, slug };
  } catch (err) {
    return fail(err);
  }
}

export async function claimAction(input: ClaimInput): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    await claimListing(user, input);
    revalidatePath("/owner");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}

export async function decideClaimAction(claimId: string, approve: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Sign in again.", needLogin: true };
  try {
    await decideClaim(user, claimId, approve);
    revalidatePath("/admin");
    revalidatePath("/admin/claims");
    return { ok: true };
  } catch (err) {
    return fail(err);
  }
}
