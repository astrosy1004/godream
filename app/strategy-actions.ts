"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { AiError, generateDiagnosis } from "@/lib/openai";
import { fetchSubjectStats } from "@/lib/strategy-data";
import { isSubject } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

const DAILY_LIMIT = 5;

/** 내 기록(공부 시간·계획·오답·모의 테스트)으로 과목 진단을 받는다. 과목별로 최신 1건만 저장한다. */
export async function diagnoseSubject(subject: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const me = await getProfile();
  if (!me || me.role !== "student") return { error: "학생 계정만 진단을 받을 수 있어요." };
  if (!isSubject(subject)) return { error: "과목을 확인해 주세요." };
  const supabase = await createClient();

  const { count } = await supabase
    .from("strategy_diagnoses")
    .select("subject", { count: "exact", head: true })
    .eq("student_id", me.id)
    .gte("updated_at", `${todayISO()}T00:00:00+09:00`);
  if ((count ?? 0) >= DAILY_LIMIT) return { error: `진단은 하루 ${DAILY_LIMIT}번까지 받을 수 있어요. 내일 다시 해 주세요.` };

  const stats = await fetchSubjectStats(supabase, me.id, subject);
  try {
    const body = await generateDiagnosis({ subject, grade: me.grade, stats });
    const { error } = await supabase
      .from("strategy_diagnoses")
      .upsert({ student_id: me.id, subject, body, updated_at: new Date().toISOString() }, { onConflict: "student_id,subject" });
    if (error) return { error: "진단 결과를 저장하지 못했어요." };
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "진단에 실패했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  revalidatePath("/strategy");
  return { message: "진단을 마쳤어요." };
}
