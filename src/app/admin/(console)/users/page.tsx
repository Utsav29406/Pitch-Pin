import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { setAdminAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminSearch, one, pageOf, Pager } from "@/components/admin/list-tools";
import { listUsers } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";

export const metadata: Metadata = { title: "Users", robots: { index: false } };

export default function AdminUsersPage({ searchParams }: PageProps<"/admin/users">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
      <Users searchParams={searchParams} />
    </Suspense>
  );
}

async function Users({ searchParams }: { searchParams: PageProps<"/admin/users">["searchParams"] }) {
  const me = await requireAdmin("/admin/users");
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const page = pageOf(sp.page);
  const { total, pages, rows } = await listUsers({ q, page });

  return (
    <>
      <AdminSearch action="/admin/users" q={q} placeholder="Email, name or phone" />
      <p className="text-sm text-muted-foreground">
        {total} account{total === 1 ? "" : "s"}
        {q && ` matching “${q}”`}
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
              <th className="px-4 py-3 text-right font-semibold">Bookings</th>
              <th className="px-4 py-3 text-right font-semibold">Turfs</th>
              <th className="px-4 py-3 text-right font-semibold">Admin</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-b align-middle last:border-0">
                <td className="max-w-72 px-4 py-3">
                  <span className="block truncate font-semibold">{u.email}</span>
                  {u.name && <span className="block truncate text-muted-foreground">{u.name}</span>}
                </td>
                <td className="px-4 py-3 tabular">{u.phone ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap">{u.createdAt.toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" })}</td>
                <td className="px-4 py-3 text-right tabular">{u._count.bookings}</td>
                <td className="px-4 py-3 text-right tabular">{u._count.ownedVenues}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {u.isAdmin && <span className="rounded-full bg-gold-light/30 px-2 py-0.5 text-xs font-bold text-gold">Admin</span>}
                    {u.id === me.id ? (
                      <span className="text-xs text-muted-foreground">You</span>
                    ) : u.isAdmin ? (
                      <ConfirmButton action={setAdminAction.bind(null, u.id, false)} label="Remove admin" done={`${u.email} is no longer an admin`} danger />
                    ) : (
                      <ConfirmButton action={setAdminAction.bind(null, u.id, true)} label="Make admin" done={`${u.email} is now an admin`} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No accounts match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/users" page={page} pages={pages} params={q ? { q } : {}} />
    </>
  );
}
