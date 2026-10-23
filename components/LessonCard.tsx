import { deleteLesson, toggleHomework } from "@/app/lesson-actions";
import { fmtMD } from "@/lib/dates";
import { subjectColor } from "@/lib/subjects";
import type { LessonNote } from "@/lib/types";

export function LessonCard({
  note, canCheckHomework, canDelete,
}: { note: LessonNote; canCheckHomework: boolean; canDelete: boolean }) {
  const byTeacher = note.author_id !== note.student_id;
  const done = !!note.homework_done_at;
  return (
    <article className="card note">
      <div className="nh">
        <h3>
          <i className="sw" style={{ ["--c" as string]: subjectColor(note.subject) }} />
          {note.title}
        </h3>
        <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
          <span className="bd">{note.subject}</span>
          <span className="bd mono">{fmtMD(note.lesson_on)}</span>
          {byTeacher && <span className="bd">{note.author?.name ? `${note.author.name} 선생님` : "선생님"}</span>}
          {canDelete && (
            <form action={deleteLesson.bind(null, note.id)}>
              <button className="x" aria-label="노트 삭제">×</button>
            </form>
          )}
        </div>
      </div>
      {note.summary && (
        <div className="nb"><b>핵심 정리</b><div className="pre">{note.summary}</div></div>
      )}
      {note.homework && (
        <div className="nb">
          <b>숙제</b>
          <div className={"hwbox" + (done ? " done" : "")}>
            <form action={toggleHomework.bind(null, note.id, !done)}>
              <button className="cb" aria-pressed={done} aria-label={done ? "숙제 완료 취소" : "숙제 완료로 표시"} disabled={!canCheckHomework}>
                {done ? "✓" : ""}
              </button>
            </form>
            <div className="pre">{note.homework}</div>
          </div>
        </div>
      )}
      {note.next_questions && (
        <div className="nb"><b>다음 수업에 물어볼 것</b><div className="pre">{note.next_questions}</div></div>
      )}
    </article>
  );
}
