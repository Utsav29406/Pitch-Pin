"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { updatePrefsAction } from "@/app/actions";
import { Switch } from "@/components/ui/switch";

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function subscribePush(): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key) return "Push isn't configured yet.";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "This browser doesn't support notifications. On iPhone, add PitchPin to your Home Screen first.";
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    return "Notifications are blocked. Allow them in your browser settings.";
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(key),
    }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sub.toJSON()),
  });
  return res.ok ? null : "Couldn't save this device for notifications.";
}

function Row({ title, hint, label, checked, disabled, onChange }: { title: string; hint: string; label: string; checked: boolean; disabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-h-14 items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <Switch aria-label={label} checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

export function ReminderSettings({ initial }: { initial: { emailOptIn: boolean; pushOptIn: boolean } }) {
  const [email, setEmail] = useState(initial.emailOptIn);
  const [push, setPush] = useState(initial.pushOptIn);
  const [pending, start] = useTransition();

  return (
    <section className="flex flex-col gap-1 rounded-[18px] border bg-card p-4" aria-labelledby="reminders">
      <h2 id="reminders" className="text-base font-semibold">Reminders</h2>
      <Row
        title="Email"
        hint="2 hours before kick-off"
        label="Email reminder"
        checked={email}
        disabled={pending}
        onChange={(v) => {
          setEmail(v);
          start(async () => {
            const res = await updatePrefsAction({ emailOptIn: v });
            if (res.ok) toast.success(`Email reminder ${v ? "on" : "off"}`);
            else {
              setEmail(!v);
              toast.error(res.error);
            }
          });
        }}
      />
      <hr />
      <Row
        title="Push notification"
        hint="30 minutes before, with directions"
        label="Push reminder"
        checked={push}
        disabled={pending}
        onChange={(v) => {
          setPush(v);
          start(async () => {
            if (v) {
              const err = await subscribePush();
              if (err) {
                setPush(false);
                toast.error(err);
                return;
              }
            }
            const res = await updatePrefsAction({ pushOptIn: v });
            if (res.ok) toast.success(`Push reminder ${v ? "on" : "off"}`);
            else {
              setPush(!v);
              toast.error(res.error);
            }
          });
        }}
      />
    </section>
  );
}
