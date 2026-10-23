import { DATE_RE } from "./exam";
import { isSubject } from "./subjects";

/** 시험 D-일 기준 준비 단계 (시험에서 거꾸로 계산) */
export const MILESTONES = [
  { d: 28, label: "시험 범위 확정 · 개념 1회독 시작" },
  { d: 21, label: "개념 정리 노트 완성 · 유형 문제 1회" },
  { d: 14, label: "기출·학교 프린트 풀이 · 오답 분류" },
  { d: 7, label: "오답 2회독 · 주간 모의 테스트 2회" },
  { d: 3, label: "암기 총정리 · 백지 복습" },
  { d: 1, label: "컨디션 관리 · 준비물 확인" },
] as const;

export const STAGE_LABEL = ["미시작", "개념", "문제풀이", "오답복습 완료"] as const;

export const MAX_UNITS_PER_EXAM = 60;

export function nextStage(stage: number): number {
  return (Math.max(0, Math.min(3, Math.trunc(stage))) + 1) % 4;
}

/** 준비도(%) = 단원 진행도 합 / (단원 수 × 3) */
export function readiness(units: { stage: number }[]): number {
  if (units.length === 0) return 0;
  return Math.round((units.reduce((a, u) => a + u.stage, 0) / (units.length * 3)) * 100);
}

export interface Milestone {
  d: number;
  label: string;
  date: string;
  past: boolean;
  /** 지금 진행해야 하는 단계 (이미 시작된 단계 중 가장 최근) */
  current: boolean;
}

export function roadmap(
  examOn: string,
  today: string,
  addDays: (d: string, n: number) => string,
): Milestone[] {
  const list = MILESTONES.map((m) => {
    const date = addDays(examOn, -m.d);
    return { d: m.d, label: m.label, date, past: date < today, current: false };
  });
  // 시작일이 오늘 이전(또는 오늘)인 단계 중 가장 마지막이 ‘지금 단계’
  let cur = -1;
  list.forEach((m, i) => {
    if (m.date <= today) cur = i;
  });
  if (cur >= 0 && today < examOn) list[cur].current = true;
  return list;
}

export interface UnitDraft {
  subject: string;
  title: string;
}

/** “과목: 단원, 단원” 을 한 줄에 한 과목씩. 쉼표·가운뎃점·슬래시·줄바꿈으로 단원을 나눈다. */
export function parseUnitLines(text: string): { units: UnitDraft[] } | { error: string } {
  const units: UnitDraft[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^([^:：]+)[:：](.*)$/);
    if (!m) return { error: `‘${line.slice(0, 20)}’ 줄은 “수학: 이차함수, 확률” 모양으로 써 주세요.` };
    const subject = m[1].trim();
    if (!isSubject(subject)) return { error: `‘${subject.slice(0, 10)}’은(는) 과목이 아니에요. (국어·수학·영어·과학·사회)` };
    for (const t of m[2].split(/[,，·/、]/)) {
      const title = t.trim();
      if (!title) continue;
      if (title.length > 80) return { error: "단원 이름은 80자 이내로 써 주세요." };
      units.push({ subject, title });
    }
  }
  return { units };
}

/** 시험 범위·암기에서 올린 범위에서 단원 목록을 가져온다: AI 가이드의 단원이 있으면 그것, 없으면 범위 글을 나눈다. */
export function unitsFromScope(scope: {
  subject: string;
  scope_text: string;
  ai_plan: { units: { name: string }[] } | null;
}): UnitDraft[] {
  const names = scope.ai_plan?.units.map((u) => u.name) ?? scope.scope_text.split(/[,，·/、\n]/);
  const seen = new Set<string>();
  const out: UnitDraft[] = [];
  for (const n of names) {
    const title = n.trim().slice(0, 80);
    if (!title || seen.has(title)) continue;
    seen.add(title);
    out.push({ subject: scope.subject, title });
  }
  return out.slice(0, 20);
}

export function parsePrepExam(get: (k: string) => string): { value: { name: string; exam_on: string } } | { error: string } {
  const name = get("name").trim();
  const exam_on = get("exam_on").trim();
  if (!name || name.length > 60) return { error: "시험 이름을 1~60자로 입력해 주세요. (예: 1학기 중간고사)" };
  if (!DATE_RE.test(exam_on) || Number.isNaN(Date.parse(exam_on))) return { error: "시험 날짜를 선택해 주세요." };
  return { value: { name, exam_on } };
}
