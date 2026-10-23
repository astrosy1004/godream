"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { elapsedMs, todayISO } from "@/lib/dates";
import { isSubject } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

function refresh() {
  revalidatePath("/", "layout");
}

/* ---------- 학습 계획 ---------- */

export async function addTask(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const title = str(fd, "title");
  const subject = str(fd, "subject");
  const date = str(fd, "date");
  const minutes = Number(str(fd, "minutes"));
  if (!title || title.length > 120) return { error: "할 일을 1~120자로 입력해 주세요." };
  if (!isSubject(subject)) return { error: "과목을 선택해 주세요." };
  if (!DATE_RE.test(date)) return { error: "날짜를 선택해 주세요." };
  if (!Number.isInteger(minutes) || minutes < 5 || minutes > 600) return { error: "시간은 5~600분으로 입력해 주세요." };
  const { error } = await supabase
    .from("plan_tasks")
    .insert({ student_id: me.id, task_date: date, subject, title, minutes });
  if (error) return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  refresh();
  return { message: "추가했어요." };
}

export async function toggleTask(id: string, done: boolean) {
  const { supabase } = await studentCtx();
  await supabase.from("plan_tasks").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id);
  refresh();
}

export async function deleteTask(id: string) {
  const { supabase } = await studentCtx();
  await supabase.from("plan_tasks").delete().eq("id", id);
  refresh();
}

/* ---------- 타이머 (경과 시간은 항상 서버 시각으로 계산) ---------- */

async function loadTimer(supabase: Awaited<ReturnType<typeof createClient>>, studentId: string) {
  const { data } = await supabase.from("timers").select("*").eq("student_id", studentId).maybeSingle();
  return data as { subject: string; started_at: string | null; acc_ms: number; pomodoro: boolean } | null;
}

export async function toggleTimer() {
  const { supabase, me } = await studentCtx();
  const t = await loadTimer(supabase, me.id);
  const now = new Date().toISOString();
  if (!t) {
    await supabase.from("timers").insert({ student_id: me.id, started_at: now });
  } else if (t.started_at) {
    await supabase
      .from("timers")
      .update({ started_at: null, acc_ms: elapsedMs(t.acc_ms, t.started_at), updated_at: now })
      .eq("student_id", me.id);
  } else {
    await supabase.from("timers").update({ started_at: now, updated_at: now }).eq("student_id", me.id);
  }
  refresh();
}

export async function resetTimer() {
  const { supabase, me } = await studentCtx();
  await supabase
    .from("timers")
    .update({ started_at: null, acc_ms: 0, updated_at: new Date().toISOString() })
    .eq("student_id", me.id);
  refresh();
}

export async function saveTimer(_prev: FormState): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const t = await loadTimer(supabase, me.id);
  if (!t) return { error: "타이머를 먼저 시작해 주세요." };
  const minutes = Math.min(720, Math.round(elapsedMs(t.acc_ms, t.started_at) / 60_000));
  if (minutes < 1) return { error: "1분 이상 공부하면 기록할 수 있어요." };
  const { error } = await supabase
    .from("study_sessions")
    .insert({ student_id: me.id, subject: t.subject, minutes, studied_on: todayISO() });
  if (error) return { error: "기록하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  await supabase
    .from("timers")
    .update({ started_at: null, acc_ms: 0, updated_at: new Date().toISOString() })
    .eq("student_id", me.id);
  refresh();
  return { message: `${t.subject} ${minutes}분을 기록했어요.` };
}

export async function setTimerSubject(subject: string) {
  const { supabase, me } = await studentCtx();
  if (!isSubject(subject)) return;
  const t = await loadTimer(supabase, me.id);
  if (t?.started_at) return; // 공부 중에는 과목을 바꾸지 않는다
  await supabase.from("timers").upsert({ student_id: me.id, subject, updated_at: new Date().toISOString() });
  refresh();
}

export async function setPomodoro(on: boolean) {
  const { supabase, me } = await studentCtx();
  await supabase.from("timers").upsert({ student_id: me.id, pomodoro: on, updated_at: new Date().toISOString() });
  refresh();
}

/* ---------- 공부 기록 · 목표 ---------- */

export async function addSession(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const subject = str(fd, "subject");
  const minutes = Number(str(fd, "minutes"));
  if (!isSubject(subject)) return { error: "과목을 선택해 주세요." };
  if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) return { error: "1~600분 사이로 입력해 주세요." };
  const { error } = await supabase
    .from("study_sessions")
    .insert({ student_id: me.id, subject, minutes, studied_on: todayISO() });
  if (error) return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  refresh();
  return { message: "기록했어요." };
}

export async function deleteSession(id: string) {
  const { supabase } = await studentCtx();
  await supabase.from("study_sessions").delete().eq("id", id);
  refresh();
}

export async function setGoal(minutes: number) {
  const { supabase, me } = await studentCtx();
  if (![120, 180, 240, 300, 360, 480].includes(minutes)) return;
  await supabase.from("profiles").update({ goal_minutes: minutes }).eq("id", me.id);
  refresh();
}
