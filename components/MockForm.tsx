"use client";

import { useActionState, useState } from "react";
import { createMockTest } from "@/app/mock-actions";
import { COUNTS } from "@/lib/mock";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export interface ScopeOption {
  id: string;
  label: string;
  subject: string;
}

export function MockForm({ scopes }: { scopes: ScopeOption[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createMockTest, {});
  const [subject, setSubject] = useState<string>(SUBJECTS[0].name);
  const [scopeId, setScopeId] = useState("");

  function pickScope(id: string) {
    setScopeId(id);
    const s = scopes.find((x) => x.id === id);
    if (s) setSubject(s.subject);
  }

  return (
    <form action={action} className="card stack">
      <h2 style={{ margin: 0 }}>이번 주 모의 테스트 만들기</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 110px" }}>
          과목
          <select className="in" name="subject" value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!!scopeId}>
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
          {scopeId && <input type="hidden" name="subject" value={subject} />}
        </label>
        <label className="lab" style={{ flex: "0 0 110px" }}>
          문제 수
          <select className="in" name="count" defaultValue="10">
            {COUNTS.map((c) => <option key={c} value={c}>{c}문제</option>)}
          </select>
        </label>
        {scopes.length > 0 && (
          <label className="lab" style={{ flex: "1 1 220px" }}>
            올려 둔 시험 범위 (선택)
            <select className="in" name="scope_id" value={scopeId} onChange={(e) => pickScope(e.target.value)}>
              <option value="">직접 적을게요</option>
              {scopes.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </label>
        )}
      </div>
      <label className="lab">
        범위를 더 적고 싶다면 (선택)
        <input className="in" name="scope_text" maxLength={500} placeholder="예: 3단원 힘과 운동, 4단원 일과 에너지" />
      </label>
      <label className="chk">
        <input type="checkbox" name="include_wrong" defaultChecked /> 내 오답노트의 약한 부분을 문제에 반영해요
      </label>
      <p className="sm muted">문제는 AI가 만들어서 틀릴 수 있어요. 이상한 문제는 건너뛰고 교과서로 확인하세요. 입력한 범위와 오답 글은 OpenAI로 전송돼요.</p>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "문제 만드는 중… (20~50초)" : "테스트 만들기"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
