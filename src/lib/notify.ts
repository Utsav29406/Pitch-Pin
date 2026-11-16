import "server-only";
import * as webpush from "web-push";
import { db } from "./db";

type PushPayload = { title: string; body: string; url?: string };

let vapidReady = false;
function ensureVapid() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  if (!vapidReady) {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
    vapidReady = true;
  }
  return true;
}

/** Send a web push to every device the user subscribed. Drops dead subscriptions. */
export async function pushToUser(userId: string, payload: PushPayload) {
  if (!ensureVapid()) {
    console.info("[push] VAPID keys missing; skipped:", payload.title);
    return;
  }
  const subs = await db().pushSubscription.findMany({ where: { userId } });
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
        );
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) {
          await db().pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        } else {
          console.warn("[push] failed:", (err as Error).message);
        }
      }
    }),
  );
}
