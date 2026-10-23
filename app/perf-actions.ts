"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { addDays, diffDays, todayISO } from "@/lib/dates";
import { AiError, generatePerfSteps } from "@/lib/openai";
import { DATE_RE } from "@/lib/exam";
import { MAX_STEPS, clampDate, defaultSteps, parsePerf, type StepDraft } from "@/lib/perf";
import type { FormState } from "@/lib/types";

const DAILY_AI_LIMIT = 5;

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

function refresh() {
  revalidatePath("/", "layout");
}

/** 수행평가를 만들고 단계를 채운다. mode=ai 면 OpenAI 가 맞춤 단계를 만들고, 실패하면 기본 단계로 대신한다. */
export async function createPerf(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const parsed = parsePerf((k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  });
  if ("error" in parsed) return { error: parsed.error };
  const p = parsed.value;
  const today = todayISO();
  if (p.due_on < today) return { error: "마감일이 이미 지났어요. 오늘 이후 날짜를 선택해 주세요." };

  let steps: StepDraft[] | null = null;
  let note = "";
  if (p.mode === "ai") {
    const { count } = await supabase
      .from("perf_tasks")
      .select("id", { count: "exact", head: true })
      .eq("student_id", me.id)
      .eq("ai_used", true)
      .gte("created_at", `${today}T00:00:00+09:00`);
    if ((count ?? 0) >= DAILY_AI_LIMIT) {
      note = ` AI 단계는 하루 ${DAILY_AI_LIMIT}번까지라 기본 단계로 넣었어요.`;
    } else {
      try {
        steps = await generatePerfSteps({ subject: p.subject, kind: p.kind, title: p.title, points: p.points, notes: p.notes, today, due: p.due_on, grade: me.grade });
      } catch (e) {
        note = ` ${e instanceof AiError ? e.message : "AI 단계를 만들지 못해"} 기본 단계로 넣었어요.`;
      }
    }
  }
  const usedAi = steps !== null;
  const finalSteps = steps ?? defaultSteps(p.kind, today, p.due_on, addDays, diffDays);

  const { data: row, error } = await supabase
    .from("perf_tasks")
    .insert({ student_id: me.id, subject: p.subject, title: p.title, kind: p.kind, points: p.points, due_on: p.due_on, notes: p.notes, ai_used: usedAi })
    .select("id")
    .single();
  if (error || !row) return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  const { error: sErr } = await supabase
    .from("perf_steps")
    .insert(finalSteps.map((s) => ({ task_id: row.id, student_id: me.id, title: s.title, by_on: s.by_on })));
  if (sErr) {
    await supabase.from("perf_tasks").delete().eq("id", row.id);
    return { error: "단계를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: `수행평가와 준비 단계 ${finalSteps.length}개를 추가했어요.${note}` };
}

export async function togglePerfStep(id: string, done: boolean) {
  const { supabase, me } = await studentCtx();
  await supabase.from("perf_steps").update({ done_at: done ? new Date().toISOString() : null }).eq("id", id).eq("student_id", me.id);
  refresh();
}

export async function addPerfStep(taskId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const t = fd.get("title");
  const b = fd.get("by_on");
  const title = typeof t === "string" ? t.trim() : "";
  if (!title || title.length > 120) return { error: "단계를 1~120자로 입력해 주세요." };
  if (typeof b !== "string" || !DATE_RE.test(b)) return { error: "기한을 선택해 주세요." };
  const { data: task } = await supabase.from("perf_tasks").select("due_on").eq("id", taskId).eq("student_id", me.id).maybeSingle();
  if (!task) return { error: "수행평가를 찾지 못했어요." };
  const { count } = await supabase.from("perf_steps").select("id", { count: "exact", head: true }).eq("task_id", taskId).eq("student_id", me.id);
  if ((count ?? 0) >= MAX_STEPS) return { error: `단계는 ${MAX_STEPS}개까지 넣을 수 있어요.` };
  const { error } = await supabase
    .from("perf_steps")
    .insert({ task_id: taskId, student_id: me.id, title, by_on: clampDate(b, todayISO(), task.due_on) });
  if (error) return { error: "추가하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  refresh();
  return { message: "단계를 추가했어요." };
}

export async function deletePerfStep(id: string) {
  const { supabase, me } = await studentCtx();
  await supabase.from("perf_steps").delete().eq("id", id).eq("student_id", me.id);
  refresh();
}

export async function deletePerf(id: string) {
  const { supabase, me } = await studentCtx();
  await supabase.from("perf_tasks").delete().eq("id", id).eq("student_id", me.id);
  refresh();
}
