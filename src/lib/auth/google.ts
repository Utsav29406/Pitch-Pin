import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { appUrl } from "../env";

export const OAUTH_COOKIE = "pp_google_oauth";
export const redirectUri = () => `${appUrl}/api/auth/google/callback`;

export function newPkce() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge, state: randomBytes(16).toString("base64url") };
}

export function authUrl(state: string, challenge: string) {
  const u = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  u.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
    prompt: "select_account",
  }).toString();
  return u;
}

export type GoogleProfile = { sub: string; email: string; name?: string };

/** Swap the code for tokens and read the ID token. It comes straight from Google over TLS, so its claims are trusted after the checks below. */
export async function exchangeCode(code: string, verifier: string): Promise<GoogleProfile> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      code_verifier: verifier,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${res.status} ${await res.text()}`);
  const { id_token } = (await res.json()) as { id_token?: string };
  if (!id_token) throw new Error("Google returned no ID token");
  const claims = JSON.parse(Buffer.from(id_token.split(".")[1], "base64url").toString("utf8")) as {
    iss: string; aud: string; exp: number; sub: string; email?: string; email_verified?: boolean; name?: string;
  };
  if (!["https://accounts.google.com", "accounts.google.com"].includes(claims.iss)) throw new Error("Bad issuer");
  if (claims.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error("Bad audience");
  if (claims.exp * 1000 < Date.now()) throw new Error("Expired ID token");
  if (!claims.email || !claims.email_verified) throw new Error("Google email not verified");
  return { sub: claims.sub, email: claims.email.toLowerCase(), name: claims.name };
}
