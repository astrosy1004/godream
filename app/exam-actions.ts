"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { addDays, diffDays, todayISO } from "@/lib/dates";
import { buildReviewPlan, parseExam } from "@/lib/exam";
import { AiError, analyzeExam, type ImagePart } from "@/lib/openai";
import type { FormState } from "@/lib/types";

const BUCKET = "wrong-notes"; // 오답노트와 같은 비공개 저장소 ('<학생 id>/exam/…' 폴더)
const MAX_TOTAL = 3.5 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const DAILY_AI_LIMIT = 5;

function refresh() {
  revalidatePath("/", "layout");
}

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

export async function addExamScope(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const files = fd.getAll("photo").filter((f): f is File => f instanceof File && f.size > 0).slice(0, 3);
  const parsed = parseExam((k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  }, files.length);
  if ("error" in parsed) return { error: parsed.error };
  if (files.some((f) => !MIME_EXT[f.type])) return { error: "사진은 JPG, PNG, WEBP만 올릴 수 있어요." };
  if (files.reduce((a, f) => a + f.size, 0) > MAX_TOTAL) return { error: "사진이 너무 커요. 장수를 줄이거나 더 작은 사진으로 올려 주세요." };

  const paths: string[] = [];
  for (const f of files) {
    const path = `${me.id}/exam/${crypto.randomUUID()}.${MIME_EXT[f.type]}`;
    const { error } = await supabase.storage.from(BUCKET).upload(path, f, { contentType: f.type });
    if (error) {
      if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
      return { error: "사진을 올리지 못했어요. 잠시 뒤 다시 시도해 주세요." };
    }
    paths.push(path);
  }
  const { error } = await supabase.from("exam_scopes").insert({ ...parsed.value, student_id: me.id, image_paths: paths });
  if (error) {
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
    return { error: "저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: "시험 범위를 저장했어요. ‘AI 암기 가이드 만들기’를 눌러 보세요." };
}

/** OpenAI 로 단원별 암기 가이드를 만든다. 하루 5번까지. 결과는 저장해 다시 비용이 들지 않게 한다. */
export async function analyzeExamScope(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const { data: scope } = await supabase.from("exam_scopes").select("*").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!scope) return { error: "시험 범위를 찾지 못했어요." };

  const { count } = await supabase
    .from("exam_scopes")
    .select("id", { count: "exact", head: true })
    .eq("student_id", me.id)
    .gte("analyzed_at", `${todayISO()}T00:00:00+09:00`);
  if ((count ?? 0) >= DAILY_AI_LIMIT) return { error: `AI 암기 가이드는 하루 ${DAILY_AI_LIMIT}번까지 만들 수 있어요. 내일 다시 해 주세요.` };

  const images: ImagePart[] = [];
  for (const path of scope.image_paths as string[]) {
    const { data: blob, error } = await supabase.storage.from(BUCKET).download(path);
    if (error || !blob) return { error: "사진을 불러오지 못했어요." };
    images.push({ base64: Buffer.from(await blob.arrayBuffer()).toString("base64"), mime: blob.type || "image/jpeg" });
  }
  try {
    const plan = await analyzeExam({ subject: scope.subject, title: scope.title, examOn: scope.exam_on, scopeText: scope.scope_text, images });
    const { error } = await supabase
      .from("exam_scopes")
      .update({ ai_plan: plan, analyzed_at: new Date().toISOString(), plan_added_at: null })
      .eq("id", id)
      .eq("student_id", me.id);
    if (error) return { error: "결과를 저장하지 못했어요." };
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "AI 분석에 실패했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  refresh();
  return { message: "암기 가이드를 만들었어요." };
}

/** 암기 가이드의 단원을 시험 전까지 나눠 ‘학습 계획’에 추가한다. 한 번만. */
export async function addPlanFromScope(id: string, _prev: FormState, _fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const { data: scope } = await supabase.from("exam_scopes").select("*").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!scope?.ai_plan) return { error: "먼저 AI 암기 가이드를 만들어 주세요." };
  if (scope.plan_added_at) return { error: "이미 학습 계획에 추가했어요." };
  const tasks = buildReviewPlan(scope.ai_plan.units, todayISO(), scope.exam_on, addDays, diffDays);
  if (tasks.length === 0) return { error: "시험 날짜가 이미 지나서 계획을 만들 수 없어요." };
  const { error } = await supabase.from("plan_tasks").insert(
    tasks.map((t) => ({ student_id: me.id, task_date: t.date, subject: scope.subject, title: t.title, minutes: t.minutes })),
  );
  if (error) return { error: "학습 계획에 추가하지 못했어요." };
  await supabase.from("exam_scopes").update({ plan_added_at: new Date().toISOString() }).eq("id", id).eq("student_id", me.id);
  refresh();
  return { message: `학습 계획에 ${tasks.length}개를 추가했어요.` };
}

export async function deleteExamScope(id: string) {
  const { supabase, me } = await studentCtx();
  const { data: scope } = await supabase.from("exam_scopes").select("image_paths").eq("id", id).eq("student_id", me.id).maybeSingle();
  await supabase.from("exam_scopes").delete().eq("id", id).eq("student_id", me.id);
  const paths = (scope?.image_paths ?? []) as string[];
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
  refresh();
}
