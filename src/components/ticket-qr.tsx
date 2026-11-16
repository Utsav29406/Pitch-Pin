"use client";

import QRCode from "qrcode";
import { useEffect, useState } from "react";

export function TicketQr({ value, label }: { value: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QRCode.toDataURL(value, { margin: 1, width: 240, color: { dark: "#13261a", light: "#ffffff" } }).then(setSrc, () => setSrc(null));
  }, [value]);
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} width={112} height={112} className="size-28 shrink-0 rounded-lg border bg-white" />
  ) : (
    <div className="size-28 shrink-0 animate-pulse rounded-lg bg-secondary" />
  );
}
