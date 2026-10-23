import { describe, expect, it } from "vitest";
import { nextReview, parseAnalysis, parseWrong } from "./wrong";
import { addDays } from "./dates";

const get = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const ok = { subject: "수학", reason: "mistake", question_text: "x^2=4", unit: "", my_answer: "", correct_answer: "", memo: "" };

describe("parseWrong", () => {
  it("사진이 있으면 문제 글 없이도 통과", () => {
    expect(parseWrong(get({ ...ok, question_text: "" }), true)).toHaveProperty("value");
  });
  it("사진도 글도 없으면 거절", () => {
    expect(parseWrong(get({ ...ok, question_text: "" }), false)).toHaveProperty("error");
  });
  it("과목·이유·길이 검사", () => {
    expect(parseWrong(get({ ...ok, subject: "체육" }), true)).toHaveProperty("error");
    expect(parseWrong(get({ ...ok, reason: "x" }), true)).toHaveProperty("error");
    expect(parseWrong(get({ ...ok, memo: "가".repeat(501) }), true)).toHaveProperty("error");
  });
});

describe("nextReview", () => {
  const t = "2026-10-23";
  it("모르면 처음부터 내일", () => {
    expect(nextReview(2, false, t, addDays)).toEqual({ review_count: 0, next_review_on: "2026-10-24", mastered: false });
  });
  it("맞히면 1→3→7→14일 간격", () => {
    expect(nextReview(0, true, t, addDays)).toMatchObject({ review_count: 1, next_review_on: "2026-10-26" });
    expect(nextReview(1, true, t, addDays)).toMatchObject({ review_count: 2, next_review_on: "2026-10-30" });
    expect(nextReview(2, true, t, addDays)).toMatchObject({ review_count: 3, next_review_on: "2026-11-06" });
  });
  it("네 번째에 정복", () => {
    expect(nextReview(3, true, t, addDays)).toEqual({ review_count: 4, next_review_on: null, mastered: true });
  });
});

describe("parseAnalysis", () => {
  it("정상 JSON 을 정리한다", () => {
    const a = parseAnalysis({ concept: "이차방정식", why_wrong: "부호 실수", correct_steps: ["a", "b", 3], key_points: [], review_tip: "t", practice: { question: "q", hint: "h" } });
    expect(a?.correct_steps).toEqual(["a", "b"]);
    expect(a?.practice.question).toBe("q");
  });
  it("쓸 수 없는 값은 null", () => {
    expect(parseAnalysis(null)).toBeNull();
    expect(parseAnalysis("x")).toBeNull();
    expect(parseAnalysis({ concept: "x" })).toBeNull();
  });
  it("너무 긴 글은 자른다", () => {
    expect(parseAnalysis({ why_wrong: "가".repeat(2000) })?.why_wrong.length).toBe(600);
  });
});
