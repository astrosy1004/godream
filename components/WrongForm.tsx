"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addWrongNote } from "@/app/wrong-actions";
import { shrinkImage } from "@/lib/image";
import { SUBJECTS } from "@/lib/subjects";
import { REASONS } from "@/lib/wrong";
import type { FormState } from "@/lib/types";

export function WrongForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addWrongNote, {});
  const ref = useRef<HTMLFormElement>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoErr, setPhotoErr] = useState("");

  useEffect(() => {
    if (state.message) {
      ref.current?.reset();
      setBlob(null);
      setPreview(null);
    }
  }, [state]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setPhotoErr("");
    if (!f) { setBlob(null); setPreview(null); return; }
    try {
      const b = await shrinkImage(f);
      setBlob(b);
      setPreview(URL.createObjectURL(b));
    } catch {
      setBlob(null);
      setPreview(null);
      setPhotoErr("사진을 읽지 못했어요. JPG나 PNG 사진으로 올려 주세요.");
      e.target.value = "";
    }
  }

  return (
    <form
      ref={ref}
      className="card stack"
      action={(fd) => {
        fd.delete("photo");
        if (blob) fd.set("photo", blob, "photo.jpg");
        action(fd);
      }}
    >
      <h2 style={{ margin: 0 }}>오답 올리기</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 110px" }}>
          과목
          <select className="in" name="subject">
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "1 1 160px" }}>
          단원 (선택)
          <input className="in" name="unit" maxLength={60} placeholder="예: 이차함수" />
        </label>
        <label className="lab" style={{ flex: "1 1 200px" }}>
          틀린 이유
          <select className="in" name="reason" defaultValue="concept">
            {REASONS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
          </select>
        </label>
      </div>
      <label className="lab">
        문제 사진
        <input className="in" type="file" accept="image/*" capture="environment" onChange={onPick} />
      </label>
      {preview && <img className="wimg" src={preview} alt="올릴 문제 사진 미리보기" />}
      {photoErr && <p className="err" role="alert">{photoErr}</p>}
      <label className="lab">
        문제 내용 (사진이 없으면 꼭 적어 주세요)
        <textarea className="in" name="question_text" maxLength={1000} rows={2} />
      </label>
      <div className="row">
        <label className="lab" style={{ flex: "1 1 200px" }}>
          내가 쓴 답
          <input className="in" name="my_answer" maxLength={200} />
        </label>
        <label className="lab" style={{ flex: "1 1 200px" }}>
          정답
          <input className="in" name="correct_answer" maxLength={200} />
        </label>
      </div>
      <label className="lab">
        메모 (선택)
        <input className="in" name="memo" maxLength={500} placeholder="예: 부호를 빼먹었어요" />
      </label>
      <p className="sm muted">AI 분석을 누르면 사진과 입력한 글이 OpenAI로 전송돼요. 이름·학교 등 개인정보가 사진에 나오지 않게 해 주세요.</p>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "저장 중…" : "오답 저장"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
