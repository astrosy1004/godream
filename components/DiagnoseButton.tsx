"use client";

import { useActionState } from "react";
import { diagnoseSubject } from "@/app/strategy-actions";
import type { FormState } from "@/lib/types";

export function DiagnoseButton({ subject, again }: { subject: string; again?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(diagnoseSubject.bind(null, subject), {});
  return (
    <form action={action} className="row" style={{ alignItems: "center" }}>
      <button className="btn ghost s" disabled={pending}>
        {pending ? "진단 중… (10~30초)" : again ? "다시 진단받기" : "🤖 내 기록으로 진단받기"}
      </button>
      {state.error && <span className="err" role="alert">{state.error}</span>}
    </form>
  );
}
