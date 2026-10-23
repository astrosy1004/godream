import { isSubject, type SubjectName } from "./subjects";

export interface StrategyContent {
  principles: string[];
  weekly: string[];
  beforeExam: { d: string; text: string }[];
  mistakes: string[];
}

/** 과목별 공부 전략 안내 (정적 콘텐츠) */
export const STRATEGY: Record<SubjectName, StrategyContent> = {
  국어: {
    principles: ["비문학은 문단마다 중심 문장에 밑줄을 긋고 한 줄로 요약해요", "문학은 화자·정서·표현법·시어의 기능 네 칸 표로 정리해요", "문법은 개념 → 예문 → 판별 문제 순서로 반복해요"],
    weekly: ["월·수: 비문학 지문 1개 (15분 타이머)", "화·목: 문학 작품 1편 정리표 채우기", "금: 문법 개념 5개 백지 복습", "주말: 틀린 지문 구조를 도식으로 다시 그리기"],
    beforeExam: [{ d: "D-14", text: "교과서 작품 전체 1회독 + 정리표" }, { d: "D-7", text: "학교 프린트·기출 문장 단위 암기" }, { d: "D-3", text: "시어 의미·표현법 백지 테스트" }],
    mistakes: ["지문 근거 없이 느낌으로 선지 고르기", "작품 감상을 설명 그대로만 암기하기", "문법 용어를 뜻 없이 외우기"],
  },
  수학: {
    principles: ["개념은 유도 과정까지 이해하고 예제를 직접 풀어요", "틀린 문제는 풀이를 덮고 다시 풀기를 3회 반복해요", "풀이 첫 줄에 주어진 조건을 먼저 정리하는 습관을 들여요"],
    weekly: ["월·목: 개념 + 유형 문제 20개", "화·금: 오답 다시 풀기 + 변형 3문제", "수: 시간을 재고 15문제 풀기", "주말: 한 주 오답을 백지에서 다시 풀기"],
    beforeExam: [{ d: "D-14", text: "교과서·익힘책 전부 풀기" }, { d: "D-7", text: "기출·학교 프린트 + 오답 2회독" }, { d: "D-3", text: "실전 시간 배분 연습 (쉬운 문제 먼저)" }],
    mistakes: ["풀이를 눈으로만 보고 안다고 착각하기", "계산 실수를 개념 부족으로 분류하기", "시간이 없는데 어려운 문제에 매달리기"],
  },
  영어: {
    principles: ["단어는 매일 짧게, 1·3·7·14일 주기로 복습해요", "본문은 소리 내어 읽고 → 해석 가리고 → 빈칸을 복원해요", "문법은 예문 3개를 직접 만들어 규칙을 확인해요"],
    weekly: ["매일: 단어 15분 + 본문 낭독 1회", "화·목: 문법 문제 + 서술형 영작", "수: 독해 1지문 + 듣기", "주말: 본문 빈칸을 백지에 쓰기"],
    beforeExam: [{ d: "D-14", text: "본문 전체 해석·구조 분석" }, { d: "D-7", text: "본문 통암기 · 변형 문제" }, { d: "D-3", text: "서술형 영작 · 문법 오류 점검" }],
    mistakes: ["해석만 하고 문장 구조를 분석하지 않기", "단어의 뜻만 외우고 철자·품사를 놓치기", "서술형에서 철자·시제 실수하기"],
  },
  과학: {
    principles: ["현상 → 원리 → 적용 문제 순서로 세 단계로 정리해요", "공식·단위·그래프를 한 장에 모아 요약해요", "실험은 목적–과정–결과–주의점 네 칸으로 정리해요"],
    weekly: ["월·수: 개념 정리 + 그림으로 설명", "화·금: 계산·그래프 문제", "목: 실험 단원 네 칸 정리", "주말: 선생님이 되어 소리 내어 설명하기"],
    beforeExam: [{ d: "D-14", text: "개념 요약 노트 완성" }, { d: "D-7", text: "교과서 그림·표를 빈칸으로 만들어 암기" }, { d: "D-3", text: "계산 문제 오답만 재풀이" }],
    mistakes: ["공식만 외우고 조건·단위를 놓치기", "그래프의 축과 단위를 확인하지 않기", "실험의 변인 통제를 설명하지 못하기"],
  },
  사회: {
    principles: ["개념을 원인 → 과정 → 결과 흐름으로 연결해요", "헷갈리는 개념은 비교표로 나눠요", "그래프·지도 자료 해석을 함께 연습해요"],
    weekly: ["월·목: 단원 흐름도 그리기", "화·금: 자료 해석 문제 5개", "수: 헷갈리는 개념 비교표 만들기", "주말: 백지에 단원 키워드 쓰기"],
    beforeExam: [{ d: "D-14", text: "교과서 정독 + 키워드 형광펜" }, { d: "D-7", text: "흐름도·비교표 완성 후 백지 복습" }, { d: "D-3", text: "틀리기 쉬운 선지 포인트 정리" }],
    mistakes: ["흐름 없이 단어만 암기하기", "비슷한 개념(수요 변화와 수요량 변화)을 구분하지 못하기", "자료의 단위와 기준 연도를 놓치기"],
  },
};

export function parseSubjectParam(s: string | undefined): SubjectName {
  return s && isSubject(s) ? s : "수학";
}

/* ---------- 내 기록 요약 ---------- */

export type ReasonCounts = Record<"concept" | "mistake" | "time" | "misread" | "etc", number>;

