import { deleteTask, toggleTask } from "@/app/study-actions";
import { subjectColor } from "@/lib/subjects";
import type { PlanTask } from "@/lib/types";

export function TaskRow({ task, readOnly }: { task: PlanTask; readOnly: boolean }) {
  const done = !!task.done_at;
  return (
    <div className={"todo" + (done ? " done" : "")}>
      <form action={toggleTask.bind(null, task.id, !done)}>
        <button className="cb" aria-pressed={done} aria-label={done ? "완료 취소" : "완료로 표시"} disabled={readOnly}>
          {done ? "✓" : ""}
        </button>
      </form>
      <div className="tt">
        <i className="sw" style={{ ["--c" as string]: subjectColor(task.subject) }} /> {task.title}{" "}
        <span className="sm muted mono">{task.minutes}분</span>
      </div>
      {!readOnly && (
        <form action={deleteTask.bind(null, task.id)}>
          <button className="x" aria-label="삭제">×</button>
        </form>
      )}
    </div>
  );
}
