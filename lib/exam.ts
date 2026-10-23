import { isSubject } from "./subjects";

export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface ExamInput {
  subject: string;
  title: string;
  exam_on: string | null;
  scope_text: string;
}

export function parseExam(get: (k: string) => string, photoCount: number): { value: ExamInput } | { error: string } {
  const subject = get("subject").trim();
  const title = get("title").trim();
  const examOn = get("exam_on").trim();
  const scope = get("scope_text").trim();
  if (!isSubject(subject)) return { error: "과목을 선택해 주세요." };
  if (!title || title.length > 60) return { error: "시험 이름을 1~60자로 입력해 주세요. (예: 2학기 중간고사)" };
  if (examOn && (!DATE_RE.test(examOn) || Number.isNaN(Date.parse(examOn)))) return { error: "시험 날짜를 다시 선택해 주세요." };
  if (scope.length > 2000) return { error: "시험 범위는 2000자 이내로 써 주세요." };
  if (photoCount === 0 && !scope) return { error: "시험 범위 사진을 올리거나 범위를 글로 적어 주세요." };
  return { value: { subject, title, exam_on: examOn || null, scope_text: scope } };
}

/* ---------- AI 암기 가이드 ---------- */

export interface ExamUnit {
  name: string;
  importance: "상" | "중" | "하";
  key_terms: string[];
  methods: { method: string; how: string }[];
  check_questions: { q: string; a: string }[];
}

export interface ExamPlan {
  summary: string;
  units: ExamUnit[];
  tips: string[];
}

const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);

export function parseExamPlan(raw: unknown): ExamPlan | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const units: ExamUnit[] = arr(o.units)
    .slice(0, 12)
    .map((u): ExamUnit | null => {
      if (!u || typeof u !== "object") return null;
      const r = u as Record<string, unknown>;
      const name = str(r.name, 80);
      if (!name) return null;
      const imp = str(r.importance, 2);
      return {
        name,
        importance: imp === "상" || imp === "하" ? imp : "중",
        key_terms: arr(r.key_terms).map((s) => str(s, 60)).filter(Boolean).slice(0, 8),
        methods: arr(r.methods)
          .map((m) => {
            const x = (m ?? {}) as Record<string, unknown>;
            return { method: str(x.method, 40), how: str(x.how, 300) };
          })
          .filter((m) => m.method && m.how)
          .slice(0, 3),
        check_questions: arr(r.check_questions)
          .map((m) => {
            const x = (m ?? {}) as Record<string, unknown>;
            return { q: str(x.q, 200), a: str(x.a, 200) };
          })
          .filter((m) => m.q)
          .slice(0, 3),
      };
    })
    .filter((u): u is ExamUnit => u !== null);
  if (units.length === 0) return null;
  return {
    summary: str(o.summary, 400),
    units,
    tips: arr(o.tips).map((s) => str(s, 200)).filter(Boolean).slice(0, 5),
  };
}

/* ---------- 학습 계획으로 보낼 복습 일정 ---------- */

export interface PlannedTask {
  date: string;
  title: string;
  minutes: number;
}

const WEIGHT = { 상: 0, 중: 1, 하: 2 } as const;

/**
 * 오늘부터 시험 전날까지 단원을 나눠 복습 일정을 만든다. 중요한 단원이 먼저,
 * 시험 직전 이틀(기간이 4일 이상일 때)은 전체 복습. 시험일이 없으면 7일 계획.
 */
export function buildReviewPlan(
  units: Pick<ExamUnit, "name" | "importance">[],
  today: string,
  examOn: string | null,
  addDays: (d: string, n: number) => string,
  diffDays: (a: string, b: string) => number,
): PlannedTask[] {
  if (units.length === 0) return [];
  const span = examOn ? diffDays(examOn, today) - 1 : 7; // 내일 ~ 시험 전날
  if (examOn && diffDays(examOn, today) < 0) return [];
  const n = Math.max(1, Math.min(span, 30));
  const start = span >= 1 ? 1 : 0; // 시험이 오늘·내일이면 오늘 하루에 몰아서
  const final = n >= 4 ? 2 : 0;
  const body = n - final;
  const sorted = [...units].sort((a, b) => WEIGHT[a.importance] - WEIGHT[b.importance]);
  const tasks: PlannedTask[] = sorted.map((u, i) => ({
    date: addDays(today, start + Math.floor((i * body) / sorted.length)),
    title: `[암기] ${u.name} 복습`,
    minutes: u.importance === "상" ? 40 : 30,
  }));
  for (let k = 0; k < final; k++) {
    tasks.push({
      date: addDays(today, start + body + k),
      title: k === final - 1 ? "[암기] 전체 복습 + 확인 문제" : "[암기] 중요 단원 다시 보기",
      minutes: 45,
    });
  }
  return tasks.slice(0, 40);
}
