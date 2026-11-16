// All calendar logic runs in India Standard Time (UTC+5:30, no DST).
const IST_OFFSET_MS = 330 * 60 * 1000;

export function rupees(paise: number) {
  return "₹" + Math.round(paise / 100).toLocaleString("en-IN");
}

export function hourLabel(h: number) {
  const hh = h % 24;
  const suffix = hh >= 12 ? "PM" : "AM";
  return `${hh % 12 || 12} ${suffix}`;
}

export function rangeLabel(start: number, end: number) {
  return `${hourLabel(start)} – ${hourLabel(end)}`;
}

/** "YYYY-MM-DD" for today in IST. */
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The next `n` IST dates as "YYYY-MM-DD", starting today. */
export function nextDays(n: number, now = new Date()) {
  const start = new Date(todayIST(now) + "T00:00:00Z");
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

/** Value for a Postgres DATE column. */
export function dateOnly(isoDate: string) {
  return new Date(isoDate + "T00:00:00Z");
}

export function isoFromDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** The real instant when `hour` starts on an IST date. */
export function slotInstant(isoDate: string, hour: number) {
  return new Date(dateOnly(isoDate).getTime() + hour * 3600_000 - IST_OFFSET_MS);
}

export function dayParts(isoDate: string, todayIso = todayIST()) {
  const d = dateOnly(isoDate);
  const diff = Math.round((d.getTime() - dateOnly(todayIso).getTime()) / 86400_000);
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short", timeZone: "UTC" });
  return {
    short: diff === 0 ? "Today" : diff === 1 ? "Tmrw" : weekday,
    day: d.getUTCDate(),
  };
}

export function longDate(isoDate: string) {
  return dateOnly(isoDate).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function mmss(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}
