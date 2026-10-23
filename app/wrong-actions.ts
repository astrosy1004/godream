"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { addDays, todayISO } from "@/lib/dates";
import { AiError, analyzeWrong } from "@/lib/openai";
import { FIRST_REVIEW_DAYS, nextReview, parseWrong, reasonLabel } from "@/lib/wrong";
import type { FormState } from "@/lib/types";

const BUCKET = "wrong-notes";
const MAX_PHOTO = 3.5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DAILY_AI_LIMIT = 20;

function refresh() {
  revalidatePath("/wrong");
}

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

export async function addWrongNote(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const photo = fd.get("photo");
  const file = photo instanceof File && photo.size > 0 ? photo : null;
  const parsed = parseWrong((k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  }, !!file);
  if ("error" in parsed) return { error: parsed.error };

  let path: string | null = null;
  if (file) {
    const ext = MIME_EXT[file.type];
    if (!ext) return { error: "사진은 JPG, PNG, WEBP만 올릴 수 있어요." };
    if (file.size > MAX_PHOTO) return { error: "사진이 너무 커요. 더 작은 사진으로 올려 주세요." };
    path = `${me.id}/${crypto.randomUUID()}.${ext}`;
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
    if (upErr) return { error: "사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  const { error } = await supabase.from("wrong_notes").insert({
    ...parsed.value,
    student_id: me.id,
    image_path: path,
    next_review_on: addDays(todayISO(), FIRST_REVIEW_DAYS),
  });
  if (error) {
    if (path) await supabase.storage.from(BUCKET).remove([path]);
    return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: "오답노트에 저장했어요. 내일 복습 목록에 나와요." };
}

/** OpenAI 로 분석한다. 하루 20번까지. 결과는 노트에 저장해 다시 비용이 들지 않게 한다. */
export async function analyzeWrongNote(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const { data: note } = await supabase.from("wrong_notes").select("*").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!note) return { error: "노트를 찾지 못했어요." };

  const dayStart = `${todayISO()}T00:00:00+09:00`;
  const { count } = await supabase
    .from("wrong_notes")
    .select("id", { count: "exact", head: true })
    .eq("student_id", me.id)
    .gte("analyzed_at", dayStart);
  if ((count ?? 0) >= DAILY_AI_LIMIT) return { error: `AI 분석은 하루 ${DAILY_AI_LIMIT}번까지 할 수 있어요. 내일 다시 해 주세요.` };

  let image: { base64: string; mime: string } | undefined;
  if (note.image_path) {
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(note.image_path);
    if (error || !blob) return { error: "사진을 불러오지 못했어요." };
    image = { base64: Buffer.from(await blob.arrayBuffer()).toString("base64"), mime: blob.type || "image/jpeg" };
  }
  try {
    const analysis = await analyzeWrong({
      subject: note.subject,
      unit: note.unit,
      questionText: note.question_text,
      myAnswer: note.my_answer,
      correctAnswer: note.correct_answer,
      reason: reasonLabel(note.reason),
      memo: note.memo,
      image,
    });
    const { error } = await supabase
      .from("wrong_notes")
      .update({ ai_analysis: analysis, analyzed_at: new Date().toISOString() })
      .eq("id", id)
      .eq("student_id", me.id);
    if (error) return { error: "분석 결과를 저장하지 못했어요." };
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "AI 분석에 실패했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: "분석을 마쳤어요." };
}

/** 복습 결과 기록: 기억났어요(got) → 간격을 늘리고, 또 헷갈렸어요 → 내일 다시. */
export async function reviewWrongNote(id: string, got: boolean) {
  const { supabase, me } = await studentCtx();
  const { data: note } = await supabase.from("wrong_notes").select("review_count").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!note) return;
  const r = nextReview(note.review_count, got, todayISO(), addDays);
  await supabase
    .from("wrong_notes")
    .update({
      review_count: r.review_count,
      next_review_on: r.next_review_on,
      mastered_at: r.mastered ? new Date().toISOString() : null,
    })
    .eq("id", id)
    .eq("student_id", me.id);
  refresh();
}

export async function deleteWrongNote(id: string) {
  const { supabase, me } = await studentCtx();
  const { data: note } = await supabase.from("wrong_notes").select("image_path").eq("id", id).eq("student_id", me.id).maybeSingle();
  await supabase.from("wrong_notes").delete().eq("id", id).eq("student_id", me.id);
  if (note?.image_path) await supabase.storage.from(BUCKET).remove([note.image_path]);
  refresh();
}
