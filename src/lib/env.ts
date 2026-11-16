// Feature flags derived from env, so the app degrades gracefully while
// services are still being connected.

export const hasDatabase = Boolean(process.env.DATABASE_URL);

export const hasRazorpay = Boolean(
  process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
);

export const appUrl =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";

/** Minutes a hold lasts before slots go back on sale. */
export const HOLD_MINUTES = { FULL: 8, SPLIT: 30 } as const;

/** "Continue with Google" shows once both are set (Google Cloud → OAuth client, type Web). */
export const hasGoogle = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

/** Replies go to the team inbox; Gmail SMTP also sends from it when Resend isn't set up. */
export const MAIL_FROM = process.env.GMAIL_USER || "teampitchpinn@gmail.com";
/** Resend (preferred). Without a verified domain Resend only allows onboarding@resend.dev as the sender. */
export const hasResend = Boolean(process.env.RESEND_API_KEY);
export const RESEND_FROM = process.env.RESEND_FROM || "PitchPin <onboarding@resend.dev>";
export const hasMail = hasResend || Boolean(process.env.GMAIL_APP_PASSWORD);
