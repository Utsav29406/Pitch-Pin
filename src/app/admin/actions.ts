"use server";

import { revalidatePath } from "next/cache";
import { adminCancelBooking, deleteTurf, removeOwner, setAdmin } from "@/lib/admin";
import { getCurrentUser } from "@/lib/auth";
import { BookingError } from "@/lib/bookings";

export type AdminResult = { ok: true } | { ok: false; error: string };

async function run(path: string, fn: (user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>) => Promise<void>): Promise<AdminResult> {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return { ok: false, error: "Admins only." };
  try {
    await fn(user);
    revalidatePath(path);
    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    if (err instanceof BookingError) return { ok: false, error: err.message };
    console.error(err);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

export async function removeOwnerAction(venueId: string) {
  return run("/admin/turfs", (u) => removeOwner(u, venueId));
}

export async function deleteTurfAction(venueId: string) {
  return run("/admin/turfs", (u) => deleteTurf(u, venueId));
}

export async function cancelBookingAction(bookingId: string) {
  return run("/admin/bookings", (u) => adminCancelBooking(u, bookingId));
}

export async function setAdminAction(profileId: string, isAdmin: boolean) {
  return run("/admin/users", (u) => setAdmin(u, profileId, isAdmin));
}
