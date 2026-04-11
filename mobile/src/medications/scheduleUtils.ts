import type { ScheduleItem } from "@/src/medications/types";

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** Postgres `time` string */
export function scheduleItemToTimeOfDay(s: ScheduleItem): string {
  return `${pad2(s.hours)}:${pad2(s.minutes)}:00`;
}

export function parseTimeOfDay(t: string): { hours: number; minutes: number } {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return { hours: h || 0, minutes: m || 0 };
}
