import { deleteWrongNote, reviewWrongNote } from "@/app/wrong-actions";
import { AnalyzeButton } from "@/components/AnalyzeButton";
import { fmtMD, kstDateOf } from "@/lib/dates";
import { subjectColor } from "@/lib/subjects";
import type { WrongNote } from "@/lib/types";
import { REVIEW_STEPS, reasonLabel } from "@/lib/wrong";

export function WrongCard({
  note, photoUrl, canEdit, today,
}: { note: WrongNote; photoUrl?: string; canEdit: boolean; today: string }) {
  const mastered = !!note.mastered_at;
  const due = !mastered && !!note.next_review_on && note.next_review_on <= today;
  const a = note.ai_analysis;
  return (
    <article className="card note">
      <div className="nh">
        <h3>
          <i className="sw" style={{ ["--c" as string]: subjectColor(note.subject) }} />
          {note.unit || note.subject}
          {mastered ? <span className="bd">정복 ✓</span> : due ? <span className="bd red">오늘 복습</span> : null}
        </h3>
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <span className="bd">{note.subject}</span>
          <span className="bd">{reasonLabel(note.reason)}</span>
          <span className="bd mono">{fmtMD(kstDateOf(note.created_at))}</span>
          {canEdit && (
            <form action={deleteWrongNote.bind(null, note.id)}>
              <button className="x" aria-label="오답 삭제">×</button>
            </form>
          )}
        </div>
      </div>

      {photoUrl && <a href={photoUrl} target="_blank" rel="noreferrer"><img className="wimg" src={photoUrl} alt="오답 문제 사진" loading="lazy" /></a>}
      {note.question_text && <div className="pre">{note.question_text}</div>}
      {(note.my_answer || note.correct_answer) && (
        <div className="sm">
          {note.my_answer && <>내 답 <b>{note.my_answer}</b></>}
          {note.my_answer && note.correct_answer && " · "}
          {note.correct_answer && <>정답 <b>{note.correct_answer}</b></>}
        </div>
      )}
      {note.memo && <div className="sm muted">메모: {note.memo}</div>}

      {a ? (
        <div className="nb">
          <b>🤖 AI 분석 {a.concept && `· ${a.concept}`}</b>
          {a.mistake_type && <p className="sm" style={{ margin: "2px 0" }}><span className="bd">{a.mistake_type}</span></p>}
          {a.why_wrong && <p className="pre" style={{ margin: "4px 0" }}>{a.why_wrong}</p>}
          {a.correct_steps.length > 0 && (
            <ol style={{ margin: "4px 0", paddingLeft: 20 }}>{a.correct_steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
          )}
          {a.key_points.length > 0 && (
            <ul style={{ margin: "4px 0", paddingLeft: 20 }}>{a.key_points.map((s, i) => <li key={i}>{s}</li>)}</ul>
          )}
          {a.review_tip && <p className="sm" style={{ margin: "4px 0" }}>복습 방법: {a.review_tip}</p>}
          {a.practice.question && (
            <details className="q">
              <summary>비슷한 연습 문제</summary>
              <p className="pre">{a.practice.question}</p>
              {a.practice.hint && <p className="sm muted pre">힌트: {a.practice.hint}</p>}
            </details>
          )}
          <p className="sm muted" style={{ margin: "6px 0 0" }}>AI 분석은 틀릴 수 있어요. 교과서·선생님 풀이와 꼭 비교해 보세요.</p>
          {canEdit && <AnalyzeButton id={note.id} again />}
        </div>
      ) : (
        canEdit && <div className="nb"><AnalyzeButton id={note.id} /></div>
      )}

      {!mastered && (
        <div className="nb">
          <b>복습 {note.review_count}/{REVIEW_STEPS.length}{note.next_review_on && ` · 다음 ${fmtMD(note.next_review_on)}`}</b>
          {canEdit && (
            <div className="row">
              <form action={reviewWrongNote.bind(null, note.id, true)}><button className="btn s">기억났어요</button></form>
              <form action={reviewWrongNote.bind(null, note.id, false)}><button className="btn ghost s">또 헷갈렸어요</button></form>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
