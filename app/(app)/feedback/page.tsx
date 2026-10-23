import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { deleteFeedback } from "@/app/feedback-actions";
import { FeedbackForm } from "@/components/FeedbackForm";
import { MarkRead } from "@/components/MarkRead";
import { NoStudent } from "@/components/NoStudent";
import { getViewContext } from "@/lib/auth";
import { kstDateOf, fmtMD } from "@/lib/dates";
import { fetchFeedback } from "@/lib/queries";
import { ROLE_LABEL } from "@/lib/types";

export const metadata: Metadata = { title: "피드백" };

export default async function FeedbackPage() {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const isStudent = me.role === "student";
  const header = (
    <header className="ph">
      <h1><span>피드백</span></h1>
      <p>{isStudent ? "학부모·선생님이 남긴 응원과 피드백이에요." : "연결된 학생에게 오늘의 피드백을 남겨 주세요."}</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const items = await fetchFeedback(student.id);
  const hasUnread = isStudent && items.some((f) => !f.read_at);

  return (
    <>
      {header}
      {hasUnread && <MarkRead />}
      {!isStudent && <FeedbackForm studentName={student.name} />}
      {items.length === 0 ? (
        <div className="card soon-card"><p className="muted">{isStudent ? "아직 받은 피드백이 없어요." : "아직 남긴 피드백이 없어요."}</p></div>
      ) : (
        <div className="stack">
          {items.map((f) => (
            <article key={f.id} className="card note">
              <div className="nh">
                <h3>
                  {f.author ? `${f.author.name} ${ROLE_LABEL[f.author.role]}` : "연결된 분"}
                  {isStudent && !f.read_at && <span className="bd red">새 글</span>}
                </h3>
                <div className="row" style={{ alignItems: "center", flexWrap: "nowrap" }}>
                  <span className="bd mono">{fmtMD(kstDateOf(f.created_at))}</span>
                  {f.author_id === me.id && (
                    <form action={deleteFeedback.bind(null, f.id)}>
                      <button className="x" aria-label="피드백 삭제">×</button>
                    </form>
                  )}
                </div>
              </div>
              <div className="pre">{f.body}</div>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
