import { createClient } from "@/lib/supabase/server";
import type { ExamScope, MockTest, WrongNote, FeedbackRow, LessonNote, PlanTask, StudySession, TimerRow } from "@/lib/types";

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

/** 수업 노트: 수업 날짜 최신순, 과목 필터 선택 */
export async function fetchLessons(studentId: string, subject?: string): Promise<LessonNote[]> {
  const supabase = await createClient();
  let q = supabase
    .from("lesson_notes")
    .select("id, student_id, author_id, subject, lesson_on, title, summary, homework, next_questions, homework_done_at, author:profiles!lesson_notes_author_id_fkey(name)")
    .eq("student_id", studentId);
  if (subject) q = q.eq("subject", subject);
  const { data } = await q.order("lesson_on", { ascending: false }).order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as unknown as LessonNote[];
}

export async function fetchFeedback(studentId: string): Promise<FeedbackRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback")
    .select("id, student_id, author_id, body, read_at, created_at, author:profiles!feedback_author_id_fkey(name, role)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })
    .limit(50);
  return (data ?? []) as unknown as FeedbackRow[];
}

export async function countUnreadFeedback(studentId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("feedback")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .is("read_at", null);
  return count ?? 0;
}

export async function fetchWrongNotes(studentId: string, subject?: string): Promise<WrongNote[]> {
  const supabase = await createClient();
  let q = supabase.from("wrong_notes").select("*").eq("student_id", studentId);
  if (subject) q = q.eq("subject", subject);
  const { data } = await q.order("created_at", { ascending: false }).limit(100);
  return (data ?? []) as WrongNote[];
}

/** 비공개 사진의 임시 주소(1시간). 경로 → 주소 */
export async function signedPhotoUrls(paths: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (paths.length === 0) return out;
  const supabase = await createClient();
  const { data } = await supabase.storage.from("wrong-notes").createSignedUrls(paths, 3600);
  for (const r of data ?? []) if (r.path && r.signedUrl) out.set(r.path, r.signedUrl);
  return out;
}

export async function fetchExamScopes(studentId: string): Promise<ExamScope[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("exam_scopes")
    .select("*")
    .eq("student_id", studentId)
    .order("exam_on", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(60);
  return (data ?? []) as ExamScope[];
}

export async function fetchMockTests(studentId: string): Promise<MockTest[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("mock_tests").select("*").eq("student_id", studentId).order("created_at", { ascending: false }).limit(60);
  return (data ?? []) as MockTest[];
}

export async function fetchMockTest(studentId: string, id: string): Promise<MockTest | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("mock_tests").select("*").eq("student_id", studentId).eq("id", id).maybeSingle();
  return (data as MockTest | null) ?? null;
}
