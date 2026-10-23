import { describe, expect, it } from "vitest";
import { addDays, diffDays } from "./dates";
import { clampDate, defaultSteps, parseAiSteps, parsePerf, progress, urgency } from "./perf";

const get = (o: Record<string, string>) => (k: string) => o[k] ?? "";
const ok = { subject: "과학", title: "실험 보고서", kind: "보고서", due_on: "2026-11-05", points: "20", notes: "", mode: "basic" };

describe("parsePerf", () => {
  it("정상 입력", () => expect(parsePerf(get(ok))).toMatchObject({ value: { kind: "보고서", points: 20, mode: "basic" } }));
  it("ai 모드", () => expect(parsePerf(get({ ...ok, mode: "ai" }))).toMatchObject({ value: { mode: "ai" } }));
  it("검사", () => {
    expect(parsePerf(get({ ...ok, subject: "체육" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, title: "" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, kind: "토론" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, due_on: "" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, points: "0" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, points: "101" }))).toHaveProperty("error");
    expect(parsePerf(get({ ...ok, notes: "가".repeat(501) }))).toHaveProperty("error");
  });
});

describe("defaultSteps", () => {
  it("마감일까지 균등 분배, 마지막은 마감일", () => {
    const s = defaultSteps("발표", "2026-10-23", "2026-11-02", addDays, diffDays); // 10일, 5단계
    expect(s.map((x) => x.by_on)).toEqual(["2026-10-25", "2026-10-27", "2026-10-29", "2026-10-31", "2026-11-02"]);
    expect(s[0].title).toBe("주제·목표 정하기");
  });
  it("마감이 오늘이면 모든 단계가 오늘(마감일을 넘지 않는다)", () => {
    const s = defaultSteps("실기", "2026-10-23", "2026-10-23", addDays, diffDays);
    expect(s.every((x) => x.by_on === "2026-10-23")).toBe(true);
  });
});

describe("clampDate / parseAiSteps", () => {
  it("범위 밖 날짜를 맞춘다", () => {
    expect(clampDate("2026-10-01", "2026-10-23", "2026-11-05")).toBe("2026-10-23");
    expect(clampDate("2026-12-01", "2026-10-23", "2026-11-05")).toBe("2026-11-05");
    expect(clampDate("내일", "2026-10-23", "2026-11-05")).toBe("2026-11-05");
  });
  it("정리해서 날짜순으로", () => {
    const s = parseAiSteps({ steps: [{ title: "c", by: "2026-11-04" }, { title: "a", by: "2026-10-25" }, { title: "b", by: "2026-10-30" }, { title: "", by: "2026-10-30" }] }, "2026-10-23", "2026-11-05");
    expect(s?.map((x) => x.title)).toEqual(["a", "b", "c"]);
  });
  it("3개 미만이면 null", () => {
    expect(parseAiSteps({ steps: [{ title: "a", by: "2026-10-25" }] }, "2026-10-23", "2026-11-05")).toBeNull();
    expect(parseAiSteps(null, "2026-10-23", "2026-11-05")).toBeNull();
  });
});

describe("progress / urgency", () => {
  it("진행률", () => {
    expect(progress([])).toBe(0);
    expect(progress([{ done_at: "x" }, { done_at: null }])).toBe(50);
  });
  it("긴급도", () => {
    expect(urgency(2, 100)).toBe("done");
    expect(urgency(-1, 50)).toBe("overdue");
    expect(urgency(3, 50)).toBe("soon");
    expect(urgency(4, 50)).toBe("ok");
    expect(urgency(0, 0)).toBe("soon");
  });
});
