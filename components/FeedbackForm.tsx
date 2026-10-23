"use client";

import { useActionState, useEffect, useRef } from "react";
import { addFeedback } from "@/app/feedback-actions";
import type { FormState } from "@/lib/types";

export function FeedbackForm({ studentName }: { studentName: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addFeedback, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card stack">
      <h2 style={{ margin: 0 }}>{studentName} 학생에게 피드백 남기기</h2>
      <label className="lab">
        오늘의 피드백
        <textarea className="in" name="body" maxLength={1000} rows={4} required placeholder="잘한 점, 응원, 내일 부탁하고 싶은 것을 적어 주세요." />
      </label>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "보내는 중…" : "보내기"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
