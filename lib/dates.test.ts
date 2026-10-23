import { describe, expect, it } from "vitest";
import {
  addDays, ddayLabel, diffDays, elapsedMs, fmtMD, fmtMinutes, kstDateOf, streak, todayISO, weekDates, weekStart,
} from "./dates";

describe("dates", () => {
  it("한국 시간 기준 날짜를 돌려준다", () => {
    // UTC 15:30 = KST 다음날 00:30
    expect(todayISO(new Date("2026-10-22T15:30:00Z"))).toBe("2026-10-23");
    expect(kstDateOf("2026-10-23T14:59:00Z")).toBe("2026-10-23");
    expect(kstDateOf("2026-10-23T15:00:00Z")).toBe("2026-10-24");
  });
  it("날짜 더하기와 차이", () => {
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(diffDays("2026-12-08", "2026-10-23")).toBe(46);
  });
  it("주는 월요일에 시작한다", () => {
    expect(weekStart("2026-10-23")).toBe("2026-10-19"); // 금요일
    expect(weekStart("2026-10-25")).toBe("2026-10-19"); // 일요일
    expect(weekStart("2026-10-26")).toBe("2026-10-26"); // 월요일
    expect(weekDates("2026-10-23")).toHaveLength(7);
    expect(weekDates("2026-10-23", -1)[0]).toBe("2026-10-12");
  });
  it("D-day 라벨", () => {
    expect(ddayLabel("2026-12-08", "2026-10-23")).toBe("D-46");
    expect(ddayLabel("2026-10-23", "2026-10-23")).toBe("D-DAY");
    expect(ddayLabel("2026-10-20", "2026-10-23")).toBe("D+3");
  });
  it("표시 형식", () => {
    expect(fmtMD("2026-10-23")).toBe("10.23(금)");
    expect(fmtMinutes(45)).toBe("45분");
    expect(fmtMinutes(90)).toBe("1시간 30분");
    expect(fmtMinutes(120)).toBe("2시간");
  });
  it("연속 공부일", () => {
    expect(streak(["2026-10-23", "2026-10-22", "2026-10-21", "2026-10-19"], "2026-10-23")).toBe(3);
    expect(streak(["2026-10-22", "2026-10-21"], "2026-10-23")).toBe(2); // 오늘 아직 안 했어도 이어짐
    expect(streak(["2026-10-20"], "2026-10-23")).toBe(0);
  });
  it("타이머 경과 시간", () => {
    const start = "2026-10-23T01:00:00Z";
    const now = new Date("2026-10-23T01:10:00Z").getTime();
    expect(elapsedMs(60_000, start, now)).toBe(660_000);
    expect(elapsedMs(60_000, null, now)).toBe(60_000);
  });
});
