"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signUp } from "@/app/actions";
import { Brand } from "@/components/Brand";
import type { FormState } from "@/lib/types";

export default function SignupPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  const [role, setRole] = useState("student");
  return (
    <div className="card">
      <Brand />
      <h1>가입하기</h1>
      <form action={action} className="stack">
        <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="sm muted" style={{ marginBottom: 6 }}>나는</legend>
          <div className="seg2">
            {[
              ["student", "학생"],
              ["guardian", "학부모"],
              ["teacher", "선생님"],
            ].map(([v, l]) => (
              <label key={v}>
                <input type="radio" name="role" value={v} checked={role === v} onChange={() => setRole(v)} />
                {l}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="lab">
          이름
          <input className="in" name="name" maxLength={40} required />
        </label>
        {role === "student" && (
          <label className="lab">
            학년
            <select className="in" name="grade" defaultValue="고1">
              {["중1", "중2", "중3", "고1", "고2", "고3"].map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
        )}
        <label className="lab">
          이메일
          <input className="in" name="email" type="email" autoComplete="email" required />
        </label>
        <label className="lab">
          비밀번호 (8자 이상)
          <input className="in" name="password" type="password" autoComplete="new-password" minLength={8} required />
        </label>
        <label className="chk">
          <input type="checkbox" name="agree" />
          <span>만 14세 이상이며, 학습 기록이 서비스 제공을 위해 저장되는 것에 동의해요. (베타 안내 문구이며 정식 출시 전에 이용약관·개인정보 처리방침으로 교체됩니다.)</span>
        </label>
        {state.error && <p className="err" role="alert">{state.error}</p>}
        {state.message && <p className="okmsg" role="status">{state.message}</p>}
        <button className="btn" disabled={pending}>{pending ? "가입 중…" : "가입하기"}</button>
      </form>
      <p className="sm muted">
        이미 계정이 있나요? <Link href="/login">로그인</Link>
      </p>
    </div>
  );
}
