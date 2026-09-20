// Pay rules (in pence, to avoid float rounding across £0.25 rate steps):
// - Training day: flat £50, regardless of drops.
// - Otherwise: £120/day base for up to 120 drops.
// - Above 120 drops, pay increases per stop in bands of 10: £1.00/stop for
//   drops 121-130, £1.25/stop for 131-140, £1.50/stop for 141-150, and so on
//   (the per-stop rate rises by £0.25 for each additional band of 10).
const BASE_PENCE = 12_000;
const TRAINING_PENCE = 5_000;
const BASE_DROPS = 120;
const BAND_SIZE = 10;
const BAND_START_RATE_PENCE = 100;
const BAND_RATE_STEP_PENCE = 25;

export interface PayslipEntry {
  id: string;
  date: string;
  route: string;
  drops: number;
  isTraining: boolean;
}

export function calculateDayPayPence(drops: number, isTraining: boolean): number {
  if (isTraining) return TRAINING_PENCE;
  if (drops <= BASE_DROPS) return BASE_PENCE;

  let extraPence = 0;
  let remaining = drops - BASE_DROPS;
  let ratePence = BAND_START_RATE_PENCE;
  while (remaining > 0) {
    const bandDrops = Math.min(remaining, BAND_SIZE);
    extraPence += bandDrops * ratePence;
    remaining -= bandDrops;
    ratePence += BAND_RATE_STEP_PENCE;
  }
  return BASE_PENCE + extraPence;
}

export function calculateDayPay(drops: number, isTraining: boolean): number {
  return calculateDayPayPence(drops, isTraining) / 100;
}

export function calculatePeriodTotalPence(entries: Pick<PayslipEntry, "drops" | "isTraining">[]): number {
  return entries.reduce((sum, entry) => sum + calculateDayPayPence(entry.drops, entry.isTraining), 0);
}

export function calculatePeriodTotal(entries: Pick<PayslipEntry, "drops" | "isTraining">[]): number {
  return calculatePeriodTotalPence(entries) / 100;
}

export function formatGBP(amountInPounds: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(amountInPounds);
}
