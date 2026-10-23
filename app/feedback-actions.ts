"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewContext } from "@/lib/auth";
import type { FormState } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

/** 연결된 학부모·선생님이 선택한 학생에게 피드백을 남긴다. */
export async function addFeedback(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getViewContext();
  if (!ctx || !ctx.student) return { error: "피드백을 남길 학생이 없어요." };
  if (ctx.me.role === "student") return { error: "학생 계정은 피드백을 받는 쪽이에요." };
  const raw = fd.get("body");
  const body = typeof raw === "string" ? raw.trim() : "";
  if (!body) return { error: "피드백 내용을 입력해 주세요." };
  if (body.length > 1000) return { error: "피드백은 1000자 이내로 써 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.from("feedback").insert({ student_id: ctx.student.id, author_id: ctx.me.id, body });
  if (error) return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  refresh();
  return { message: "피드백을 보냈어요." };
}

export async function deleteFeedback(id: string) {
  const supabase = await createClient();
  await supabase.from("feedback").delete().eq("id", id); // 작성자만 지워진다 (RLS)
  refresh();
}

/** 학생이 피드백 화면을 열면 읽음으로 표시한다. */
export async function markFeedbackRead() {
  const supabase = await createClient();
  await supabase.rpc("mark_feedback_read");
  refresh();
}
