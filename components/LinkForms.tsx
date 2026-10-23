"use client";

import { useActionState } from "react";
import { createInvite, redeemInvite } from "@/app/actions";
import type { FormState } from "@/lib/types";

export function InviteMaker() {
  const [state, action, pending] = useActionState<FormState, FormData>((prev) => createInvite(prev), {});
  return (
    <form action={action} className="stack">
      <div>
        <button className="btn" disabled={pending}>{pending ? "만드는 중…" : "초대 코드 만들기"}</button>
      </div>
      {state.code && (
        <div className="q" role="status">
          <div className="code">{state.code}</div>
          <p className="sm muted">{state.message} 화면을 벗어나면 코드가 다시 보이지 않으니 지금 전달해 주세요.</p>
        </div>
      )}
      {state.error && <p className="err" role="alert">{state.error}</p>}
    </form>
  );
}

export function RedeemForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(redeemInvite, {});
  return (
    <form action={action} className="stack">
      <div className="row">
        <label className="lab" style={{ flex: "0 0 200px" }}>
          초대 코드
          <input className="in mono" name="code" maxLength={8} autoCapitalize="characters" autoComplete="off" placeholder="예: K7M2QX9A" required />
        </label>
        <button className="btn" disabled={pending}>{pending ? "연결 중…" : "연결하기"}</button>
      </div>
      {state.error && <p className="err" role="alert">{state.error}</p>}
      {state.message && <p className="okmsg" role="status">{state.message}</p>}
    </form>
  );
}
