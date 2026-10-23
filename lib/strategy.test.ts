import { describe, expect, it } from "vitest";
import { addDays, weekStart } from "./dates";
import { STRATEGY, buildStats, parseDiagnosis, parseSubjectParam, quickHints, reasonText, type SubjectStats } from "./strategy";
import { SUBJECTS } from "./subjects";

describe("STRATEGY", () => {
  it("모든 과목에 내용이 있다", () => {
    for (const s of SUBJECTS) {
      const c = STRATEGY[s.name];
      expect(c.principles.length).toBeGreaterThan(0);
      expect(c.weekly.length).toBeGreaterThan(0);
      expect(c.beforeExam.length).toBe(3);
      expect(c.mistakes.length).toBeGreaterThan(0);
    }
  });
  it("과목 파라미터", () => {
    expect(parseSubjectParam("영어")).toBe("영어");
    expect(parseSubjectParam("체육")).toBe("수학");
    expect(parseSubjectParam(undefined)).toBe("수학");
  });
});

describe("buildStats", () => {
  const today = "2026-10-23"; // 금, 이번 주 월 = 10/19
  const stats = buildStats(
    {
      sessions: [
        { studied_on: "2026-10-20", minutes: 30 },
        { studied_on: "2026-10-22", minutes: 45 },
        { studied_on: "2026-10-14", minutes: 60 }, // 지난주
        { studied_on: "2026-09-30", minutes: 20 }, // 3주 전
      ],
      tasks: [{ done_at: "x" }, { done_at: null }, { done_at: "y" }],
      wrongs: [
        { reason: "concept", unit: "이차함수" }, { reason: "concept", unit: "이차함수" },
        { reason: "mistake", unit: "확률" }, { reason: "weird", unit: "" },
      ],
      mocks: [{ score: 7, total: 10 }, { score: 5, total: 10 }],
    },
    today, weekStart, addDays,
  );
  it("주별 공부 시간", () => {
    expect(stats.last4Weeks).toEqual([20, 0, 60, 75]);
    expect(stats.weekMinutes).toBe(75);
  });
  it("계획·오답·모의 요약", () => {
    expect([stats.planDone, stats.planTotal]).toEqual([2, 3]);
    expect(stats.wrongTotal).toBe(4);
    expect(stats.wrongByReason).toEqual({ concept: 2, mistake: 1, time: 0, misread: 0, etc: 1 });
    expect(stats.topUnits).toEqual(["이차함수", "확률"]);
    expect(stats.mockPcts).toEqual([70, 50]);
  });
});

describe("quickHints", () => {
  const base: SubjectStats = {
    weekMinutes: 100, last4Weeks: [60, 60, 60, 100], planDone: 5, planTotal: 5, wrongTotal: 0,
    wrongByReason: { concept: 0, mistake: 0, time: 0, misread: 0, etc: 0 }, topUnits: [], mockPcts: [],
  };
  it("문제 없으면 조언 없음", () => expect(quickHints(base)).toEqual([]));
  it("공부 기록이 없으면 시작을 권한다", () => {
    expect(quickHints({ ...base, weekMinutes: 0, last4Weeks: [0, 0, 0, 0] })[0]).toContain("4주");
    expect(quickHints({ ...base, weekMinutes: 0, last4Weeks: [30, 0, 0, 0] })[0]).toContain("이번 주");
  });
  it("달성률·오답 이유·모의 점수", () => {
    const h = quickHints({
      ...base, planDone: 1, planTotal: 4, wrongTotal: 5,
      wrongByReason: { concept: 4, mistake: 1, time: 0, misread: 0, etc: 0 }, mockPcts: [40],
    });
    expect(h).toHaveLength(3);
    expect(h[0]).toContain("달성률");
    expect(h[1]).toContain("개념");
  });
  it("오답이 3개 미만이면 이유 조언은 하지 않는다", () => {
    expect(quickHints({ ...base, wrongTotal: 2, wrongByReason: { concept: 2, mistake: 0, time: 0, misread: 0, etc: 0 } })).toEqual([]);
  });
});

describe("parseDiagnosis", () => {
  it("정리해서 돌려준다", () => {
    const d = parseDiagnosis({ summary: "s", strengths: ["a", 1], weaknesses: [], next_week: ["x", "y"], encouragement: "e" });
    expect(d?.strengths).toEqual(["a"]);
    expect(d?.next_week).toHaveLength(2);
  });
  it("쓸 수 없으면 null", () => {
    expect(parseDiagnosis(null)).toBeNull();
    expect(parseDiagnosis({ strengths: ["a"] })).toBeNull();
  });
});

describe("reasonText", () => {
  it("0개는 생략", () => {
    expect(reasonText({ concept: 4, mistake: 1, time: 0, misread: 0, etc: 0 })).toBe("개념을 몰랐어요 4개, 알았는데 실수했어요 1개");
    expect(reasonText({ concept: 0, mistake: 0, time: 0, misread: 0, etc: 0 })).toBe("");
  });
});
