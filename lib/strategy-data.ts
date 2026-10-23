import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays, todayISO, weekStart } from "@/lib/dates";
import { buildStats, type SubjectStats } from "@/lib/strategy";

/** 한 학생·한 과목의 최근 기록을 모아 요약한다. 화면(사용자 권한)과 진단 액션이 함께 쓴다. */
export async function fetchSubjectStats(
  db: Pick<SupabaseClient, "from">,
  studentId: string,
  subject: string,
): Promise<SubjectStats> {
  const today = todayISO();
  const from4w = addDays(weekStart(today), -21);
  const [sessions, tasks, wrongs, mocks] = await Promise.all([
    db.from("study_sessions").select("studied_on, minutes").eq("student_id", studentId).eq("subject", subject).gte("studied_on", from4w),
    db.from("plan_tasks").select("done_at").eq("student_id", studentId).eq("subject", subject).gte("task_date", addDays(today, -13)).lte("task_date", today),
    db.from("wrong_notes").select("reason, unit").eq("student_id", studentId).eq("subject", subject).gte("created_at", `${addDays(today, -29)}T00:00:00+09:00`),
    db.from("mock_tests").select("score, total").eq("student_id", studentId).eq("subject", subject).not("taken_at", "is", null).order("taken_at", { ascending: false }).limit(4),
  ]);
  return buildStats(
    {
      sessions: (sessions.data ?? []) as { studied_on: string; minutes: number }[],
      tasks: (tasks.data ?? []) as { done_at: string | null }[],
      wrongs: (wrongs.data ?? []) as { reason: string; unit: string }[],
      mocks: ((mocks.data ?? []) as { score: number | null; total: number }[]).map((m) => ({ score: m.score ?? 0, total: m.total })),
    },
    today, weekStart, addDays,
  );
}
