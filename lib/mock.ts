import { isSubject } from "./subjects";

export const COUNTS = [5, 10, 15] as const;

export interface MockQuestion {
  type: "mc" | "short";
  question: string;
  /** 객관식 보기 4개 (단답형은 빈 배열) */
  choices: string[];
  /** 객관식 정답 번호 0~3 (단답형은 -1) */
  answer_index: number;
  /** 단답형으로 인정하는 답 (객관식은 빈 배열) */
  accepted: string[];
  explanation: string;
  unit: string;
}

export interface MockInput {
  subject: string;
  count: number;
  scope_id: string;
  scope_text: string;
  include_wrong: boolean;
}

export function parseMockInput(get: (k: string) => string): { value: MockInput } | { error: string } {
  const subject = get("subject").trim();
  const count = Number(get("count"));
  const scope_id = get("scope_id").trim();
  const scope_text = get("scope_text").trim();
  const include_wrong = get("include_wrong") === "on";
  if (!isSubject(subject)) return { error: "과목을 선택해 주세요." };
  if (!(COUNTS as readonly number[]).includes(count)) return { error: "문제 수를 선택해 주세요." };
  if (scope_text.length > 500) return { error: "시험 범위는 500자 이내로 써 주세요." };
  if (scope_id && !/^[0-9a-fA-F-]{36}$/.test(scope_id)) return { error: "시험 범위를 다시 선택해 주세요." };
  if (!scope_id && !scope_text && !include_wrong) return { error: "시험 범위를 고르거나 적고, 또는 ‘내 오답 반영’을 켜 주세요." };
  return { value: { subject, count, scope_id, scope_text, include_wrong } };
}

const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");

/** 제자리 섞기(Fisher–Yates). rng 는 테스트에서 고정할 수 있다. */
function shuffle<T>(a: T[], rng: () => number): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** 모델이 준 문제를 믿지 않고 검사한다. 잘못된 문제는 버리고, 객관식 보기는 섞어 정답 위치가 치우치지 않게 한다. */
export function parseMockQuestions(raw: unknown, max: number, rng: () => number = Math.random): MockQuestion[] {
  const list = raw && typeof raw === "object" ? (raw as { questions?: unknown }).questions : null;
  if (!Array.isArray(list)) return [];
  const out: MockQuestion[] = [];
  for (const item of list) {
    if (out.length >= max) break;
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const question = str(r.question, 600);
    if (!question) continue;
    const base = { question, explanation: str(r.explanation, 500), unit: str(r.unit, 60) };
    if (r.type === "mc") {
      const choices = Array.isArray(r.choices) ? r.choices.map((c) => str(c, 200)) : [];
      const idx = Number(r.answer_index);
      if (choices.length !== 4 || choices.some((c) => !c) || new Set(choices).size !== 4) continue;
      if (!Number.isInteger(idx) || idx < 0 || idx > 3) continue;
      const order = shuffle([0, 1, 2, 3], rng);
      out.push({ ...base, type: "mc", choices: order.map((i) => choices[i]), answer_index: order.indexOf(idx), accepted: [] });
    } else if (r.type === "short") {
      const accepted = (Array.isArray(r.accepted) ? r.accepted : []).map((a) => str(a, 100)).filter(Boolean).slice(0, 5);
      if (accepted.length === 0) continue;
      out.push({ ...base, type: "short", choices: [], answer_index: -1, accepted });
    }
  }
  return out;
}

/** 단답형 비교용: 공백·문장부호를 없애고 소문자로 */
export function normalizeAnswer(s: string): string {
  return s.normalize("NFC").toLowerCase().replace(/[\s.,!?'"“”‘’·\-()[\]{}~:;]/g, "");
}

export interface GradeResult {
  correct: boolean;
  given: string;
  expected: string;
}

/** answers[i]: 객관식은 고른 번호('0'~'3'), 단답형은 쓴 글. 비워 두면 오답. */
export function gradeMock(questions: MockQuestion[], answers: (string | null)[]): { results: GradeResult[]; score: number } {
  const results = questions.map((q, i): GradeResult => {
    const a = (answers[i] ?? "").trim();
    if (q.type === "mc") {
      const idx = /^[0-3]$/.test(a) ? Number(a) : -1;
      return { correct: idx === q.answer_index, given: idx >= 0 ? q.choices[idx] : "", expected: q.choices[q.answer_index] };
    }
    const n = normalizeAnswer(a);
    return { correct: n !== "" && q.accepted.some((x) => normalizeAnswer(x) === n), given: a, expected: q.accepted[0] };
  });
  return { results, score: results.filter((r) => r.correct).length };
}

/** 주별 평균 정답률. weeks 개 주(이번 주 포함)를 오래된 순으로. */
export function weeklyTrend(
  tests: { taken_on: string; score: number; total: number }[],
  today: string,
  weeks: number,
  weekStart: (d: string) => string,
  addDays: (d: string, n: number) => string,
): { week: string; pct: number | null; count: number }[] {
  const thisWeek = weekStart(today);
  const out: { week: string; pct: number | null; count: number }[] = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const w = addDays(thisWeek, -7 * i);
    const inWeek = tests.filter((t) => weekStart(t.taken_on) === w);
    const total = inWeek.reduce((a, t) => a + t.total, 0);
    const score = inWeek.reduce((a, t) => a + t.score, 0);
    out.push({ week: w, pct: total ? Math.round((score / total) * 100) : null, count: inWeek.length });
  }
  return out;
}
