"use client";

/** Last-resort screen if the root layout itself fails. Must render its own <html>. */
export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-IN">
      <body style={{ margin: 0, background: "#f3f6f3", color: "#13261a", fontFamily: "Inter, system-ui, sans-serif" }}>
        <main style={{ maxWidth: 440, margin: "0 auto", padding: "64px 16px", display: "flex", flexDirection: "column", gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>PitchPin hit a snag</h1>
          <p style={{ margin: 0, color: "#5b6a5f" }}>Something went wrong while loading. Please try again.</p>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => retry()}
              style={{ height: 48, padding: "0 24px", borderRadius: 16, border: 0, background: "#1e5a35", color: "#fbf6ea", fontWeight: 700, fontSize: 15, cursor: "pointer" }}
            >
              Try again
            </button>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ height: 48, padding: "0 24px", borderRadius: 16, border: "1px solid #e0d4b9", display: "inline-flex", alignItems: "center", fontWeight: 700, color: "#13261a", textDecoration: "none" }}>
              Back to turfs
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
