import { describe, expect, it } from "vitest";
import { buildNightly, isNightlyTime, kstHour } from "./nightly";

const day = (o: Partial<Parameters<typeof buildNightly>[0]> = {}) =>
  buildNightly({ tasksTotal: 0, leftTitles: [], sessions: 0, notes: 0, ...o });

describe("buildNightly", () => {
  it("아무것도 입력하지 않았으면 경고", () => {
    expect(day()?.kind).toBe("empty");
  });
  it("남은 할 일이 있으면 할 일 알림", () => {
    const n = day({ tasksTotal: 2, leftTitles: ["수학 20문제", "영어 단어"] });
    expect(n).toMatchObject({ kind: "todo", title: "오늘 남은 할 일 2개", body: "수학 20문제, 영어 단어" });
  });
  it("3개를 넘으면 '외 N개'로 줄인다", () => {
    const n = day({ tasksTotal: 5, leftTitles: ["a", "b", "c", "d", "e"] });
    expect(n?.body).toBe("a, b, c 외 2개");
  });
  it("기록만 있고 계획이 없어도 경고하지 않는다", () => {
    expect(day({ sessions: 1 })).toBeNull();
    expect(day({ notes: 1 })).toBeNull();
  });
  it("계획은 다 했어도 마감 임박 수행평가가 있으면 알린다", () => {
    const n = day({ tasksTotal: 1, leftTitles: [], perf: ["과학 보고서 · D-2"] });
    expect(n).toMatchObject({ kind: "todo", title: "마감이 다가오는 수행평가 1개", body: "수행평가 과학 보고서 · D-2" });
  });
  it("할 일과 수행평가를 함께 보여 준다", () => {
    const n = day({ tasksTotal: 2, leftTitles: ["수학"], perf: ["영어 발표 · D-0"] });
    expect(n).toMatchObject({ kind: "todo", title: "오늘 남은 할 일 2개", body: "수학, 수행평가 영어 발표 · D-0" });
  });
  it("수행평가만 있고 아무 기록도 없으면 입력 없음 경고가 먼저", () => {
    expect(day({ perf: ["x · D-1"] })?.kind).toBe("empty");
  });
  it("계획을 전부 끝냈으면 알리지 않는다", () => {
    expect(day({ tasksTotal: 3, leftTitles: [] })).toBeNull();
  });
});

describe("kstHour", () => {
  it("한국 시간 기준 시각", () => {
    expect(kstHour(new Date("2026-10-23T12:00:00Z"))).toBe(21);
    expect(kstHour(new Date("2026-10-23T14:59:00Z"))).toBe(23);
    expect(kstHour(new Date("2026-10-23T15:00:00Z"))).toBe(0);
  });
  it("9시 이후만 true", () => {
    expect(isNightlyTime(new Date("2026-10-23T11:59:00Z"))).toBe(false);
    expect(isNightlyTime(new Date("2026-10-23T12:00:00Z"))).toBe(true);
    expect(isNightlyTime(new Date("2026-10-23T15:00:00Z"))).toBe(false);
  });
});
