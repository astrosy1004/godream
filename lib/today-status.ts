import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "@/lib/dates";
import type { DayStatus } from "@/lib/nightly";

/**
 * 학생별 오늘 입력 현황(계획·공부 기록·수업 노트). 화면(사용자 권한)과 서버 알림(service role)이 함께 쓴다.
 * today 는 한국 날짜 'YYYY-MM-DD'.
 */
export async function fetchDayStatuses(
  db: Pick<SupabaseClient, "from">,
  studentIds: string[],
  today: string,
): Promise<Map<string, DayStatus>> {
  const out = new Map<string, DayStatus>();
  for (const id of studentIds) out.set(id, { tasksTotal: 0, leftTitles: [], sessions: 0, notes: 0 });
  if (studentIds.length === 0) return out;

  const start = `${today}T00:00:00+09:00`;
  const end = `${addDays(today, 1)}T00:00:00+09:00`;
  const [tasks, sessions, notes] = await Promise.all([
    db.from("plan_tasks").select("student_id, title, done_at").in("student_id", studentIds).eq("task_date", today).order("created_at"),
    db.from("study_sessions").select("student_id").in("student_id", studentIds).eq("studied_on", today),
    db.from("lesson_notes").select("student_id").in("student_id", studentIds).gte("created_at", start).lt("created_at", end),
  ]);
  for (const t of (tasks.data ?? []) as { student_id: string; title: string; done_at: string | null }[]) {
    const s = out.get(t.student_id);
    if (!s) continue;
    s.tasksTotal += 1;
    if (!t.done_at) s.leftTitles.push(t.title);
  }
  for (const r of (sessions.data ?? []) as { student_id: string }[]) {
    const s = out.get(r.student_id);
    if (s) s.sessions += 1;
  }
  for (const r of (notes.data ?? []) as { student_id: string }[]) {
    const s = out.get(r.student_id);
    if (s) s.notes += 1;
  }
  return out;
}
