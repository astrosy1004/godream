import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LessonCard } from "@/components/LessonCard";
import { LessonForm } from "@/components/LessonForm";
import { NoStudent } from "@/components/NoStudent";
import { getViewContext } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { fetchLessons } from "@/lib/queries";
import { SUBJECTS, isSubject } from "@/lib/subjects";

export const metadata: Metadata = { title: "수업 노트" };

export default async function LessonsPage({ searchParams }: { searchParams: Promise<{ s?: string }> }) {
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student } = ctx;
  const header = (
    <header className="ph">
      <h1><span>수업 노트</span></h1>
      <p>과외·학원 수업 내용을 핵심 정리와 숙제로 남겨 두세요.</p>
    </header>
  );
  if (!student) return <>{header}<NoStudent /></>;

  const sParam = (await searchParams).s ?? "";
  const subject = isSubject(sParam) ? sParam : undefined;
  const notes = await fetchLessons(student.id, subject);
  const isStudent = me.role === "student";
  const canWrite = isStudent || me.role === "teacher";
  const pending = notes.filter((n) => n.homework && !n.homework_done_at);

  return (
    <>
      {header}
      {!isStudent && <p className="sm muted">{student.name} 학생의 노트예요.{me.role === "guardian" ? " 학부모 계정은 읽기만 할 수 있어요." : ""}</p>}
      {canWrite && <LessonForm today={todayISO()} forName={isStudent ? undefined : student.name} />}

      {pending.length > 0 && (
        <div className="card">
          <b>남은 숙제 {pending.length}개</b>
          <ul className="sm" style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {pending.slice(0, 5).map((n) => (
              <li key={n.id}><span className="muted">{n.subject}</span> {n.title} — {n.homework.split("\n")[0].slice(0, 60)}</li>
            ))}
          </ul>
        </div>
      )}

      <nav className="chips" aria-label="과목 필터">
        <Link className="chip" href="/lessons" aria-pressed={!subject}>전체</Link>
        {SUBJECTS.map((s) => (
          <Link key={s.name} className="chip" href={`/lessons?s=${encodeURIComponent(s.name)}`} aria-pressed={subject === s.name}>
            {s.name}
          </Link>
        ))}
      </nav>

      {notes.length === 0 ? (
        <div className="card soon-card"><p className="muted">{subject ? `${subject} 노트가 아직 없어요.` : "아직 수업 노트가 없어요."}</p></div>
      ) : (
        <div className="stack">
          {notes.map((n) => (
            <LessonCard
              key={n.id}
              note={n}
              canCheckHomework={isStudent}
              canDelete={isStudent || n.author_id === me.id}
            />
          ))}
        </div>
      )}
    </>
  );
}
