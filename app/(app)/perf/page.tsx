import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deletePerf, deletePerfStep, togglePerfStep } from "@/app/perf-actions";
import { NoStudent } from "@/components/NoStudent";
import { AddStepForm, PerfForm } from "@/components/PerfForms";
import { getViewContext } from "@/lib/auth";
import { addDays, ddayLabel, diffDays, fmtMD, todayISO } from "@/lib/dates";
import { progress, urgency } from "@/lib/perf";
import { fetchPerfTasks } from "@/lib/queries";
import { subjectColor } from "@/lib/subjects";
import type { PerfTask } from "@/lib/types";

export const metadata: Metadata = { title: "수행평가" };
// AI 맞춤 단계(OpenAI 호출)는 시간이 걸릴 수 있어 서버 실행 시간을 늘린다.
export const maxDuration = 60;

export default async function PerfPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>수행평가</span></h1>
      <p>마감일에서 거꾸로 단계를 나누고, 단계별 기한까지 체크해요. 마감이 가까운 순서로 보여 줘요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const isStudent = me.role === "student";
  const today = todayISO();
  const tasks = await fetchPerfTasks(student.id);
  const isDone = (t: PerfTask) => t.steps.length > 0 && progress(t.steps) >= 100;
  const finished = tasks.filter(isDone);
  const overdue = tasks.filter((t) => !isDone(t) && diffDays(t.due_on, today) < 0);
  const active = tasks.filter((t) => !isDone(t) && diffDays(t.due_on, today) >= 0);

  const card = (t: PerfTask) => {
    const pct = progress(t.steps);
    const left = diffDays(t.due_on, today);
    const u = urgency(left, pct);
    return (
      <article key={t.id} className="card">
        <h2 style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>
            <i className="sw" style={{ ["--c" as string]: subjectColor(t.subject) }} /> {t.title}{" "}
            <span className="bd">{t.kind} · {t.points}점</span>
          </span>
          <span className={"bd" + (u === "soon" || u === "overdue" ? " red" : "")}>
            {u === "done" ? "완료 ✓" : u === "overdue" ? "마감 지남" : `마감 ${ddayLabel(t.due_on, today)}`} · {fmtMD(t.due_on)}
          </span>
        </h2>
        <div className="bar" style={{ marginBottom: 8 }}><i style={{ width: `${pct}%` }} /></div>
        {t.notes && <p className="sm muted pre" style={{ margin: "0 0 6px" }}>기준: {t.notes}</p>}
        {t.steps.map((s) => {
          const done = !!s.done_at;
          const late = !done && s.by_on < today;
          return (
            <div key={s.id} className={"todo" + (done ? " done" : "")}>
              <form action={togglePerfStep.bind(null, s.id, !done)}>
                <button className="cb" aria-pressed={done} aria-label={done ? "단계 완료 취소" : "단계 완료로 표시"} disabled={!isStudent}>
                  {done ? "✓" : ""}
                </button>
              </form>
              <div className="tt">
                {s.title}{" "}
                <span className={"sm mono " + (late ? "" : "muted")} style={late ? { color: "var(--red)" } : undefined}>
                  {fmtMD(s.by_on)}까지{late ? " · 늦었어요" : ""}
                </span>
              </div>
              {isStudent && (
                <form action={deletePerfStep.bind(null, s.id)}>
                  <button className="x" aria-label="단계 삭제">×</button>
                </form>
              )}
            </div>
          );
        })}
        {isStudent && (
          <div className="stack" style={{ marginTop: 8 }}>
            <AddStepForm taskId={t.id} defaultBy={t.due_on < today ? today : t.due_on} />
            <form action={deletePerf.bind(null, t.id)}><button className="btn quiet s">수행평가 삭제</button></form>
          </div>
        )}
      </article>
    );
  };

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 수행평가예요. 읽기만 할 수 있어요.</p>}
      {overdue.length > 0 && <div className="banner">마감이 지났는데 끝나지 않은 수행평가가 {overdue.length}개 있어요.</div>}
      {[...overdue, ...active].map(card)}
      {tasks.length === 0 && <div className="card soon-card"><p className="muted">아직 등록한 수행평가가 없어요.</p></div>}
      {finished.length > 0 && (
        <details>
          <summary className="sm">완료한 수행평가 {finished.length}개</summary>
          <div className="stack" style={{ marginTop: 10 }}>{finished.map(card)}</div>
        </details>
      )}
      {isStudent && <PerfForm defaultDue={addDays(today, 10)} />}
    </>
  );
}
