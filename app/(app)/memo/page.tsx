import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ExamCard } from "@/components/ExamCard";
import { ExamForm } from "@/components/ExamForm";
import { NoStudent } from "@/components/NoStudent";
import { getViewContext } from "@/lib/auth";
import { diffDays, todayISO } from "@/lib/dates";
import { fetchExamScopes, signedPhotoUrls } from "@/lib/queries";

export const metadata: Metadata = { title: "시험 범위·암기" };
// AI 암기 가이드(사진 해석)는 시간이 걸릴 수 있어 서버 실행 시간을 늘린다.
export const maxDuration = 60;

export default async function MemoPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>시험 범위·암기</span></h1>
      <p>시험 범위표나 학교 시험지를 올리면 단원별 암기 방법과 복습 일정을 만들어 줘요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const isStudent = me.role === "student";
  const today = todayISO();
  const scopes = await fetchExamScopes(student.id);
  const upcoming = scopes.filter((s) => !s.exam_on || diffDays(s.exam_on, today) >= 0);
  const past = scopes.filter((s) => s.exam_on && diffDays(s.exam_on, today) < 0);
  const urls = await signedPhotoUrls(scopes.flatMap((s) => s.image_paths));
  const card = (s: (typeof scopes)[number]) => (
    <ExamCard key={s.id} scope={s} urls={s.image_paths.map((p) => urls.get(p)).filter((u): u is string => !!u)} canEdit={isStudent} today={today} />
  );

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 시험 범위예요. 읽기만 할 수 있어요.</p>}
      {isStudent && <ExamForm />}
      {upcoming.length === 0 && past.length === 0 ? (
        <div className="card soon-card"><p className="muted">아직 올린 시험 범위가 없어요.</p></div>
      ) : (
        <>
          <div className="stack">{upcoming.map(card)}</div>
          {past.length > 0 && (
            <details>
              <summary className="sm">지난 시험 {past.length}개</summary>
              <div className="stack" style={{ marginTop: 10 }}>{past.map(card)}</div>
            </details>
          )}
        </>
      )}
    </>
  );
}
