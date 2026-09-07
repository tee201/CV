const DAY_MS = 86400000;

export function toDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function getMonday(dateStr?: string): Date {
  const base = dateStr ? new Date(`${dateStr}T00:00:00`) : new Date();
  const day = base.getDay(); // 0=Sun..6=Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(base.getTime() + diffToMonday * DAY_MS);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function getWeekDates(mondayDateStr: string): string[] {
  const monday = getMonday(mondayDateStr);
  return Array.from({ length: 7 }, (_, i) => toDateOnly(addDays(monday, i)));
}

export function formatWeekRange(mondayDateStr: string): string {
  const monday = getMonday(mondayDateStr);
  const sunday = addDays(monday, 6);
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function formatDayHeading(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}
