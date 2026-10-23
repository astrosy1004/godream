import { deleteExamScope } from "@/app/exam-actions";
import { AddPlanButton, AnalyzeExamButton } from "@/components/ExamButtons";
import { ddayLabel, diffDays } from "@/lib/dates";
import { subjectColor } from "@/lib/subjects";
import type { ExamScope } from "@/lib/types";

export function ExamCard({
  scope, urls, canEdit, today,
}: { scope: ExamScope; urls: string[]; canEdit: boolean; today: string }) {
  const plan = scope.ai_plan;
  const past = scope.exam_on ? diffDays(scope.exam_on, today) < 0 : false;
  return (
    <article className="card note">
      <div className="nh">
        <h3>
          <i className="sw" style={{ ["--c" as string]: subjectColor(scope.subject) }} />
          {scope.title}
          {scope.exam_on && <span className={"bd" + (!past && diffDays(scope.exam_on, today) <= 7 ? " red" : "")}>{ddayLabel(scope.exam_on, today)}</span>}
        </h3>
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <span className="bd">{scope.subject}</span>
          {scope.exam_on && <span className="bd mono">{scope.exam_on}</span>}
          {canEdit && (
            <form action={deleteExamScope.bind(null, scope.id)}>
              <button className="x" aria-label="시험 범위 삭제">×</button>
            </form>
          )}
        </div>
      </div>

      {urls.length > 0 && (
        <div className="row">
          {urls.map((u, i) => (
            <a key={u} href={u} target="_blank" rel="noreferrer"><img className="thumb" src={u} alt={`시험 범위 사진 ${i + 1}`} loading="lazy" /></a>
          ))}
        </div>
      )}
      {scope.scope_text && <div className="pre">{scope.scope_text}</div>}

      {plan ? (
        <div className="nb">
          <b>🤖 AI 암기 가이드</b>
          {plan.summary && <p className="pre" style={{ margin: "4px 0" }}>{plan.summary}</p>}
          {plan.units.map((u, i) => (
            <details key={i} className="q" open={i === 0}>
              <summary>
                <b>{u.name}</b> <span className={"bd" + (u.importance === "상" ? " red" : "")}>중요도 {u.importance}</span>
              </summary>
              {u.key_terms.length > 0 && (
                <div className="chips" style={{ margin: "8px 0" }}>
                  {u.key_terms.map((t, j) => <span key={j} className="chip">{t}</span>)}
                </div>
              )}
              {u.methods.map((m, j) => (
                <p key={j} className="sm pre" style={{ margin: "6px 0" }}><b>{m.method}</b> — {m.how}</p>
              ))}
              {u.check_questions.length > 0 && (
                <div className="sm" style={{ marginTop: 8 }}>
                  <b>스스로 확인</b>
                  {u.check_questions.map((c, j) => (
                    <details key={j}><summary>{c.q}</summary><p className="pre muted" style={{ margin: "4px 0 0" }}>답: {c.a || "—"}</p></details>
                  ))}
                </div>
              )}
            </details>
          ))}
          {plan.tips.length > 0 && (
            <ul className="sm" style={{ margin: "8px 0 0", paddingLeft: 18 }}>{plan.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          )}
          <p className="sm muted" style={{ margin: "6px 0 0" }}>AI가 만든 내용은 틀릴 수 있어요. 교과서와 선생님 설명으로 꼭 확인하세요.</p>
          {canEdit && (
            <div className="stack" style={{ marginTop: 6 }}>
              <AddPlanButton id={scope.id} added={!!scope.plan_added_at} />
              <AnalyzeExamButton id={scope.id} again />
            </div>
          )}
        </div>
      ) : (
        canEdit && <div className="nb"><AnalyzeExamButton id={scope.id} /></div>
      )}
    </article>
  );
}
