import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deleteSession, setGoal } from "@/app/study-actions";
import { NoStudent } from "@/components/NoStudent";
import { SessionForm } from "@/components/SessionForm";
import { TimerClient } from "@/components/TimerClient";
import { getViewContext } from "@/lib/auth";
import { addDays, fmtMinutes, streak, todayISO, weekDates } from "@/lib/dates";
import { fetchSessions, fetchStudyDays, fetchTimer } from "@/lib/queries";
import { SUBJECTS, subjectColor } from "@/lib/subjects";

export const metadata: Metadata = { title: "혼공 타이머" };
export const dynamic = "force-dynamic";

export default async function TimerPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { student, readOnly } = ctx;
  const header = (
    <header className="ph">
      <h1><span>혼공 타이머</span></h1>
      <p>과목을 고르고 시작하면 공부 시간이 기록돼요. 앱을 닫아도 서버 시각 기준으로 계속 세어져요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const today = todayISO();
  const wk = weekDates(today, 0);
  const [timer, sessions, days] = await Promise.all([
    fetchTimer(student.id),
    fetchSessions(student.id, wk[0], wk[6]),
    fetchStudyDays(student.id, addDays(today, -60)),
  ]);
  const todays = sessions.filter((s) => s.studied_on === today);
  const savedToday = todays.reduce((a, s) => a + s.minutes, 0);
  const bySubject = SUBJECTS.map((s) => ({ ...s, m: sessions.filter((x) => x.subject === s.name).reduce((a, x) => a + x.minutes, 0) }));
  const max = Math.max(1, ...bySubject.map((s) => s.m));

  return (
    <>
      {header}
      <div className="g2">
        <TimerClient
          subject={timer?.subject ?? "수학"}
          startedAt={timer?.started_at ?? null}
          accMs={timer?.acc_ms ?? 0}
          pomodoro={timer?.pomodoro ?? false}
          serverNow={Date.now()}
          savedToday={savedToday}
          goal={student.goal_minutes}
          readOnly={readOnly}
        />
        <div className="stack">
          <div className="card">
            <h2>오늘의 기록<span className="bd">연속 {streak(days, today)}일</span></h2>
            {todays.length ? (
              todays.map((s) => (
                <div className="todo" key={s.id}>
                  <div className="tt"><i className="sw" style={{ ["--c" as string]: subjectColor(s.subject) }} /> {s.subject} <span className="mono sm muted">{fmtMinutes(s.minutes)}</span></div>
                  {!readOnly && (
                    <form action={deleteSession.bind(null, s.id)}>
                      <button className="x" aria-label="삭제">×</button>
                    </form>
                  )}
                </div>
              ))
            ) : (
              <p className="muted">아직 기록이 없어요.</p>
            )}
          </div>
          {!readOnly && <SessionForm defaultSubject={timer?.subject ?? "수학"} />}
          {!readOnly && (
            <div className="card">
              <h2>하루 목표</h2>
              <div className="chips">
                {[120, 180, 240, 300, 360, 480].map((m) => (
                  <form key={m} action={setGoal.bind(null, m)}>
                    <button className="chip" aria-pressed={student.goal_minutes === m}>{fmtMinutes(m)}</button>
                  </form>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="card">
        <h2>이번 주 과목별 공부 시간</h2>
        <div className="stack">
          {bySubject.map((s) => (
            <div key={s.name} style={{ display: "grid", gridTemplateColumns: "64px 1fr 80px", gap: 10, alignItems: "center" }}>
              <span><i className="sw" style={{ ["--c" as string]: s.color }} /> {s.name}</span>
              <div className="bar" style={{ ["--c" as string]: s.color }}><i style={{ width: `${(s.m / max) * 100}%` }} /></div>
              <span className="mono sm" style={{ textAlign: "right" }}>{fmtMinutes(s.m)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
