"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPerfStep, createPerf } from "@/app/perf-actions";
import { KINDS } from "@/lib/perf";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export function PerfForm({ defaultDue }: { defaultDue: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPerf, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card stack">
      <h2 style={{ margin: 0 }}>수행평가 추가</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 100px" }}>
          과목
          <select className="in" name="subject">
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "2 1 200px" }}>
          제목
          <input className="in" name="title" maxLength={80} placeholder="예: 과학 실험 보고서" required />
        </label>
        <label className="lab" style={{ flex: "0 0 110px" }}>
          유형
          <select className="in" name="kind">
            {KINDS.map((k) => <option key={k}>{k}</option>)}
          </select>
        </label>
      </div>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 170px" }}>
          마감일
          <input className="in" type="date" name="due_on" defaultValue={defaultDue} required />
        </label>
        <label className="lab" style={{ flex: "0 0 100px" }}>
          배점
          <input className="in" type="number" name="points" defaultValue={20} min={1} max={100} />
        </label>
      </div>
      <label className="lab">
        평가 기준·요구사항 메모 (선택, AI 단계에 반영돼요)
        <textarea className="in" name="notes" rows={2} maxLength={500} placeholder="예: A4 2장, 가설-방법-결과-결론 포함, 그래프 1개 이상" />
      </label>
      <p className="sm muted">AI 맞춤 단계는 준비 순서만 짜 줘요. 글이나 답을 대신 써 주지 않아요. 입력한 제목과 메모는 OpenAI로 전송돼요.</p>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" name="mode" value="basic" disabled={pending}>기본 단계로 추가</button>
        <button className="btn ghost" name="mode" value="ai" disabled={pending}>{pending ? "처리 중… (AI는 10~30초)" : "🤖 AI 맞춤 단계로 추가"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}

export function AddStepForm({ taskId, defaultBy }: { taskId: string; defaultBy: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPerfStep.bind(null, taskId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <details>
      <summary className="sm">단계 더 추가</summary>
      <form ref={ref} action={action} className="row" style={{ alignItems: "center", marginTop: 6 }}>
        <input className="in" name="title" maxLength={120} placeholder="예: 선생님께 초안 질문하기" style={{ flex: "2 1 220px" }} aria-label="단계" required />
        <input className="in" type="date" name="by_on" defaultValue={defaultBy} style={{ flex: "0 0 150px" }} aria-label="기한" required />
        <button className="btn s" disabled={pending}>{pending ? "…" : "추가"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </form>
    </details>
  );
}
