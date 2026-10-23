import { describe, expect, it } from "vitest";
import { addDays, weekStart } from "./dates";
import { gradeMock, normalizeAnswer, parseMockInput, parseMockQuestions, weeklyTrend, type MockQuestion } from "./mock";

const get = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const ok = { subject: "과학", count: "10", scope_id: "", scope_text: "힘과 운동", include_wrong: "" };

describe("parseMockInput", () => {
  it("정상 입력", () => expect(parseMockInput(get(ok))).toHaveProperty("value"));
  it("범위가 하나도 없으면 거절, 오답 반영만으로는 허용", () => {
    expect(parseMockInput(get({ ...ok, scope_text: "" }))).toHaveProperty("error");
    expect(parseMockInput(get({ ...ok, scope_text: "", include_wrong: "on" }))).toHaveProperty("value");
  });
  it("과목·문제 수 검사", () => {
    expect(parseMockInput(get({ ...ok, subject: "체육" }))).toHaveProperty("error");
    expect(parseMockInput(get({ ...ok, count: "7" }))).toHaveProperty("error");
  });
});

const mc = { type: "mc", question: "Q1", choices: ["a", "b", "c", "d"], answer_index: 2, explanation: "e", unit: "u" };
const short = { type: "short", question: "Q2", accepted: ["뉴턴", "Newton"], explanation: "e", unit: "u" };

describe("parseMockQuestions", () => {
  it("보기를 섞어도 정답 보기는 그대로", () => {
    for (const seed of [0, 0.3, 0.7, 0.99]) {
      const [q] = parseMockQuestions({ questions: [mc] }, 10, () => seed);
      expect(q.choices[q.answer_index]).toBe("c");
      expect([...q.choices].sort()).toEqual(["a", "b", "c", "d"]);
    }
  });
  it("잘못된 문제는 버린다", () => {
    const bad = [
      { ...mc, choices: ["a", "b", "c"] },
      { ...mc, choices: ["a", "a", "b", "c"] },
      { ...mc, answer_index: 4 },
      { ...short, accepted: [] },
      { type: "essay", question: "x" },
      { ...mc, question: "" },
      null,
    ];
    expect(parseMockQuestions({ questions: [...bad, mc, short] }, 10)).toHaveLength(2);
  });
  it("최대 개수를 지킨다", () => {
    expect(parseMockQuestions({ questions: [mc, mc, mc] }, 2)).toHaveLength(2);
  });
  it("모양이 틀리면 빈 배열", () => {
    expect(parseMockQuestions(null, 5)).toEqual([]);
    expect(parseMockQuestions({ questions: "x" }, 5)).toEqual([]);
  });
});

describe("gradeMock", () => {
  const qs: MockQuestion[] = [
    { type: "mc", question: "Q1", choices: ["a", "b", "c", "d"], answer_index: 1, accepted: [], explanation: "", unit: "" },
    { type: "short", question: "Q2", choices: [], answer_index: -1, accepted: ["뉴턴", "Newton"], explanation: "", unit: "" },
    { type: "mc", question: "Q3", choices: ["a", "b", "c", "d"], answer_index: 0, accepted: [], explanation: "", unit: "" },
  ];
  it("객관식·단답형을 채점한다", () => {
    const g = gradeMock(qs, ["1", " newton ", "3"]);
    expect(g.results.map((r) => r.correct)).toEqual([true, true, false]);
    expect(g.score).toBe(2);
    expect(g.results[2]).toMatchObject({ given: "d", expected: "a" });
  });
  it("비워 두거나 이상한 값은 오답", () => {
    const g = gradeMock(qs, [null, "", "9"]);
    expect(g.score).toBe(0);
    expect(g.results[0].given).toBe("");
  });
});

describe("normalizeAnswer", () => {
  it("공백·문장부호·대소문자를 무시", () => {
    expect(normalizeAnswer(" New ton. ")).toBe("newton");
    expect(normalizeAnswer("a-b, c")).toBe("abc");
  });
});

describe("weeklyTrend", () => {
  it("주별 정답률(없는 주는 null)", () => {
    const t = weeklyTrend(
      [
        { taken_on: "2026-10-21", score: 8, total: 10 }, // 이번 주(10/19~)
        { taken_on: "2026-10-22", score: 6, total: 10 },
        { taken_on: "2026-10-13", score: 5, total: 10 }, // 지난주
      ],
      "2026-10-23", 3, weekStart, addDays,
    );
    expect(t.map((x) => x.pct)).toEqual([null, 50, 70]);
    expect(t[2].count).toBe(2);
    expect(t[2].week).toBe("2026-10-19");
  });
});
