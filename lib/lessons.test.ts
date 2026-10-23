import { describe, expect, it } from "vitest";
import { parseLesson } from "./lessons";

const base: Record<string, string> = {
  subject: "수학", lesson_on: "2026-10-23", title: "이차함수", summary: "꼭짓점 구하기", homework: "", next_questions: "",
};
const run = (o: Partial<Record<string, string>> = {}) => {
  const m = { ...base, ...o };
  return parseLesson((k) => m[k] ?? "");
};

describe("parseLesson", () => {
  it("올바른 입력은 값을 돌려준다", () => {
    expect(run()).toEqual({ value: expect.objectContaining({ title: "이차함수", subject: "수학" }) });
  });
  it("앞뒤 공백을 지운다", () => {
    expect(run({ title: "  제목  " })).toEqual({ value: expect.objectContaining({ title: "제목" }) });
  });
  it("과목·날짜·제목을 검사한다", () => {
    expect(run({ subject: "체육" })).toHaveProperty("error");
    expect(run({ lesson_on: "10/23" })).toHaveProperty("error");
    expect(run({ lesson_on: "2026-13-45" })).toHaveProperty("error");
    expect(run({ title: "   " })).toHaveProperty("error");
    expect(run({ title: "가".repeat(121) })).toHaveProperty("error");
  });
  it("내용이 하나도 없으면 거절한다", () => {
    expect(run({ summary: "" })).toHaveProperty("error");
    expect(run({ summary: "", homework: "p.30 풀기" })).toHaveProperty("value");
  });
  it("길이 제한을 검사한다", () => {
    expect(run({ summary: "가".repeat(4001) })).toHaveProperty("error");
    expect(run({ homework: "가".repeat(1001) })).toHaveProperty("error");
  });
});
