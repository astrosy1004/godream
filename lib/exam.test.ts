import { describe, expect, it } from "vitest";
import { addDays, diffDays } from "./dates";
import { buildReviewPlan, parseExam, parseExamPlan } from "./exam";

const get = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const base = { subject: "과학", title: "2학기 중간고사", exam_on: "2026-11-10", scope_text: "3단원 힘과 운동" };

describe("parseExam", () => {
  it("정상 입력", () => {
    expect(parseExam(get(base), 0)).toHaveProperty("value");
  });
  it("시험 날짜는 비워도 된다", () => {
    expect(parseExam(get({ ...base, exam_on: "" }), 0)).toMatchObject({ value: { exam_on: null } });
  });
  it("사진도 범위 글도 없으면 거절", () => {
    expect(parseExam(get({ ...base, scope_text: "" }), 0)).toHaveProperty("error");
    expect(parseExam(get({ ...base, scope_text: "" }), 2)).toHaveProperty("value");
  });
  it("과목·이름·날짜 검사", () => {
    expect(parseExam(get({ ...base, subject: "체육" }), 0)).toHaveProperty("error");
    expect(parseExam(get({ ...base, title: "" }), 0)).toHaveProperty("error");
    expect(parseExam(get({ ...base, exam_on: "11/10" }), 0)).toHaveProperty("error");
  });
});

describe("parseExamPlan", () => {
  it("정리해서 돌려준다", () => {
    const p = parseExamPlan({
      summary: "s",
      units: [{ name: "힘", importance: "상", key_terms: ["속력", 3], methods: [{ method: "연상", how: "x" }, { method: "", how: "y" }], check_questions: [{ q: "q", a: "a" }] }, { name: "" }, null],
      tips: ["t"],
    });
    expect(p?.units).toHaveLength(1);
    expect(p?.units[0].key_terms).toEqual(["속력"]);
    expect(p?.units[0].methods).toHaveLength(1);
  });
  it("모르는 중요도는 중", () => {
    expect(parseExamPlan({ units: [{ name: "a", importance: "최상" }] })?.units[0].importance).toBe("중");
  });
  it("단원이 없으면 null", () => {
    expect(parseExamPlan({ units: [] })).toBeNull();
    expect(parseExamPlan(null)).toBeNull();
  });
});

describe("buildReviewPlan", () => {
  const units = [
    { name: "A", importance: "하" as const },
    { name: "B", importance: "상" as const },
    { name: "C", importance: "중" as const },
  ];
  const run = (examOn: string | null) => buildReviewPlan(units, "2026-10-23", examOn, addDays, diffDays);

  it("중요한 단원이 먼저, 시험 전날까지만", () => {
    const t = run("2026-11-10"); // 18일 뒤
    expect(t[0].title).toContain("B");
    expect(t.every((x) => x.date > "2026-10-23" && x.date < "2026-11-10")).toBe(true);
    expect(t.at(-1)?.title).toContain("전체 복습");
    expect(t.at(-1)?.date).toBe("2026-11-09");
  });
  it("시험이 내일이면 오늘 하루에 몰아서", () => {
    const t = run("2026-10-24");
    expect(new Set(t.map((x) => x.date))).toEqual(new Set(["2026-10-23"]));
  });
  it("지난 시험이면 비어 있다", () => {
    expect(run("2026-10-01")).toEqual([]);
  });
  it("시험일이 없으면 내일부터 7일 안", () => {
    const t = run(null);
    expect(t.every((x) => x.date >= "2026-10-24" && x.date <= "2026-10-30")).toBe(true);
  });
});
