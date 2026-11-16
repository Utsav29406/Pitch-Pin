import type { CourtInfo } from "./types";

export function priceForHour(court: Pick<CourtInfo, "basePrice" | "peakPrice" | "peakFromHour">, hour: number) {
  return hour >= court.peakFromHour ? court.peakPrice : court.basePrice;
}

export function priceForRange(
  court: Pick<CourtInfo, "basePrice" | "peakPrice" | "peakFromHour">,
  startHour: number,
  endHour: number,
) {
  let total = 0;
  for (let h = startHour; h < endHour; h++) total += priceForHour(court, h);
  return total;
}

/**
 * Split `total` paise into `n` shares that add up exactly. Shares are rounded
 * to whole rupees; the first share (the organiser) absorbs the remainder.
 */
export function splitAmount(total: number, n: number) {
  const each = Math.floor(total / n / 100) * 100;
  const shares = Array.from({ length: n }, () => each);
  shares[0] += total - each * n;
  return shares;
}
