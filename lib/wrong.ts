import { isSubject } from "./subjects";

export const REASONS = [
  { id: "concept", label: "개념을 몰랐어요" },
  { id: "mistake", label: "알았는데 실수했어요" },
  { id: "time", label: "시간이 부족했어요" },
  { id: "misread", label: "문제를 잘못 읽었어요" },
  { id: "etc", label: "기타" },
] as const;
export type ReasonId = (typeof REASONS)[number]["id"];

export function reasonLabel(id: string): string {
  return REASONS.find((r) => r.id === id)?.label ?? "기타";
}

export interface WrongInput {
  subject: string;
  unit: string;
  question_text: string;
  my_answer: string;
  correct_answer: string;
  reason: ReasonId;
  memo: string;
}

/** 폼 값 검사. 사진이 없으면 문제 글이 있어야 한다. */
export function parseWrong(get: (k: string) => string, hasPhoto: boolean): { value: WrongInput } | { error: string } {
  const v = {
    subject: get("subject").trim(),
    unit: get("unit").trim(),
    question_text: get("question_text").trim(),
    my_answer: get("my_answer").trim(),
    correct_answer: get("correct_answer").trim(),
    reason: get("reason").trim(),
    memo: get("memo").trim(),
  };
  if (!isSubject(v.subject)) return { error: "과목을 선택해 주세요." };
  if (!REASONS.some((r) => r.id === v.reason)) return { error: "틀린 이유를 선택해 주세요." };
  if (v.unit.length > 60) return { error: "단원은 60자 이내로 써 주세요." };
  if (v.question_text.length > 1000) return { error: "문제 내용은 1000자 이내로 써 주세요." };
  if (v.my_answer.length > 200 || v.correct_answer.length > 200) return { error: "답은 200자 이내로 써 주세요." };
  if (v.memo.length > 500) return { error: "메모는 500자 이내로 써 주세요." };
  if (!hasPhoto && !v.question_text) return { error: "문제 사진을 올리거나 문제 내용을 적어 주세요." };
  return { value: v as WrongInput };
}

/** 간격 복습: 1 → 3 → 7 → 14일. 네 번 연속 맞히면 정복. */
export const REVIEW_STEPS = [1, 3, 7, 14] as const;

export function nextReview(
  count: number,
  got: boolean,
  today: string,
  addDays: (d: string, n: number) => string,
): { review_count: number; next_review_on: string | null; mastered: boolean } {
  if (!got) return { review_count: 0, next_review_on: addDays(today, 1), mastered: false };
  const c = count + 1;
  if (c >= REVIEW_STEPS.length) return { review_count: c, next_review_on: null, mastered: true };
  return { review_count: c, next_review_on: addDays(today, REVIEW_STEPS[c]), mastered: false };
}

/** 처음 저장할 때 첫 복습일은 내일 */
export const FIRST_REVIEW_DAYS = 1;

/* ---------- AI 분석 결과 ---------- */

export interface WrongAnalysis {
  concept: string;
  mistake_type: string;
  why_wrong: string;
  correct_steps: string[];
  key_points: string[];
  review_tip: string;
  practice: { question: string; hint: string };
}

const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const strs = (x: unknown, n: number, max: number): string[] =>
  Array.isArray(x) ? x.map((s) => str(s, max)).filter(Boolean).slice(0, n) : [];

/** 모델이 준 JSON 을 믿지 않고 모양과 길이를 정리한다. 쓸 수 없으면 null. */
export function parseAnalysis(raw: unknown): WrongAnalysis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const p = (o.practice ?? {}) as Record<string, unknown>;
  const a: WrongAnalysis = {
    concept: str(o.concept, 100),
    mistake_type: str(o.mistake_type, 60),
    why_wrong: str(o.why_wrong, 600),
    correct_steps: strs(o.correct_steps, 8, 300),
    key_points: strs(o.key_points, 5, 200),
    review_tip: str(o.review_tip, 300),
    practice: { question: str(p.question, 500), hint: str(p.hint, 300) },
  };
  if (!a.why_wrong && a.correct_steps.length === 0) return null;
  return a;
}
