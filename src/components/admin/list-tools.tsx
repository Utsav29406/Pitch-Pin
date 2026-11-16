import { Search } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** GET search form; keeps the current filter. */
export function AdminSearch({ action, q, placeholder, hidden }: { action: string; q: string; placeholder: string; hidden?: Record<string, string> }) {
  return (
    <form role="search" action={action} className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl border bg-card px-3 focus-within:border-primary">
      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <label htmlFor="admin-q" className="sr-only">
        Search
      </label>
      <input id="admin-q" name="q" type="search" defaultValue={q} placeholder={placeholder} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none" />
      {Object.entries(hidden ?? {}).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </form>
  );
}

export function FilterChips<T extends string>({
  base,
  current,
  options,
  q,
}: {
  base: string;
  current: T;
  options: { value: T; label: string }[];
  q: string;
}) {
  return (
    <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
      {options.map((o) => {
        const sp = new URLSearchParams({ filter: o.value, ...(q && { q }) });
        return (
          <Link
            key={o.value}
            href={`${base}?${sp}`}
            aria-current={current === o.value ? "true" : undefined}
            className={cn(
              "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-sm font-semibold",
              current === o.value ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary",
            )}
          >
            {o.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Pager({ base, page, pages, params }: { base: string; page: number; pages: number; params: Record<string, string> }) {
  if (pages <= 1) return null;
  const href = (p: number) => `${base}?${new URLSearchParams({ ...params, page: String(p) })}`;
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className="rounded-lg border bg-card px-3 py-2 font-semibold hover:border-primary">
          ← Previous
        </Link>
      ) : (
        <span />
      )}
      <span className="text-muted-foreground tabular">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="rounded-lg border bg-card px-3 py-2 font-semibold hover:border-primary">
          Next →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

export const one = (v: string | string[] | undefined) => (typeof v === "string" ? v : "");
export const pageOf = (v: string | string[] | undefined) => Math.max(1, Math.min(1000, Number(one(v)) || 1));
