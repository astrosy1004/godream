"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { MAX_UNITS_PER_EXAM, nextStage, parsePrepExam, parseUnitLines, unitsFromScope, type UnitDraft } from "@/lib/prep";
import type { FormState } from "@/lib/types";

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

function refresh() {
  revalidatePath("/exam");
}

/** 시험을 만들고, 직접 적은 단원과 ‘시험 범위·암기’에서 가져온 단원을 함께 넣는다. */
export async function createPrepExam(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const get = (k: string) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  };
  const exam = parsePrepExam(get);
  if ("error" in exam) return { error: exam.error };
  const lines = parseUnitLines(get("units"));
  if ("error" in lines) return { error: lines.error };

  const drafts: UnitDraft[] = [...lines.units];
  const scopeIds = fd.getAll("scope_id").filter((v): v is string => typeof v === "string" && /^[0-9a-fA-F-]{36}$/.test(v));
  if (scopeIds.length > 0) {
    const { data } = await supabase.from("exam_scopes").select("subject, scope_text, ai_plan").in("id", scopeIds).eq("student_id", me.id);
    for (const s of data ?? []) drafts.push(...unitsFromScope(s));
  }
  const seen = new Set<string>();
  const units = drafts.filter((u) => {
    const k = `${u.subject}|${u.title}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  }).slice(0, MAX_UNITS_PER_EXAM);
  if (units.length === 0) return { error: "과목별 단원을 적거나, 올려 둔 시험 범위를 하나 이상 골라 주세요." };

  const { data: row, error } = await supabase.from("exams").insert({ student_id: me.id, ...exam.value }).select("id").single();
  if (error || !row) return { error: "시험을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  const { error: uErr } = await supabase
    .from("exam_units")
    .insert(units.map((u) => ({ exam_id: row.id, student_id: me.id, subject: u.subject, title: u.title })));
  if (uErr) {
    await supabase.from("exams").delete().eq("id", row.id);
    return { error: "단원을 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: `시험과 단원 ${units.length}개를 추가했어요.` };
}

export async function addPrepUnits(examId: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const raw = fd.get("units");
  const parsed = parseUnitLines(typeof raw === "string" ? raw : "");
  if ("error" in parsed) return { error: parsed.error };
  if (parsed.units.length === 0) return { error: "추가할 단원을 적어 주세요." };
  const { count } = await supabase.from("exam_units").select("id", { count: "exact", head: true }).eq("exam_id", examId).eq("student_id", me.id);
  if ((count ?? 0) + parsed.units.length > MAX_UNITS_PER_EXAM) return { error: `한 시험에는 단원을 ${MAX_UNITS_PER_EXAM}개까지 넣을 수 있어요.` };
  const { error } = await supabase
    .from("exam_units")
    .insert(parsed.units.map((u) => ({ exam_id: examId, student_id: me.id, subject: u.subject, title: u.title })));
  if (error) return { error: "추가하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  refresh();
  return { message: `${parsed.units.length}개를 추가했어요.` };
}

/** 진행도를 한 칸씩 올린다: 미시작 → 개념 → 문제풀이 → 오답복습 완료 → 미시작 */
export async function cycleUnit(id: string) {
  const { supabase, me } = await studentCtx();
  const { data } = await supabase.from("exam_units").select("stage").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!data) return;
  await supabase.from("exam_units").update({ stage: nextStage(data.stage) }).eq("id", id).eq("student_id", me.id);
  refresh();
}

export async function deleteUnit(id: string) {
  const { supabase, me } = await studentCtx();
  await supabase.from("exam_units").delete().eq("id", id).eq("student_id", me.id);
  refresh();
}

export async function deletePrepExam(id: string) {
  const { supabase, me } = await studentCtx();
  await supabase.from("exams").delete().eq("id", id).eq("student_id", me.id);
  refresh();
}
