/** 저녁 9시 알림 규칙. 팝업(브라우저)과 푸시(서버)가 같은 규칙을 쓴다. */
export const NIGHTLY_HOUR = 21;

export interface DayStatus {
  /** 오늘 날짜로 잡힌 계획 수 */
  tasksTotal: number;
  /** 아직 끝내지 않은 계획의 제목 */
  leftTitles: string[];
  /** 오늘 공부 기록 수 */
  sessions: number;
  /** 오늘 쓴 수업 노트 수 */
  notes: number;
  /** 마감이 3일 안인데 끝나지 않은 수행평가 (예: "과학 보고서 · D-2") */
  perf?: string[];
}

export type Nightly =
  | { kind: "empty"; title: string; body: string }
  | { kind: "todo"; title: string; body: string; titles: string[] }
  | null;

/** 오늘 아무것도 입력하지 않았으면 경고(empty), 남은 할 일이 있으면 할 일(todo), 다 했으면 null */
export function buildNightly(s: DayStatus): Nightly {
  if (s.tasksTotal === 0 && s.sessions === 0 && s.notes === 0) {
    return {
      kind: "empty",
      title: "⚠ 오늘 입력된 기록이 없어요",
      body: "계획, 공부 시간, 수업 노트 중 하나라도 남겨 두면 내일 이어서 하기 쉬워요.",
    };
  }
  const perf = (s.perf ?? []).map((p) => `수행평가 ${p}`);
  const items = [...s.leftTitles, ...perf];
  if (items.length > 0) {
    const n = items.length;
    const head = items.slice(0, 3).join(", ");
    return {
      kind: "todo",
      title: perf.length > 0 && s.leftTitles.length === 0 ? `마감이 다가오는 수행평가 ${perf.length}개` : `오늘 남은 할 일 ${n}개`,
      body: n > 3 ? `${head} 외 ${n - 3}개` : head,
      titles: items,
    };
  }
  return null;
}

const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Seoul", hour: "2-digit", hour12: false });

/** 한국 시간으로 지금 몇 시인지 (0~23) */
export function kstHour(now: Date = new Date()): number {
  return Number(hourFmt.format(now)) % 24;
}

/** 한국 시간 저녁 9시 이후인가 */
export function isNightlyTime(now: Date = new Date()): boolean {
  return kstHour(now) >= NIGHTLY_HOUR;
}
