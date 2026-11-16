"use client";

type RazorpayResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  prefill?: { email?: string; contact?: string };
  theme?: { color?: string };
  handler: (r: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (o: RazorpayOptions) => { open: () => void; on: (e: string, cb: (r: unknown) => void) => void };
  }
}

let loader: Promise<void> | null = null;

function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => {
      loader = null;
      reject(new Error("Couldn't load Razorpay. Check your connection."));
    };
    document.body.appendChild(s);
  });
  return loader;
}

/**
 * Create an order for a share, open Razorpay Checkout (UPI, cards, netbanking),
 * and verify the payment on the server. Resolves true when paid.
 */
export async function payShare(shareId: string): Promise<{ ok: boolean; error?: string }> {
  const orderRes = await fetch("/api/razorpay/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ shareId }),
  });
  const order = await orderRes.json();
  if (!orderRes.ok) return { ok: false, error: order.error ?? "Couldn't start payment." };

  await loadScript();
  return new Promise((resolve) => {
    const rzp = new window.Razorpay!({
      key: order.keyId,
      order_id: order.orderId,
      amount: order.amount,
      currency: order.currency,
      name: order.name,
      description: order.description,
      prefill: { email: order.email },
      theme: { color: "#1e5a35" },
      handler: async (r) => {
        const v = await fetch("/api/razorpay/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(r),
        });
        const body = await v.json().catch(() => ({}));
        resolve(v.ok ? { ok: true } : { ok: false, error: body.error ?? "Payment check failed." });
      },
      modal: { ondismiss: () => resolve({ ok: false }) },
    });
    rzp.on("payment.failed", () => resolve({ ok: false, error: "Payment failed. No money was taken." }));
    rzp.open();
  });
}
