import { DATE_RE } from "./exam";
import { isSubject } from "./subjects";

export const KINDS = ["발표", "보고서", "서술형", "실기"] as const;
export type Kind = (typeof KINDS)[number];

/** 유형별 기본 준비 단계 */
export const DEFAULT_STEPS: Record<Kind, string[]> = {
  발표: ["주제·목표 정하기", "자료 조사", "발표 대본 작성", "슬라이드 제작", "리허설(시간 재기)"],
  보고서: ["주제 선정", "자료·실험 정리", "초안 작성", "그래프·표 점검", "퇴고 · 제출"],
  서술형: ["평가 기준 확인", "핵심 소재 메모", "초안 작성", "분량·맞춤법 점검", "제출"],
  실기: ["평가 기준 확인", "연습 계획 세우기", "반복 연습", "영상 촬영 후 점검", "실전 리허설"],
};

export const MAX_STEPS = 12;

export interface PerfInput {
  subject: string;
  title: string;
  kind: Kind;
  points: number;
  due_on: string;
  notes: string;
  mode: "basic" | "ai";
}

export function parsePerf(get: (k: string) => string): { value: PerfInput } | { error: string } {
  const subject = get("subject").trim();
  const title = get("title").trim();
  const kind = get("kind").trim();
  const due_on = get("due_on").trim();
  const points = Number(get("points") || 20);
  const notes = get("notes").trim();
  const mode = get("mode") === "ai" ? "ai" : "basic";
  if (!isSubject(subject)) return { error: "과목을 선택해 주세요." };
  if (!title || title.length > 80) return { error: "제목을 1~80자로 입력해 주세요." };
  if (!(KINDS as readonly string[]).includes(kind)) return { error: "유형을 선택해 주세요." };
  if (!DATE_RE.test(due_on) || Number.isNaN(Date.parse(due_on))) return { error: "마감일을 선택해 주세요." };
  if (!Number.isInteger(points) || points < 1 || points > 100) return { error: "배점은 1~100점으로 입력해 주세요." };
  if (notes.length > 500) return { error: "평가 기준 메모는 500자 이내로 써 주세요." };
  return { value: { subject, title, kind: kind as Kind, points, due_on, notes, mode } };
}

export interface StepDraft {
  title: string;
  by_on: string;
}

/** 오늘~마감일 사이를 단계 수만큼 균등하게 나눠 기한을 정한다. 마지막 단계는 마감일. */
export function defaultSteps(
  kind: Kind,
  today: string,
  due: string,
  addDays: (d: string, n: number) => string,
  diffDays: (a: string, b: string) => number,
): StepDraft[] {
  const titles = DEFAULT_STEPS[kind];
  const span = Math.max(1, diffDays(due, today));
  return titles.map((title, i) => {
    const by = addDays(today, Math.round((span * (i + 1)) / titles.length));
    return { title, by_on: by > due ? due : by }; // 마감이 오늘이면 모든 단계가 오늘
  });
}

/** 날짜를 [today, due] 안으로 맞춘다. 형식이 틀리면 마감일. */
export function clampDate(by: unknown, today: string, due: string): string {
  if (typeof by !== "string" || !DATE_RE.test(by)) return due;
  return by < today ? today : by > due ? due : by;
}

/** AI가 만든 단계를 검사한다. 쓸 수 있는 단계가 3개 미만이면 null. */
export function parseAiSteps(raw: unknown, today: string, due: string): StepDraft[] | null {
  const list = raw && typeof raw === "object" ? (raw as { steps?: unknown }).steps : null;
  if (!Array.isArray(list)) return null;
  const steps: StepDraft[] = [];
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const r = it as Record<string, unknown>;
    const title = typeof r.title === "string" ? r.title.trim().slice(0, 120) : "";
    if (!title) continue;
    steps.push({ title, by_on: clampDate(r.by, today, due) });
    if (steps.length >= 8) break;
  }
  if (steps.length < 3) return null;
  return steps.sort((a, b) => (a.by_on < b.by_on ? -1 : a.by_on > b.by_on ? 1 : 0));
}

export function progress(steps: { done_at: string | null }[]): number {
  if (steps.length === 0) return 0;
  return Math.round((steps.filter((s) => s.done_at).length / steps.length) * 100);
}

export type Urgency = "done" | "overdue" | "soon" | "ok";

/** 마감 3일 안(오늘 포함)인데 끝나지 않았으면 soon, 지났는데 끝나지 않았으면 overdue */
export function urgency(daysLeft: number, pct: number): Urgency {
  if (pct >= 100) return "done";
  if (daysLeft < 0) return "overdue";
  if (daysLeft <= 3) return "soon";
  return "ok";
}
