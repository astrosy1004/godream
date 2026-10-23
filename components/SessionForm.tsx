"use client";

import { useActionState } from "react";
import { addSession } from "@/app/study-actions";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export function SessionForm({ defaultSubject }: { defaultSubject: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(addSession, {});
  return (
    <form action={action} className="card stack">
      <h2 style={{ margin: 0 }}>직접 기록하기</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 100px" }}>
          과목
          <select className="in" name="subject" defaultValue={defaultSubject}>
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "0 0 110px" }}>
          분
          <input className="in" name="minutes" type="number" min={1} max={600} defaultValue={30} required />
        </label>
        <button className="btn" disabled={pending}>{pending ? "저장 중…" : "추가"}</button>
      </div>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      {state.message && <p className="okmsg" role="status">{state.message}</p>}
    </form>
  );
}
