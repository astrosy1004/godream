import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DiagnoseButton } from "@/components/DiagnoseButton";
import { NoStudent } from "@/components/NoStudent";
import { getViewContext } from "@/lib/auth";
import { fmtMD, fmtMinutes, kstDateOf } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { STRATEGY, parseSubjectParam, quickHints, reasonText, type Diagnosis } from "@/lib/strategy";
import { fetchSubjectStats } from "@/lib/strategy-data";
import { SUBJECTS, subjectColor } from "@/lib/subjects";

export const metadata: Metadata = { title: "과목별 전략" };
// AI 진단(OpenAI 호출)은 시간이 걸릴 수 있어 서버 실행 시간을 늘린다.
export const maxDuration = 60;

export default async function StrategyPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>과목별 전략</span></h1>
      <p>과목마다 공부 방법이 달라요. 핵심 원칙, 주간 루틴, 시험 전 일정을 확인하고 내 기록으로 진단도 받아 보세요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const subject = parseSubjectParam((await searchParams).s);
  const isStudent = me.role === "student";
  const k = STRATEGY[subject];
  const supabase = await createClient();
  const [stats, diagRow] = await Promise.all([
    fetchSubjectStats(supabase, student.id, subject),
    supabase.from("strategy_diagnoses").select("body, updated_at").eq("student_id", student.id).eq("subject", subject).maybeSingle(),
  ]);
  const hints = quickHints(stats);
  const diag = (diagRow.data?.body ?? null) as Diagnosis | null;
  const planPct = stats.planTotal ? Math.round((stats.planDone / stats.planTotal) * 100) : null;

  return (
    <>
      {header}
      <nav className="chips" aria-label="과목">
        {SUBJECTS.map((s) => (
          <Link key={s.name} className="chip" href={`/strategy?s=${encodeURIComponent(s.name)}`} aria-pressed={subject === s.name}>
            <i className="sw" style={{ ["--c" as string]: s.color }} /> {s.name}
          </Link>
        ))}
      </nav>

      <div className="card">
        <h2><i className="sw" style={{ ["--c" as string]: subjectColor(subject) }} /> {subject} 내 기록</h2>
        <div className="kpis">
          <div className="kpi"><span className="sm muted">이번 주 공부</span><b>{fmtMinutes(stats.weekMinutes)}</b></div>
          <div className="kpi"><span className="sm muted">최근 4주 합계</span><b>{fmtMinutes(stats.last4Weeks.reduce((a, b) => a + b, 0))}</b></div>
          <div className="kpi"><span className="sm muted">계획 달성(14일)</span><b>{planPct === null ? "—" : `${planPct}%`}</b></div>
          <div className="kpi"><span className="sm muted">오답(30일)</span><b>{stats.wrongTotal}개</b></div>
          <div className="kpi"><span className="sm muted">최근 모의 정답률</span><b>{stats.mockPcts.length ? `${stats.mockPcts[0]}%` : "—"}</b></div>
        </div>
        {stats.wrongTotal > 0 && <p className="sm muted" style={{ margin: "8px 0 0" }}>틀린 이유: {reasonText(stats.wrongByReason)}{stats.topUnits.length > 0 && ` · 자주 틀리는 단원: ${stats.topUnits.join(", ")}`}</p>}
        {hints.length > 0 && (
          <ul className="sm" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{hints.map((h, i) => <li key={i}>{h}</li>)}</ul>
        )}

        <div className="nb" style={{ marginTop: 12 }}>
          {diag ? (
            <>
              <b>🤖 AI 진단 <span className="sm muted">{fmtMD(kstDateOf(diagRow.data?.updated_at as string))} 기준</span></b>
              <p className="pre" style={{ margin: "4px 0" }}>{diag.summary}</p>
              {diag.strengths.length > 0 && <><b className="sm">잘하고 있어요</b><ul className="sm" style={{ margin: "2px 0 6px", paddingLeft: 18 }}>{diag.strengths.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
              {diag.weaknesses.length > 0 && <><b className="sm">보완하면 좋아요</b><ul className="sm" style={{ margin: "2px 0 6px", paddingLeft: 18 }}>{diag.weaknesses.map((t, i) => <li key={i}>{t}</li>)}</ul></>}
              {diag.next_week.length > 0 && <><b className="sm">다음 주 할 일</b><ol className="sm" style={{ margin: "2px 0 6px", paddingLeft: 20 }}>{diag.next_week.map((t, i) => <li key={i}>{t}</li>)}</ol></>}
              {diag.encouragement && <p className="sm" style={{ margin: "4px 0" }}>💪 {diag.encouragement}</p>}
              <p className="sm muted" style={{ margin: "4px 0 0" }}>AI 진단은 입력된 기록만 보고 만든 참고용이에요.</p>
            </>
          ) : (
            isStudent && <p className="sm muted" style={{ margin: 0 }}>기록을 AI가 읽고 강점·보완점·다음 주 할 일을 알려 줘요. (공부 시간·계획·오답·모의 테스트 숫자만 OpenAI로 전송돼요)</p>
          )}
          {isStudent && <div style={{ marginTop: 8 }}><DiagnoseButton subject={subject} again={!!diag} /></div>}
        </div>
      </div>

      <div className="grid">
        <div className="card"><h2>핵심 원칙</h2><ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>{k.principles.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
        <div className="card"><h2>주간 루틴</h2><ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>{k.weekly.map((x, i) => <li key={i}>• {x}</li>)}</ul></div>
        <div className="card">
          <h2>시험 전 일정</h2>
          <ol className="tl" style={{ listStyle: "none", padding: 0, margin: 0 }}>{k.beforeExam.map((x) => <li key={x.d}><b>{x.d}</b><span>{x.text}</span></li>)}</ol>
        </div>
        <div className="card">
          <h2>자주 하는 실수</h2>
          <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {k.mistakes.map((x, i) => <li key={i}><span className="stamp" style={{ fontSize: 12, marginRight: 6 }}>주의</span>{x}</li>)}
          </ul>
        </div>
      </div>
    </>
  );
}
