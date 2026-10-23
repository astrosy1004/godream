"use client";

import { useActionState } from "react";
import { addTask } from "@/app/study-actions";
import { fmtMD } from "@/lib/dates";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export function AddTaskForm({ days, today }: { days: string[]; today: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addTask, {});
  return (
    <form action={action} className="card stack">
      <h2 style={{ margin: 0 }}>할 일 추가</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 110px" }}>
          과목
          <select className="in" name="subject">
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "2 1 220px" }}>
          할 일
          <input className="in" name="title" maxLength={120} placeholder="예: 이차함수 유형 문제 20개" required />
        </label>
        <label className="lab" style={{ flex: "0 0 100px" }}>
          시간(분)
          <select className="in" name="minutes" defaultValue="30">
            {[15, 20, 30, 45, 60, 90].map((m) => <option key={m} value={m}>{m}분</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "0 0 130px" }}>
          날짜
          <select className="in" name="date" defaultValue={days.includes(today) ? today : days[0]}>
            {days.map((d) => <option key={d} value={d}>{fmtMD(d)}</option>)}
          </select>
        </label>
        <button className="btn" disabled={pending}>{pending ? "추가 중…" : "추가"}</button>
      </div>
      {state.error && <p className="err" role="alert">{state.error}</p>}
    </form>
  );
}
