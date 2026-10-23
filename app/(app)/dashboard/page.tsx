import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NoStudent } from "@/components/NoStudent";
import { TaskRow } from "@/components/TaskRow";
import { WeekBars } from "@/components/WeekBars";
import { getViewContext } from "@/lib/auth";
import { addDays, dayOfWeek, fmtMinutes, parseISO, streak, todayISO, weekDates } from "@/lib/dates";
import { fetchSessions, fetchStudyDays, fetchTasks } from "@/lib/queries";
import { SUBJECTS } from "@/lib/subjects";

export const metadata: Metadata = { title: "대시보드" };

function Delta({ diff }: { diff: number }) {
  if (diff === 0) return <span className="dl eq">– 지난주와 같아요</span>;
  return <span className={"dl " + (diff > 0 ? "up" : "dn")}>{diff > 0 ? "▲ " : "▼ "}{fmtMinutes(Math.abs(diff))}</span>;
}

export default async function DashboardPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { student, readOnly } = ctx;
  const head = (sub: string) => (
    <header className="ph">
      <h1><span>{student ? `${student.name}${readOnly ? " 학생" : "님"}` : "대시보드"}</span></h1>
      <p>{sub}</p>
    </header>
  );
  if (!student) return <>{head("연결된 학생의 학습 현황을 볼 수 있어요.")}<NoStudent /></>;

  const today = todayISO();
  const wk = weekDates(today, 0);
  const lw = weekDates(today, -1);
  const idx = wk.indexOf(today);
  const [sessions, tasks, studyDays] = await Promise.all([
    fetchSessions(student.id, lw[0], wk[6]),
    fetchTasks(student.id, wk[0], wk[6]),
    fetchStudyDays(student.id, addDays(today, -60)),
  ]);

  const sum = (xs: { minutes: number }[]) => xs.reduce((a, b) => a + b.minutes, 0);
  const thisWeek = sessions.filter((s) => wk.includes(s.studied_on));
  const lastSame = sessions.filter((s) => lw.slice(0, idx + 1).includes(s.studied_on));
  const todayMin = sum(sessions.filter((s) => s.studied_on === today));
  const done = tasks.filter((t) => t.done_at).length;
  const rate = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const todayTasks = tasks.filter((t) => t.task_date === today);
  const d = parseISO(today);

  return (
    <>
      {head(`${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 ${dayOfWeek(today)}요일 · ${student.grade ?? ""} · 오늘 계획 ${todayTasks.length}개 중 ${todayTasks.filter((t) => t.done_at).length}개 완료`)}
      {readOnly && <div className="banner">열람 모드입니다. 학생의 기록은 읽기만 할 수 있어요.</div>}
      <section className="kpis">
        <div className="card kpi">
          <div className="l">이번 주 공부 시간</div>
          <div className="v">{fmtMinutes(sum(thisWeek))}</div>
          <Delta diff={sum(thisWeek) - sum(lastSame)} />
        </div>
        <div className="card kpi">
          <div className="l">이번 주 계획 달성률</div>
          <div className="v">{rate}<small>%</small></div>
          <div className="bar"><i style={{ width: `${rate}%` }} /></div>
          <div className="sm muted" style={{ marginTop: 4 }}>{done} / {tasks.length}개 완료</div>
        </div>
        <div className="card kpi">
          <div className="l">연속 공부일</div>
          <div className="v">{streak(studyDays, today)}<small>일</small></div>
        </div>
        <div className="card kpi">
          <div className="l">오늘 공부 / 목표</div>
          <div className="v">{fmtMinutes(todayMin)}</div>
          <div className="bar"><i style={{ width: `${Math.min(100, (todayMin / student.goal_minutes) * 100)}%` }} /></div>
          <div className="sm muted" style={{ marginTop: 4 }}>목표 {fmtMinutes(student.goal_minutes)}</div>
        </div>
      </section>
      <section className="g2">
        <div className="card">
          <h2>이번 주 공부 시간<span className="sm muted">목표 하루 {fmtMinutes(student.goal_minutes)}</span></h2>
          <WeekBars days={wk} sessions={thisWeek} goal={student.goal_minutes} today={today} />
        </div>
        <div className="card">
          <h2>과목별 이번 주</h2>
          <div className="stack">
            {SUBJECTS.map((s) => {
              const m = sum(thisWeek.filter((x) => x.subject === s.name));
              const ts = tasks.filter((t) => t.subject === s.name);
              const dn = ts.filter((t) => t.done_at).length;
              const max = Math.max(1, ...SUBJECTS.map((z) => sum(thisWeek.filter((x) => x.subject === z.name))));
              return (
                <div key={s.name} style={{ display: "grid", gridTemplateColumns: "64px 1fr 90px", gap: 10, alignItems: "center" }}>
                  <span><i className="sw" style={{ ["--c" as string]: s.color }} /> {s.name}</span>
                  <div className="bar" style={{ ["--c" as string]: s.color }}><i style={{ width: `${(m / max) * 100}%` }} /></div>
                  <span className="mono sm" style={{ textAlign: "right" }}>{fmtMinutes(m)} · {dn}/{ts.length}</span>
                </div>
              );
            })}
          </div>
          <p className="sm muted" style={{ marginTop: 10 }}>오른쪽 숫자는 공부 시간 · 완료한 계획 / 전체 계획이에요.</p>
        </div>
      </section>
      <section className="card">
        <h2>오늘 할 일</h2>
        {todayTasks.length ? todayTasks.map((t) => <TaskRow key={t.id} task={t} readOnly={readOnly} />) : <p className="muted">오늘 계획이 없어요. 학습 계획에서 추가해 보세요.</p>}
      </section>
    </>
  );
}
