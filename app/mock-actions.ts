"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";
import { addDays, fmtMD, todayISO } from "@/lib/dates";
import { gradeMock, parseMockInput, type MockQuestion } from "@/lib/mock";
import { AiError, generateMock } from "@/lib/openai";
import type { FormState } from "@/lib/types";

const DAILY_LIMIT = 3;

async function studentCtx() {
  const me = await getProfile();
  if (!me || me.role !== "student") throw new Error("학생 계정만 사용할 수 있어요.");
  return { supabase: await createClient(), me };
}

/** 문제를 만들어 저장하고 시험 화면으로 보낸다. 하루 3번까지. */
export async function createMockTest(_prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const parsed = parseMockInput((k) => {
    const v = fd.get(k);
    return typeof v === "string" ? v : "";
  });
  if ("error" in parsed) return { error: parsed.error };
  const input = parsed.value;

  const { count } = await supabase
    .from("mock_tests")
    .select("id", { count: "exact", head: true })
    .eq("student_id", me.id)
    .gte("created_at", `${todayISO()}T00:00:00+09:00`);
  if ((count ?? 0) >= DAILY_LIMIT) return { error: `모의 테스트는 하루 ${DAILY_LIMIT}번까지 만들 수 있어요. 내일 다시 해 주세요.` };

  let subject = input.subject;
  let scopeText = input.scope_text;
  const units: string[] = [];
  if (input.scope_id) {
    const { data: scope } = await supabase.from("exam_scopes").select("subject, title, scope_text, ai_plan").eq("id", input.scope_id).eq("student_id", me.id).maybeSingle();
    if (!scope) return { error: "고른 시험 범위를 찾지 못했어요." };
    subject = scope.subject;
    scopeText = [scope.title, scope.scope_text, scopeText].filter(Boolean).join(" / ").slice(0, 900);
    for (const u of (scope.ai_plan?.units ?? []) as { name: string }[]) units.push(u.name);
  }
  const wrongs: { unit: string; question: string; answer: string }[] = [];
  if (input.include_wrong) {
    const { data } = await supabase
      .from("wrong_notes")
      .select("unit, question_text, correct_answer")
      .eq("student_id", me.id)
      .eq("subject", subject)
      .is("mastered_at", null)
      .order("created_at", { ascending: false })
      .limit(8);
    for (const w of data ?? []) {
      if (w.question_text) wrongs.push({ unit: w.unit, question: w.question_text.slice(0, 200), answer: w.correct_answer });
      else if (w.unit) wrongs.push({ unit: w.unit, question: "(사진 문제)", answer: w.correct_answer });
    }
  }

  let questions: MockQuestion[];
  try {
    questions = await generateMock({ subject, grade: me.grade, count: input.count, scopeText, units, wrongs });
  } catch (e) {
    return { error: e instanceof AiError ? e.message : "문제를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }

  const title = `${subject} 모의 테스트 ${fmtMD(todayISO())}`;
  const { data: row, error } = await supabase
    .from("mock_tests")
    .insert({ student_id: me.id, subject, title, questions, total: questions.length })
    .select("id")
    .single();
  if (error || !row) return { error: "테스트를 저장하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  revalidatePath("/mock");
  redirect(`/mock/${row.id}`);
}

/** 답안을 채점하고, 틀린 문제는 오답노트에 자동으로 넣는다. */
export async function submitMockTest(id: string, _prev: FormState, fd: FormData): Promise<FormState> {
  const { supabase, me } = await studentCtx();
  const { data: test } = await supabase.from("mock_tests").select("*").eq("id", id).eq("student_id", me.id).maybeSingle();
  if (!test) return { error: "테스트를 찾지 못했어요." };
  if (test.taken_at) return { error: "이미 제출한 테스트예요." };

  const questions = test.questions as MockQuestion[];
  const answers = questions.map((_, i) => {
    const v = fd.get(`a${i}`);
    return typeof v === "string" ? v.trim().slice(0, 200) : null;
  });
  const { results, score } = gradeMock(questions, answers);

  // 먼저 ‘제출됨’으로 표시해 두 번 눌러도 오답노트가 중복되지 않게 한다.
  const { data: marked, error } = await supabase
    .from("mock_tests")
    .update({ answers, score, taken_at: new Date().toISOString() })
    .eq("id", id)
    .eq("student_id", me.id)
    .is("taken_at", null)
    .select("id");
  if (error || !marked || marked.length === 0) return { error: "제출하지 못했어요. 잠시 뒤 다시 시도해 주세요." };

  const next = addDays(todayISO(), 1);
  const wrongRows = questions.flatMap((q, i) => {
    if (results[i].correct) return [];
    const body = q.type === "mc" ? `${q.question}\n${q.choices.map((c, j) => `${j + 1}) ${c}`).join("\n")}` : q.question;
    return [{
      student_id: me.id,
      subject: test.subject,
      unit: q.unit,
      question_text: body.slice(0, 1000),
      my_answer: results[i].given.slice(0, 200),
      correct_answer: results[i].expected.slice(0, 200),
      reason: "etc",
      memo: `${test.title} · 해설: ${q.explanation}`.slice(0, 500),
      next_review_on: next,
    }];
  });
  if (wrongRows.length > 0) await supabase.from("wrong_notes").insert(wrongRows);
  revalidatePath("/", "layout");
  redirect(`/mock/${id}`);
}

export async function deleteMockTest(id: string) {
  const { supabase, me } = await studentCtx();
  await supabase.from("mock_tests").delete().eq("id", id).eq("student_id", me.id);
  revalidatePath("/mock");
}
