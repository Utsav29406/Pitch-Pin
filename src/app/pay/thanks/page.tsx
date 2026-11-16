import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Payment received", robots: { index: false } };

/** Where Razorpay payment links send squad members after paying. */
export default function PayThanksPage() {
  return (
    <main className="mx-auto flex max-w-md flex-col items-start gap-4 px-4 pt-12">
      <h1 className="text-3xl font-semibold">Thanks, your share is in</h1>
      <p className="text-muted-foreground">
        The organiser sees your payment straight away. If the squad doesn&apos;t finish paying before the hold ends, you get
        an automatic refund.
      </p>
      <Link href="/turfs" className="inline-flex h-12 items-center rounded-2xl bg-primary px-6 font-bold text-primary-foreground">
        Find your own turf
      </Link>
    </main>
  );
}
