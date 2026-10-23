"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/app/actions";
import { Brand } from "@/components/Brand";
import type { FormState } from "@/lib/types";

export default function LoginPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <div className="card">
      <Brand />
      <h1>로그인</h1>
      <form action={action} className="stack">
        <label className="lab">
          이메일
          <input className="in" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="lab">
          비밀번호
          <input className="in" name="password" type="password" autoComplete="current-password" required />
        </label>
        {state.error && <p className="err" role="alert">{state.error}</p>}
        <button className="btn" disabled={pending}>{pending ? "로그인 중…" : "로그인"}</button>
      </form>
      <p className="sm muted">
        처음이신가요? <Link href="/signup">가입하기</Link>
      </p>
    </div>
  );
}
