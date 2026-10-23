"use client";

import { useActionState } from "react";
import { addPlanFromScope, analyzeExamScope } from "@/app/exam-actions";
import type { FormState } from "@/lib/types";

export function AnalyzeExamButton({ id, again }: { id: string; again?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(analyzeExamScope.bind(null, id), {});
  return (
    <form action={action} className="row" style={{ alignItems: "center" }}>
      <button className="btn s" disabled={pending}>
        {pending ? "AI가 만드는 중… (20~50초)" : again ? "가이드 다시 만들기" : "🤖 AI 암기 가이드 만들기"}
      </button>
      {state.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  );
}

export function AddPlanButton({ id, added }: { id: string; added: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPlanFromScope.bind(null, id), {});
  return (
    <form action={action} className="row" style={{ alignItems: "center" }}>
      <button className="btn ghost s" disabled={pending || added || !!state.message}>
        {added || state.message ? "학습 계획에 추가됨 ✓" : pending ? "추가 중…" : "📅 시험 전까지 학습 계획에 추가"}
      </button>
      {state.error && <span className="err" role="alert">{state.error}</span>}
      {state.message && <span className="okmsg" role="status">{state.message}</span>}
    </form>
  );
}