export interface SubjectStats {
  /** 이번 주(월~오늘) 공부 분 */
  weekMinutes: number;
  /** 최근 4주 주별 공부 분 (오래된 주 → 이번 주) */
  last4Weeks: number[];
  /** 최근 14일 계획 */
  planDone: number;
  planTotal: number;
  /** 최근 30일 오답 */
  wrongTotal: number;
  wrongByReason: ReasonCounts;
  topUnits: string[];
  /** 완료한 최근 모의 테스트 정답률(%) (최신순 최대 4개) */
  mockPcts: number[];
}

export function buildStats(
  input: {
    sessions: { studied_on: string; minutes: number }[];
    tasks: { done_at: string | null }[];
    wrongs: { reason: string; unit: string }[];
    mocks: { score: number; total: number }[];
  },
  today: string,
  weekStart: (d: string) => string,
  addDays: (d: string, n: number) => string,
): SubjectStats {
  const thisWeek = weekStart(today);
  const last4Weeks = [3, 2, 1, 0].map((i) => {
    const w = addDays(thisWeek, -7 * i);
    return input.sessions.filter((s) => weekStart(s.studied_on) === w).reduce((a, s) => a + s.minutes, 0);
  });
  const wrongByReason: ReasonCounts = { concept: 0, mistake: 0, time: 0, misread: 0, etc: 0 };
  const unitCount = new Map<string, number>();
  for (const w of input.wrongs) {
    const k = (w.reason in wrongByReason ? w.reason : "etc") as keyof ReasonCounts;
    wrongByReason[k] += 1;
    if (w.unit) unitCount.set(w.unit, (unitCount.get(w.unit) ?? 0) + 1);
  }
  const topUnits = [...unitCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([u]) => u);
  return {
    weekMinutes: last4Weeks[3],
    last4Weeks,
    planDone: input.tasks.filter((t) => t.done_at).length,
    planTotal: input.tasks.length,
    wrongTotal: input.wrongs.length,
    wrongByReason,
    topUnits,
    mockPcts: input.mocks.slice(0, 4).map((m) => Math.round((m.score / Math.max(1, m.total)) * 100)),
  };
}

const REASON_NAME: Record<keyof ReasonCounts, string> = {
  concept: "개념을 몰랐어요",
  mistake: "알았는데 실수했어요",
  time: "시간이 부족했어요",
  misread: "문제를 잘못 읽었어요",
  etc: "기타",
};

/** "개념을 몰랐어요 4개, 알았는데 실수했어요 1개" (0개는 생략) */
export function reasonText(c: ReasonCounts): string {
  return (Object.keys(REASON_NAME) as (keyof ReasonCounts)[])
    .filter((k) => c[k] > 0)
    .map((k) => `${REASON_NAME[k]} ${c[k]}개`)
    .join(", ");
}

/** AI 없이 기록만으로 주는 짧은 조언 (최대 3개) */
export function quickHints(s: SubjectStats): string[] {
  const out: string[] = [];
  if (s.last4Weeks.every((m) => m === 0)) {
    out.push("최근 4주 동안 이 과목 공부 기록이 없어요. 타이머로 하루 20분부터 시작해 보세요.");
  } else if (s.weekMinutes === 0) {
    out.push("이번 주에는 이 과목 공부 기록이 아직 없어요. 오늘 20분만 해 볼까요?");
  }
  if (s.planTotal >= 3 && s.planDone / s.planTotal < 0.5) {
    out.push("최근 2주 계획 달성률이 절반이 안 돼요. 계획을 줄여서 끝내는 경험부터 쌓아 보세요.");
  }
  if (s.wrongTotal >= 3) {
    const [top, n] = (Object.entries(s.wrongByReason) as [keyof ReasonCounts, number][]).sort((a, b) => b[1] - a[1])[0];
    if (n / s.wrongTotal >= 0.4) {
      const msg: Record<keyof ReasonCounts, string> = {
        concept: "틀린 이유 중 ‘개념을 몰랐어요’가 가장 많아요. 문제를 더 풀기 전에 개념 노트를 다시 정리해 보세요.",
        mistake: "‘알았는데 실수했어요’가 가장 많아요. 풀이를 끝낸 뒤 조건과 계산을 한 번 더 확인하는 습관이 필요해요.",
        time: "‘시간이 부족했어요’가 가장 많아요. 타이머를 켜고 시간을 정해 풀어 보세요.",
        misread: "‘문제를 잘못 읽었어요’가 가장 많아요. 풀기 전에 조건과 구하는 것에 밑줄을 그어 보세요.",
        etc: "",
      };
      if (msg[top]) out.push(msg[top]);
    }
  }
  if (s.mockPcts.length > 0 && s.mockPcts[0] < 60) {
    out.push(`최근 모의 테스트 정답률이 ${s.mockPcts[0]}%예요. 틀린 문제를 오답노트에서 복습하고 다시 풀어 보세요.`);
  }
  return out.slice(0, 3);
}

/* ---------- AI 진단 결과 ---------- */

export interface Diagnosis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  next_week: string[];
  encouragement: string;
}

const str = (x: unknown, max: number): string => (typeof x === "string" ? x.trim().slice(0, max) : "");
const strs = (x: unknown, n: number, max: number): string[] =>
  Array.isArray(x) ? x.map((s) => str(s, max)).filter(Boolean).slice(0, n) : [];

export function parseDiagnosis(raw: unknown): Diagnosis | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const d: Diagnosis = {
    summary: str(o.summary, 500),
    strengths: strs(o.strengths, 3, 200),
    weaknesses: strs(o.weaknesses, 3, 200),
    next_week: strs(o.next_week, 4, 250),
    encouragement: str(o.encouragement, 200),
  };
  if (!d.summary && d.next_week.length === 0) return null;
  return d;
}
