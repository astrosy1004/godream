import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { deleteMockTest } from "@/app/mock-actions";
import { MockForm } from "@/components/MockForm";
import { NoStudent } from "@/components/NoStudent";
import { getViewContext } from "@/lib/auth";
import { addDays, fmtMD, kstDateOf, todayISO, weekStart } from "@/lib/dates";
import { weeklyTrend } from "@/lib/mock";
import { fetchExamScopes, fetchMockTests } from "@/lib/queries";
import { subjectColor } from "@/lib/subjects";

export const metadata: Metadata = { title: "주간 모의 테스트" };
// 문제 만들기(AI)는 시간이 걸릴 수 있어 서버 실행 시간을 늘린다.
export const maxDuration = 60;

export default async function MockPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>주간 모의 테스트</span></h1>
      <p>범위와 내 오답으로 AI가 문제를 만들고, 채점해서 틀린 문제는 오답노트에 자동으로 넣어 줘요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const isStudent = me.role === "student";
  const today = todayISO();
  const [tests, scopes] = await Promise.all([fetchMockTests(student.id), isStudent ? fetchExamScopes(student.id) : Promise.resolve([])]);
  const done = tests.filter((t) => t.taken_at && t.score !== null);
  const trend = weeklyTrend(
    done.map((t) => ({ taken_on: kstDateOf(t.taken_at as string), score: t.score as number, total: t.total })),
    today, 8, weekStart, addDays,
  );
  const thisWeek = trend[trend.length - 1];
  const hasData = trend.some((t) => t.pct !== null);

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 모의 테스트 기록이에요. 읽기만 할 수 있어요.</p>}
      {isStudent && thisWeek.count === 0 && <div className="banner">이번 주 모의 테스트를 아직 안 봤어요. 한 번 풀어 볼까요?</div>}
      {isStudent && (
        <MockForm
          scopes={scopes
            .filter((s) => !s.exam_on || s.exam_on >= today)
            .map((s) => ({ id: s.id, subject: s.subject, label: `${s.subject} · ${s.title}` }))}
        />
      )}

      {hasData && (
        <div className="card">
          <b>주별 평균 정답률</b>
          <div className="trend" role="img" aria-label="최근 8주 모의 테스트 평균 정답률">
            {trend.map((t) => (
              <div key={t.week} className="tw" title={t.pct === null ? "응시 없음" : `${t.pct}% (${t.count}회)`}>
                <div className="tbwrap">{t.pct !== null && <div className="tb" style={{ height: `${Math.max(t.pct, 2)}%` }} />}</div>
                <span className="sm mono">{t.pct === null ? "·" : t.pct}</span>
                <span className="sm muted">{fmtMD(t.week)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tests.length === 0 ? (
        <div className="card soon-card"><p className="muted">아직 만든 테스트가 없어요.</p></div>
      ) : (
        <div className="stack">
          {tests.map((t) => (
            <div key={t.id} className="card row" style={{ alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <i className="sw" style={{ ["--c" as string]: subjectColor(t.subject) }} /> <b>{t.title}</b>
                <div className="sm muted">
                  {t.taken_at ? `${t.score}/${t.total}점 (${Math.round(((t.score ?? 0) / t.total) * 100)}%)` : `${t.total}문제 · 아직 안 풀었어요`}
                </div>
              </div>
              <div className="row" style={{ alignItems: "center" }}>
                <Link className="btn s" href={`/mock/${t.id}`}>{t.taken_at ? "결과 보기" : isStudent ? "풀기" : "보기"}</Link>
                {isStudent && (
                  <form action={deleteMockTest.bind(null, t.id)}>
                    <button className="x" aria-label="테스트 삭제">×</button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
