import Link from "next/link";

export const LEGAL_UPDATED = "15 November 2026";
export const CONTACT_EMAIL = "teampitchpinn@gmail.com";

export function LegalPage({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-8 px-4 pt-8 md:px-6 md:pt-14">
      <header className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Last updated {LEGAL_UPDATED}</p>
        <h1 className="text-4xl font-semibold md:text-5xl">{title}</h1>
        <p className="text-lg text-muted-foreground">{intro}</p>
      </header>
      <div className="flex flex-col gap-8 rounded-3xl border bg-card p-6 md:p-10">{children}</div>
      <p className="text-sm text-muted-foreground">
        Questions? Email <a className="font-semibold text-primary underline underline-offset-4" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See also our{" "}
        <Link className="font-semibold text-primary underline underline-offset-4" href="/privacy">Privacy Policy</Link> and{" "}
        <Link className="font-semibold text-primary underline underline-offset-4" href="/terms">Terms of Service</Link>.
      </p>
    </main>
  );
}

export function LegalSection({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-24 flex-col gap-3 [&_li]:ml-5 [&_li]:list-disc [&_p]:leading-relaxed [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
      <h2 className="text-2xl font-semibold">{title}</h2>
      {children}
    </section>
  );
}
