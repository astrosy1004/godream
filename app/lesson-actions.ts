"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getViewContext } from "@/lib/auth";
import { parseLesson } from "@/lib/lessons";
import type { FormState } from "@/lib/types";

function refresh() {
  revalidatePath("/", "layout");
}

/** 학생 본인, 또는 연결된 선생님이 (선택한 학생에게) 수업 노트를 쓴다. 학부모는 쓸 수 없다. */
export async function addLesson(_prev: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getViewContext();
  if (!ctx || !ctx.student) return { error: "노트를 쓸 학생이 없어요." };
  if (ctx.me.role === "guardian") return { error: "학부모 계정은 열람만 할 수 있어요." };
  const parsed = parseLesson((k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  });
  if ("error" in parsed) return { error: parsed.error };
  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_notes")
    .insert({ ...parsed.value, student_id: ctx.student.id, author_id: ctx.me.id });
  if (error) return { error: "저장하지 못했어요. 연결 상태를 확인하고 다시 시도해 주세요." };
  refresh();
  return { message: "노트를 저장했어요." };
}

export async function deleteLesson(id: string) {
  const supabase = await createClient();
  await supabase.from("lesson_notes").delete().eq("id", id); // 작성자·노트 주인만 지워진다 (RLS)
  refresh();
}

export async function toggleHomework(id: string, done: boolean) {
  const supabase = await createClient();
  await supabase.rpc("set_homework_done", { p_id: id, p_done: done }); // 학생 본인만 반영된다
  refresh();
}
