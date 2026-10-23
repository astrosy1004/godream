import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AddTaskForm } from "@/components/AddTaskForm";
import { NoStudent } from "@/components/NoStudent";
import { TaskRow } from "@/components/TaskRow";
import { getViewContext } from "@/lib/auth";
import { fmtMD, fmtMinutes, todayISO, weekDates } from "@/lib/dates";
import { fetchTasks } from "@/lib/queries";

export const metadata: Metadata = { title: "학습 계획" };

export default async function PlanPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { student, readOnly } = ctx;
  const header = (
    <header className="ph">
      <h1><span>학습 계획</span></h1>
      <p>주간 계획을 세우고, 끝낸 일을 체크하세요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const w = Math.max(-8, Math.min(8, Number.parseInt((await searchParams).w ?? "0", 10) || 0));
  const today = todayISO();
  const days = weekDates(today, w);
  const tasks = await fetchTasks(student.id, days[0], days[6]);
  const done = tasks.filter((t) => t.done_at);
  const mins = tasks.reduce((a, t) => a + t.minutes, 0);
  const doneMins = done.reduce((a, t) => a + t.minutes, 0);

  return (
    <>
      {header}
      <div className="card">
        <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div className="row" style={{ alignItems: "center" }}>
            <Link className="btn quiet s" href={`/plan?w=${w - 1}`} aria-label="이전 주">‹</Link>
            <b>{fmtMD(days[0])} – {fmtMD(days[6])}</b>
            <Link className="btn quiet s" href={`/plan?w=${w + 1}`} aria-label="다음 주">›</Link>
            {w !== 0 && <Link className="btn quiet s" href="/plan">이번 주</Link>}
          </div>
          <span className="sm muted">완료 {done.length}/{tasks.length}개 · {fmtMinutes(doneMins)} / {fmtMinutes(mins)}</span>
        </div>
        <div className="bar" style={{ marginTop: 10 }}>
          <i style={{ width: `${tasks.length ? Math.round((done.length / tasks.length) * 100) : 0}%` }} />
        </div>
      </div>
      <div className="days">
        {days.map((d) => {
          const ts = tasks.filter((t) => t.task_date === d);
          return (
            <div key={d} className={"day" + (d === today ? " today" : "")}>
              <h3><span>{fmtMD(d)}</span>{d === today && <span className="bd">오늘</span>}</h3>
              {ts.length ? ts.map((t) => <TaskRow key={t.id} task={t} readOnly={readOnly} />) : <p className="sm muted">비어 있어요</p>}
            </div>
          );
        })}
      </div>
      {!readOnly && <AddTaskForm days={days} today={today} />}
    </>
  );
}
