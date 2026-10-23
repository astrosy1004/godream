import { SUBJECTS } from "@/lib/subjects";
import { dayOfWeek, fmtMD, fmtMinutes } from "@/lib/dates";
import type { StudySession } from "@/lib/types";

/** 요일별 공부 시간 누적 막대. 서버 컴포넌트(스크립트 없음). */
export function WeekBars({ days, sessions, goal, today }: { days: string[]; sessions: StudySession[]; goal: number; today: string }) {
  const rows = days.map((d) => {
    const per: Record<string, number> = {};
    SUBJECTS.forEach((s) => (per[s.name] = 0));
    sessions.filter((x) => x.studied_on === d).forEach((x) => (per[x.subject] = (per[x.subject] ?? 0) + x.minutes));
    return { d, per, sum: Object.values(per).reduce((a, b) => a + b, 0) };
  });
  const peak = Math.max(...rows.map((r) => r.sum));
  const max = Math.max(goal, peak) * 1.15;
  const label = (r: (typeof rows)[number]) =>
    `${fmtMD(r.d)} 총 ${fmtMinutes(r.sum)}` + SUBJECTS.filter((s) => r.per[s.name]).map((s) => `, ${s.name} ${fmtMinutes(r.per[s.name])}`).join("");
  return (
    <div>
      <div className="cols" role="img" aria-label={"요일별 공부 시간. " + rows.map(label).join(". ")}>
        <div className="goal" style={{ bottom: `${(goal / max) * 100}%` }}><span>목표</span></div>
        {rows.map((r) => {
          const p = (r.sum / max) * 100;
          return (
            <div className="col" key={r.d} title={label(r)}>
              {r.sum > 0 && (r.d === today || r.sum === peak) && <div className="tot" style={{ bottom: `calc(${p}% + 3px)` }}>{fmtMinutes(r.sum)}</div>}
              <div className="stackbar" style={{ height: `${p}%` }}>
                {SUBJECTS.filter((s) => r.per[s.name]).map((s) => (
                  <div className="seg" key={s.name} style={{ ["--c" as string]: s.color, flex: `${r.per[s.name]} 1 0` }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="dayl">
        {days.map((d) => (
          <span key={d} className={d === today ? "t" : ""}>{dayOfWeek(d)}</span>
        ))}
      </div>
      <div className="legend">
        {SUBJECTS.map((s) => (
          <span key={s.name}><i className="sw" style={{ ["--c" as string]: s.color }} />{s.name}</span>
        ))}
      </div>
    </div>
  );
}
