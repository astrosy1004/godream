"use client";

import { useActionState, useEffect, useRef } from "react";
import { addLesson } from "@/app/lesson-actions";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export function LessonForm({ today, forName }: { today: string; forName?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addLesson, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.message) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="card stack">
      <h2 style={{ margin: 0 }}>{forName ? `${forName} 학생의 수업 노트 쓰기` : "수업 노트 쓰기"}</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 110px" }}>
          과목
          <select className="in" name="subject">
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "0 0 150px" }}>
          수업 날짜
          <input className="in" type="date" name="lesson_on" defaultValue={today} required />
        </label>
        <label className="lab" style={{ flex: "2 1 220px" }}>
          제목
          <input className="in" name="title" maxLength={120} placeholder="예: 이차함수의 최대·최소" required />
        </label>
      </div>
      <label className="lab">
        핵심 정리
        <textarea className="in" name="summary" maxLength={4000} rows={4} placeholder="오늘 배운 개념, 공식, 풀이 요령" />
      </label>
      <div className="row">
        <label className="lab" style={{ flex: "1 1 240px" }}>
          숙제
          <textarea className="in" name="homework" maxLength={1000} rows={2} placeholder="예: 교재 p.42~45 문제 풀기" />
        </label>
        <label className="lab" style={{ flex: "1 1 240px" }}>
          다음 수업에 물어볼 것
          <textarea className="in" name="next_questions" maxLength={1000} rows={2} placeholder="이해가 안 된 부분" />
        </label>
      </div>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "저장 중…" : "노트 저장"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
