import { appUrl } from "@/lib/env";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { deleteTurfAction, removeOwnerAction } from "@/app/admin/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { AdminSearch, FilterChips, one, pageOf, Pager } from "@/components/admin/list-tools";
import { listTurfs, type TurfFilter } from "@/lib/admin";
import { requireAdmin } from "@/lib/auth";
import { rupees } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Turfs", robots: { index: false } };

const FILTERS: { value: TurfFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "bookable", label: "Bookable" },
  { value: "owned", label: "Has an owner" },
  { value: "listing", label: "Listings only" },
];

export default function AdminTurfsPage({ searchParams }: PageProps<"/admin/turfs">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-[20px] bg-secondary" />}>
      <Turfs searchParams={searchParams} />
    </Suspense>
  );
}

async function Turfs({ searchParams }: { searchParams: PageProps<"/admin/turfs">["searchParams"] }) {
  await requireAdmin("/admin/turfs");
  await connection();
  const sp = await searchParams;
  const q = one(sp.q).trim().slice(0, 80);
  const filter = (FILTERS.some((f) => f.value === one(sp.filter)) ? one(sp.filter) : "all") as TurfFilter;
  const page = pageOf(sp.page);
  const { total, pages, rows } = await listTurfs({ q, filter, page });

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <AdminSearch action="/admin/turfs" q={q} placeholder="Turf, area or owner email" hidden={{ filter }} />
        <FilterChips base="/admin/turfs" current={filter} options={FILTERS} q={q} />
      </div>
      <p className="text-sm text-muted-foreground">
        {total} turf{total === 1 ? "" : "s"}
        {q && ` matching “${q}”`}
      </p>
      <div className="overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3 font-semibold">Turf</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Owner</th>
              <th className="px-4 py-3 text-right font-semibold">Courts</th>
              <th className="px-4 py-3 text-right font-semibold">Bookings</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className="border-b align-middle last:border-0">
                <td className="px-4 py-3">
                  <a href={`${appUrl}/turf/${v.slug}`} target="_blank" rel="noreferrer" className="font-semibold hover:underline">
                    {v.name}
                  </a>
                  <span className="block text-muted-foreground">{v.area}</span>
                </td>
                <td className="px-4 py-3">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold whitespace-nowrap", v.courts ? "bg-live/15 text-primary" : "bg-secondary text-muted-foreground")}>
                    {v.courts ? `Bookable · from ${rupees(v.fromPrice!)}` : "Listing"}
                  </span>
                </td>
                <td className="max-w-56 truncate px-4 py-3">{v.ownerEmail ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-3 text-right tabular">{v.courts}</td>
                <td className="px-4 py-3 text-right tabular">{v.bookings}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Link href={`/admin/turfs/${v.slug}`} className="inline-flex h-9 items-center rounded-lg border px-3 text-xs font-semibold hover:border-primary">
                      Edit
                    </Link>
                    {v.ownerEmail && <ConfirmButton action={removeOwnerAction.bind(null, v.id)} label="Remove owner" done={`${v.name} no longer has an owner`} />}
                    {v.bookings === 0 && <ConfirmButton action={deleteTurfAction.bind(null, v.id)} label="Delete" done={`${v.name} deleted`} danger />}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                  No turfs match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager base="/admin/turfs" page={page} pages={pages} params={{ filter, ...(q && { q }) }} />
    </>
  );
}
