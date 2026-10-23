"use client";

import { useActionState } from "react";
import { analyzeWrongNote } from "@/app/wrong-actions";
import type { FormState } from "@/lib/types";

export function AnalyzeButton({ id, again }: { id: string; again?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(analyzeWrongNote.bind(null, id), {});
  return (
    <form action={action} className="row" style={{ alignItems: "center" }}>
      <button className="btn ghost s" disabled={pending}>
        {pending ? "AI가 분석하는 중… (10~30초)" : again ? "다시 분석" : "🤖 AI로 분석하기"}
      </button>
      {state.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  );
}
