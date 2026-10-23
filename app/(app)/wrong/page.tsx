import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NoStudent } from "@/components/NoStudent";
import { WrongCard } from "@/components/WrongCard";
import { WrongForm } from "@/components/WrongForm";
import { getViewContext } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { fetchWrongNotes, signedPhotoUrls } from "@/lib/queries";
import { SUBJECTS, isSubject } from "@/lib/subjects";

export const metadata: Metadata = { title: "오답노트" };
// AI 분석(사진 해석)은 시간이 걸릴 수 있어 서버 실행 시간을 늘린다.
export const maxDuration = 60;

export default async function WrongPage({ searchParams }: { searchParams: Promise<{ s?: string; f?: string }> }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>오답노트</span></h1>
      <p>틀린 문제를 사진으로 남기고, AI 분석과 간격 복습(1→3→7→14일)으로 끝까지 잡아요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const sp = await searchParams;
  const subject = sp.s && isSubject(sp.s) ? sp.s : undefined;
  const filter = sp.f === "all" || sp.f === "done" ? sp.f : "todo";
  const isStudent = me.role === "student";
  const today = todayISO();

  const all = await fetchWrongNotes(student.id, subject);
  const due = all.filter((n) => !n.mastered_at && n.next_review_on && n.next_review_on <= today);
  const shown = all.filter((n) => (filter === "all" ? true : filter === "done" ? !!n.mastered_at : !n.mastered_at));
  const urls = await signedPhotoUrls(shown.map((n) => n.image_path).filter((p): p is string => !!p));

  const href = (s?: string, f?: string) => {
    const q = new URLSearchParams();
    if (s) q.set("s", s);
    if (f && f !== "todo") q.set("f", f);
    const qs = q.toString();
    return qs ? `/wrong?${qs}` : "/wrong";
  };

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 오답노트예요. 읽기만 할 수 있어요.</p>}
      {isStudent && <WrongForm />}

      {due.length > 0 && (
        <div className="card">
          <b>오늘 복습할 오답 {due.length}개</b>
          <p className="sm muted" style={{ margin: "4px 0 0" }}>아래 카드에서 문제를 다시 풀어 보고 ‘기억났어요’ 또는 ‘또 헷갈렸어요’를 눌러 주세요.</p>
        </div>
      )}

      <nav className="chips" aria-label="과목 필터">
        <Link className="chip" href={href(undefined, filter)} aria-pressed={!subject}>전체 과목</Link>
        {SUBJECTS.map((s) => (
          <Link key={s.name} className="chip" href={href(s.name, filter)} aria-pressed={subject === s.name}>{s.name}</Link>
        ))}
      </nav>
      <nav className="chips" aria-label="상태 필터">
        <Link className="chip" href={href(subject, "todo")} aria-pressed={filter === "todo"}>복습 중</Link>
        <Link className="chip" href={href(subject, "done")} aria-pressed={filter === "done"}>정복</Link>
        <Link className="chip" href={href(subject, "all")} aria-pressed={filter === "all"}>모두</Link>
      </nav>

      {shown.length === 0 ? (
        <div className="card soon-card"><p className="muted">표시할 오답이 없어요.</p></div>
      ) : (
        <div className="stack">
          {shown.map((n) => (
            <WrongCard key={n.id} note={n} photoUrl={n.image_path ? urls.get(n.image_path) : undefined} canEdit={isStudent} today={today} />
          ))}
        </div>
      )}
    </>
  );
}
