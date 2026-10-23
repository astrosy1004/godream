import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cycleUnit, deletePrepExam, deleteUnit } from "@/app/prep-actions";
import { NoStudent } from "@/components/NoStudent";
import { AddUnitsForm, PrepExamForm } from "@/components/PrepForms";
import { getViewContext } from "@/lib/auth";
import { addDays, ddayLabel, diffDays, fmtMD, todayISO } from "@/lib/dates";
import { STAGE_LABEL, readiness, roadmap } from "@/lib/prep";
import { fetchExamScopes, fetchPrepExams } from "@/lib/queries";
import { SUBJECTS, subjectColor } from "@/lib/subjects";
import type { PrepExam } from "@/lib/types";

export const metadata: Metadata = { title: "시험 대비" };

export default async function ExamPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>시험 대비</span></h1>
      <p>시험 날짜에서 거꾸로 계산한 단계별 로드맵이에요. 단원 칸을 누르면 개념 → 문제풀이 → 오답복습 순서로 진행도가 올라가요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const isStudent = me.role === "student";
  const today = todayISO();
  const [exams, scopes] = await Promise.all([fetchPrepExams(student.id), isStudent ? fetchExamScopes(student.id) : Promise.resolve([])]);
  const upcoming = exams.filter((e) => diffDays(e.exam_on, today) >= 0);
  const past = exams.filter((e) => diffDays(e.exam_on, today) < 0);
  const next = upcoming[0];

  // 지금 가장 먼저 해야 할 단원: 진행도가 낮은 순
  const urgent = next
    ? next.units.filter((u) => u.stage < 3).sort((a, b) => a.stage - b.stage).slice(0, 3)
    : [];

  const examCard = (e: PrepExam) => {
    const pct = readiness(e.units);
    const left = diffDays(e.exam_on, today);
    const subjects = SUBJECTS.filter((s) => e.units.some((u) => u.subject === s.name));
    return (
      <article key={e.id} className="card">
        <h2 style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
          <span>
            {e.name} <span className={"bd" + (left >= 0 && left <= 7 ? " red" : "")}>{ddayLabel(e.exam_on, today)}</span>{" "}
            <span className="sm muted mono">{fmtMD(e.exam_on)}</span>
          </span>
          <span className="sm muted">준비도 {pct}%</span>
        </h2>
        <div className="bar" style={{ marginBottom: 10 }}><i style={{ width: `${pct}%` }} /></div>
        <div className="grid">
          {subjects.map((s) => {
            const us = e.units.filter((u) => u.subject === s.name);
            return (
              <div key={s.name} className="q">
                <b><i className="sw" style={{ ["--c" as string]: subjectColor(s.name) }} /> {s.name} <span className="sm muted">{readiness(us)}%</span></b>
                {us.map((u) => (
                  <div key={u.id} className="unit">
                    <form action={cycleUnit.bind(null, u.id)}>
                      <button
                        className="steps"
                        style={{ border: 0, background: "transparent", padding: 2 }}
                        disabled={!isStudent}
                        aria-label={`${u.title} 진행도 ${u.stage}/3, ${STAGE_LABEL[u.stage]} (누르면 변경)`}
                      >
                        {[1, 2, 3].map((k) => <i key={k} className={u.stage >= k ? "on" : ""} />)}
                      </button>
                    </form>
                    <span className="sm">{u.title}</span>
                    <span className="sm muted">{STAGE_LABEL[u.stage]}</span>
                    {isStudent && (
                      <form action={deleteUnit.bind(null, u.id)} style={{ marginLeft: "auto" }}>
                        <button className="x" aria-label={`${u.title} 단원 삭제`}>×</button>
                      </form>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
          {e.units.length === 0 && <p className="sm muted">단원이 없어요.</p>}
        </div>
        {isStudent && (
          <div className="stack" style={{ marginTop: 8 }}>
            <AddUnitsForm examId={e.id} />
            <form action={deletePrepExam.bind(null, e.id)}><button className="btn quiet s">시험 삭제</button></form>
          </div>
        )}
      </article>
    );
  };

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 시험 준비 현황이에요. 읽기만 할 수 있어요.</p>}

      {next && (
        <div className="card">
          <h2>
            {next.name} 준비 로드맵 <span className="bd">{ddayLabel(next.exam_on, today)} · {fmtMD(next.exam_on)}</span>
          </h2>
          <ol className="tl" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {roadmap(next.exam_on, today, addDays).map((m) => (
              <li key={m.d} className={m.past ? "past" : ""} style={m.current ? { fontWeight: 700 } : undefined}>
                <b>D-{m.d}</b>
                <span>
                  {m.label} <span className="sm mono muted">{fmtMD(m.date)}{m.past && !m.current ? " · 지난 단계" : ""}</span>
                  {m.current && <span className="bd" style={{ marginLeft: 6 }}>지금 단계</span>}
                </span>
              </li>
            ))}
          </ol>
          {urgent.length > 0 && (
            <p className="sm" style={{ margin: "10px 0 0" }}>
              <b>지금 먼저 볼 단원</b> — {urgent.map((u) => `${u.subject} ${u.title}(${STAGE_LABEL[u.stage]})`).join(", ")}
            </p>
          )}
        </div>
      )}

      {upcoming.map(examCard)}
      {exams.length === 0 && <div className="card soon-card"><p className="muted">아직 등록한 시험이 없어요.</p></div>}
      {past.length > 0 && (
        <details>
          <summary className="sm">지난 시험 {past.length}개</summary>
          <div className="stack" style={{ marginTop: 10 }}>{past.map(examCard)}</div>
        </details>
      )}

      {isStudent && (
        <PrepExamForm
          defaultDate={addDays(today, 30)}
          scopes={scopes
            .filter((s) => !s.exam_on || s.exam_on >= today)
            .map((s) => ({ id: s.id, label: `${s.subject} · ${s.title}${s.exam_on ? ` (${fmtMD(s.exam_on)})` : ""}` }))}
        />
      )}
    </>
  );
}
