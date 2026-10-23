import { createClient } from "@/lib/supabase/server";
import type { PlanTask, StudySession, TimerRow } from "@/lib/types";

export async function fetchSessions(studentId: string, from: string, to: string): Promise<StudySession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("study_sessions")
    .select("id, student_id, subject, minutes, studied_on")
    .eq("student_id", studentId)
    .gte("studied_on", from)
    .lte("studied_on", to)
    .order("created_at");
  return (data ?? []) as StudySession[];
}

export async function fetchTasks(studentId: string, from: string, to: string): Promise<PlanTask[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("plan_tasks")
    .select("id, student_id, task_date, subject, title, minutes, done_at")
    .eq("student_id", studentId)
    .gte("task_date", from)
    .lte("task_date", to)
    .order("task_date")
    .order("created_at");
  return (data ?? []) as PlanTask[];
}

export async function fetchTimer(studentId: string): Promise<TimerRow | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("timers").select("student_id, subject, started_at, acc_ms, pomodoro").eq("student_id", studentId).maybeSingle();
  return (data as TimerRow | null) ?? null;
}

/** 연속 공부일 계산용: 최근 60일 공부 날짜 */
export async function fetchStudyDays(studentId: string, from: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("study_sessions").select("studied_on").eq("student_id", studentId).gte("studied_on", from);
  return ((data ?? []) as { studied_on: string }[]).map((r) => r.studied_on);
}
