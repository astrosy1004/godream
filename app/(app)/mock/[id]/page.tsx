import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { TestTaker } from "@/components/TestTaker";
import { getViewContext } from "@/lib/auth";
import { fetchMockTest } from "@/lib/queries";
import { gradeMock } from "@/lib/mock";

export const metadata: Metadata = { title: "모의 테스트" };

export default async function MockTestPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  if (!student) redirect("/mock");
  const { id } = await params;
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) notFound();
  const test = await fetchMockTest(student.id, id);
  if (!test) notFound();
  const isStudent = me.role === "student";
  const back = <Link className="btn quiet s" href="/mock">‹ 목록</Link>;

  // 아직 안 푼 테스트: 정답·해설은 화면으로 보내지 않는다.
  if (!test.taken_at) {
    return (
      <>
        <header className="ph"><h1><span>{test.title}</span></h1><p>{test.total}문제 · 풀고 나면 한 번에 채점해요.</p></header>
        {back}
        {isStudent ? (
          <TestTaker
            id={test.id}
            questions={test.questions.map((q) => ({ type: q.type, question: q.question, choices: q.choices, unit: q.unit }))}
          />
        ) : (
          <div className="card soon-card"><p className="muted">아직 풀지 않은 테스트예요.</p></div>
        )}
      </>
    );
  }

  const { results, score } = gradeMock(test.questions, test.answers ?? []);
  const wrongCount = results.filter((r) => !r.correct).length;
  const pct = Math.round((score / test.total) * 100);
  return (
    <>
      <header className="ph"><h1><span>{test.title}</span></h1><p>결과</p></header>
      {back}
      <div className="card">
        <b style={{ fontSize: 22 }}>{score} / {test.total}점 <span className="muted">({pct}%)</span></b>
        {wrongCount > 0 ? (
          <p className="sm" style={{ margin: "6px 0 0" }}>
            틀린 {wrongCount}문제는 오답노트에 자동으로 저장했어요. 내일부터 복습 목록에 나와요. <Link href="/wrong">오답노트 열기</Link>
          </p>
        ) : (
          <p className="sm" style={{ margin: "6px 0 0" }}>전부 맞혔어요! 🎉</p>
        )}
      </div>
      <div className="stack">
        {test.questions.map((q, i) => {
          const r = results[i];
          return (
            <article key={i} className="card note">
              <div className="nh">
                <h3>{i + 1}번 <span className={"bd" + (r.correct ? "" : " red")}>{r.correct ? "정답" : "오답"}</span></h3>
                {q.unit && <span className="bd">{q.unit}</span>}
              </div>
              <div className="pre">{q.question}</div>
              {q.type === "mc" && (
                <ol className="sm" style={{ margin: 0, paddingLeft: 20 }}>
                  {q.choices.map((c, j) => (
                    <li key={j} style={{ fontWeight: j === q.answer_index ? 700 : 400 }}>{c}{j === q.answer_index && " ✓"}</li>
                  ))}
                </ol>
              )}
              <div className="sm">
                내 답 <b>{r.given || "(비움)"}</b>{!r.correct && <> · 정답 <b>{r.expected}</b></>}
              </div>
              {q.explanation && <div className="sm muted pre">해설: {q.explanation}</div>}
            </article>
          );
        })}
      </div>
      <p className="sm muted">AI가 만든 문제와 해설은 틀릴 수 있어요. 이상하면 교과서·선생님께 확인하세요.</p>
    </>
  );
}
