import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 pt-16">
      <h1 className="text-3xl font-semibold">Off the pitch</h1>
      <p className="text-muted-foreground">We couldn&apos;t find that page. The turf or booking may have been removed.</p>
      <Link href="/" className="inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground">
        Back to turfs
      </Link>
    </main>
  );
}
