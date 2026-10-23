"use client";

import { useActionState, useEffect, useRef } from "react";
import { addPrepUnits, createPrepExam } from "@/app/prep-actions";
import type { FormState } from "@/lib/types";

export interface ScopeChoice {
  id: string;
  label: string;
}

export function PrepExamForm({ scopes, defaultDate }: { scopes: ScopeChoice[]; defaultDate: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createPrepExam, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card stack">
      <h2 style={{ margin: 0 }}>시험 추가</h2>
      <div className="row">
        <label className="lab" style={{ flex: "2 1 200px" }}>
          시험 이름
          <input className="in" name="name" maxLength={60} placeholder="예: 2학기 중간고사" required />
        </label>
        <label className="lab" style={{ flex: "0 0 170px" }}>
          시험 날짜
          <input className="in" type="date" name="exam_on" defaultValue={defaultDate} required />
        </label>
      </div>
      <label className="lab">
        과목별 단원 (한 줄에 한 과목, “과목: 단원, 단원”)
        <textarea className="in" name="units" rows={3} placeholder={"수학: 이차함수, 확률\n영어: 7과 본문, 관계사"} />
      </label>
      {scopes.length > 0 && (
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sm muted">‘시험 범위·암기’에 올려 둔 범위에서 단원 가져오기</legend>
          <div className="stack" style={{ gap: 4, marginTop: 4 }}>
            {scopes.map((s) => (
              <label key={s.id} className="chk"><input type="checkbox" name="scope_id" value={s.id} /> {s.label}</label>
            ))}
          </div>
        </fieldset>
      )}
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "추가 중…" : "시험 추가"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}

export function AddUnitsForm({ examId }: { examId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addPrepUnits.bind(null, examId), {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <details>
      <summary className="sm">단원 더 추가</summary>
      <form ref={ref} action={action} className="row" style={{ alignItems: "center", marginTop: 6 }}>
        <input className="in" name="units" placeholder="수학: 도형의 닮음" style={{ flex: "1 1 240px" }} aria-label="추가할 단원" />
        <button className="btn s" disabled={pending}>{pending ? "…" : "추가"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </form>
    </details>
  );
}
