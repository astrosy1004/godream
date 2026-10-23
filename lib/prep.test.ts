import { describe, expect, it } from "vitest";
import { addDays } from "./dates";
import { nextStage, parsePrepExam, parseUnitLines, readiness, roadmap, unitsFromScope } from "./prep";

describe("nextStage / readiness", () => {
  it("0→1→2→3→0 순환", () => {
    expect([0, 1, 2, 3].map(nextStage)).toEqual([1, 2, 3, 0]);
    expect(nextStage(99)).toBe(0);
  });
  it("준비도 계산", () => {
    expect(readiness([])).toBe(0);
    expect(readiness([{ stage: 3 }, { stage: 0 }])).toBe(50);
    expect(readiness([{ stage: 3 }, { stage: 3 }])).toBe(100);
    expect(readiness([{ stage: 1 }, { stage: 1 }, { stage: 1 }])).toBe(33);
  });
});

describe("roadmap", () => {
  it("시험일에서 거꾸로 날짜를 계산", () => {
    const r = roadmap("2026-11-20", "2026-10-23", addDays);
    expect(r.map((m) => m.d)).toEqual([28, 21, 14, 7, 3, 1]);
    expect(r[0].date).toBe("2026-10-23"); // D-28 = 오늘
    expect(r[5].date).toBe("2026-11-19");
  });
  it("지금 단계는 시작된 단계 중 마지막", () => {
    const r = roadmap("2026-11-20", "2026-11-05", addDays); // D-15: D-28, D-21 시작됨
    expect(r.filter((m) => m.current).map((m) => m.d)).toEqual([21]);
    expect(r[0].past && r[1].past && !r[2].past).toBe(true);
  });
  it("시작 전·시험 후엔 현재 단계 없음", () => {
    expect(roadmap("2026-12-31", "2026-10-23", addDays).some((m) => m.current)).toBe(false);
    expect(roadmap("2026-10-01", "2026-10-23", addDays).some((m) => m.current)).toBe(false);
  });
});

describe("parseUnitLines", () => {
  it("과목별로 단원을 나눈다", () => {
    const r = parseUnitLines("수학: 이차함수, 확률\n영어：7과 본문 · 관계사\n\n");
    expect(r).toEqual({ units: [
      { subject: "수학", title: "이차함수" }, { subject: "수학", title: "확률" },
      { subject: "영어", title: "7과 본문" }, { subject: "영어", title: "관계사" },
    ] });
  });
  it("모양이 틀리면 안내", () => {
    expect(parseUnitLines("이차함수")).toHaveProperty("error");
    expect(parseUnitLines("체육: 달리기")).toHaveProperty("error");
    expect(parseUnitLines("수학: " + "가".repeat(81))).toHaveProperty("error");
  });
});

describe("unitsFromScope", () => {
  it("AI 가이드 단원을 우선 사용", () => {
    expect(unitsFromScope({ subject: "과학", scope_text: "x, y", ai_plan: { units: [{ name: "힘" }, { name: "에너지" }, { name: "힘" }] } }))
      .toEqual([{ subject: "과학", title: "힘" }, { subject: "과학", title: "에너지" }]);
  });
  it("없으면 범위 글을 나눈다", () => {
    expect(unitsFromScope({ subject: "사회", scope_text: "1단원, 2단원\n3단원", ai_plan: null }).map((u) => u.title)).toEqual(["1단원", "2단원", "3단원"]);
  });
});

describe("parsePrepExam", () => {
  const get = (o: Record<string, string>) => (k: string) => o[k] ?? "";
  it("검사", () => {
    expect(parsePrepExam(get({ name: "중간고사", exam_on: "2026-11-10" }))).toHaveProperty("value");
    expect(parsePrepExam(get({ name: "", exam_on: "2026-11-10" }))).toHaveProperty("error");
    expect(parsePrepExam(get({ name: "a", exam_on: "" }))).toHaveProperty("error");
  });
});
