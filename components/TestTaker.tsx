"use client";

import { useActionState } from "react";
import { submitMockTest } from "@/app/mock-actions";
import type { FormState } from "@/lib/types";

export interface PublicQuestion {
  type: "mc" | "short";
  question: string;
  choices: string[];
  unit: string;
}

/** 정답이 없는 문제만 받아서 푼다. 제출하면 서버에서 채점한다. */
export function TestTaker({ id, questions }: { id: string; questions: PublicQuestion[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitMockTest.bind(null, id), {});
  return (
    <form
      action={action}
      className="stack"
      onSubmit={(e) => {
        const fd = new FormData(e.currentTarget);
        const blank = questions.filter((_, i) => !String(fd.get(`a${i}`) ?? "").trim()).length;
        if (blank > 0 && !window.confirm(`풀지 않은 문제가 ${blank}개 있어요. 그래도 제출할까요?`)) e.preventDefault();
      }}
    >
      {questions.map((q, i) => (
        <fieldset key={i} className="card note" style={{ border: "1px solid var(--line)" }}>
          <legend className="sm muted" style={{ padding: "0 6px" }}>{i + 1}번{q.unit && ` · ${q.unit}`}</legend>
          <div className="pre"><b>{q.question}</b></div>
          {q.type === "mc" ? (
            <div className="stack" style={{ gap: 6 }}>
              {q.choices.map((c, j) => (
                <label key={j} className="chk">
                  <input type="radio" name={`a${i}`} value={j} /> <span>{j + 1}) {c}</span>
                </label>
              ))}
            </div>
          ) : (
            <input className="in" name={`a${i}`} maxLength={200} placeholder="정답을 쓰세요" autoComplete="off" />
          )}
        </fieldset>
      ))}
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "채점 중…" : "제출하고 채점하기"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
