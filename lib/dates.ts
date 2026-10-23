/** 날짜 유틸. 모든 날짜는 한국 시간(Asia/Seoul) 기준의 'YYYY-MM-DD' 문자열로 다룬다. */
export const TZ = "Asia/Seoul";
export const DOW = ["일", "월", "화", "수", "목", "금", "토"] as const;

const dateFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** 지금(또는 주어진 시각)의 한국 날짜 */
export function todayISO(now: Date = new Date()): string {
  return dateFmt.format(now);
}

/** timestamptz 문자열이 한국 시간으로 어느 날짜인지 */
export function kstDateOf(instant: string | Date): string {
  return dateFmt.format(typeof instant === "string" ? new Date(instant) : instant);
}

export function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(s: string, n: number): string {
  const d = parseISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

/** a - b 를 일 단위로 */
export function diffDays(a: string, b: string): number {
  return Math.round((parseISO(a).getTime() - parseISO(b).getTime()) / 86_400_000);
}

/** 그 날이 속한 주의 월요일 */
export function weekStart(s: string): string {
  const k = (parseISO(s).getUTCDay() + 6) % 7;
  return addDays(s, -k);
}

/** 오늘 기준 offset 주의 월~일 날짜 7개 */
export function weekDates(today: string, offset = 0): string[] {
  const start = addDays(weekStart(today), offset * 7);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function dayOfWeek(s: string): string {
  return DOW[parseISO(s).getUTCDay()];
}

/** 예: 10.23(금) */
export function fmtMD(s: string): string {
  const d = parseISO(s);
  return `${d.getUTCMonth() + 1}.${d.getUTCDate()}(${DOW[d.getUTCDay()]})`;
}

/** D-46, D-DAY, D+3 */
export function ddayLabel(target: string, today: string): string {
  const n = diffDays(target, today);
  if (n === 0) return "D-DAY";
  return n > 0 ? `D-${n}` : `D+${-n}`;
}

/** 90 -> '1시간 30분', 45 -> '45분' */
export function fmtMinutes(total: number): string {
  const m = Math.max(0, Math.round(total));
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}시간 ${r}분` : `${h}시간`;
}

/** 오늘(없으면 어제)부터 거꾸로 이어진 공부 날짜 수 */
export function streak(days: Iterable<string>, today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n += 1;
    d = addDays(d, -1);
  }
  return n;
}

/** 경과 시간(ms) = 누적 + 실행 중이면 (지금 - 시작 시각) */
export function elapsedMs(acc: number, startedAt: string | null, now: number = Date.now()): number {
  return acc + (startedAt ? Math.max(0, now - new Date(startedAt).getTime()) : 0);
}
