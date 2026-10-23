"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { addExamScope } from "@/app/exam-actions";
import { shrinkImage } from "@/lib/image";
import { SUBJECTS } from "@/lib/subjects";
import type { FormState } from "@/lib/types";

export function ExamForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(addExamScope, {});
  const ref = useRef<HTMLFormElement>(null);
  const [blobs, setBlobs] = useState<Blob[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photoErr, setPhotoErr] = useState("");

  useEffect(() => {
    if (state.message) {
      ref.current?.reset();
      setBlobs([]);
      setPreviews([]);
    }
  }, [state]);
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, 3);
    setPhotoErr("");
    if (files.length === 0) { setBlobs([]); setPreviews([]); return; }
    try {
      const out = await Promise.all(files.map(shrinkImage));
      setBlobs(out);
      setPreviews(out.map((b) => URL.createObjectURL(b)));
    } catch {
      setBlobs([]);
      setPreviews([]);
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
        blobs.forEach((b, i) => fd.append("photo", b, `scope${i}.jpg`));
        action(fd);
      }}
    >
      <h2 style={{ margin: 0 }}>시험 범위 올리기</h2>
      <div className="row">
        <label className="lab" style={{ flex: "0 0 110px" }}>
          과목
          <select className="in" name="subject">
            {SUBJECTS.map((s) => <option key={s.name}>{s.name}</option>)}
          </select>
        </label>
        <label className="lab" style={{ flex: "1 1 200px" }}>
          시험 이름
          <input className="in" name="title" maxLength={60} placeholder="예: 2학기 중간고사" required />
        </label>
        <label className="lab" style={{ flex: "0 0 160px" }}>
          시험 날짜 (선택)
          <input className="in" type="date" name="exam_on" />
        </label>
      </div>
      <label className="lab">
        시험 범위표·학교 시험지 사진 (최대 3장)
        <input className="in" type="file" accept="image/*" multiple onChange={onPick} />
      </label>
      {previews.length > 0 && (
        <div className="row">
          {previews.map((u, i) => <img key={u} className="thumb" src={u} alt={`올릴 사진 ${i + 1}`} />)}
        </div>
      )}
      {photoErr && <p className="err" role="alert">{photoErr}</p>}
      <label className="lab">
        시험 범위 (사진이 없으면 꼭 적어 주세요)
        <textarea className="in" name="scope_text" maxLength={2000} rows={3} placeholder="예: 교과서 p.40~78, 3단원 힘과 운동, 4단원 일과 에너지" />
      </label>
      <p className="sm muted">AI 가이드를 만들면 사진과 입력한 글이 OpenAI로 전송돼요. 이름·학교 등 개인정보가 사진에 나오지 않게 해 주세요.</p>
      <div className="row" style={{ alignItems: "center" }}>
        <button className="btn" disabled={pending}>{pending ? "저장 중…" : "시험 범위 저장"}</button>
        {state.error && <span className="err" role="alert">{state.error}</span>}
        {state.message && <span className="okmsg" role="status">{state.message}</span>}
      </div>
    </form>
  );
}
