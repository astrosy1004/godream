import Link from "next/link";
import { redirect } from "next/navigation";
import { selectStudent, signOut } from "@/app/actions";
import { Brand } from "@/components/Brand";
import { NightlyPopup } from "@/components/NightlyPopup";
import { PushToggle } from "@/components/PushToggle";
import { NavLinks, type NavGroup } from "@/components/NavLinks";
import { SetupNeeded } from "@/components/SetupNeeded";
import { getViewContext } from "@/lib/auth";
import { fmtMinutes, todayISO } from "@/lib/dates";
import { countUnreadFeedback, fetchSessions, fetchTasks } from "@/lib/queries";
import { fetchDayStatuses } from "@/lib/today-status";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { ROLE_LABEL } from "@/lib/types";

// 로그인 상태에 따라 내용이 달라지므로 항상 요청 시점에 렌더링한다.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnv()) return <SetupNeeded />;
  const ctx = await getViewContext();
  if (!ctx) redirect("/login");
  const { me, student, students } = ctx;

  const today = todayISO();
  let left = 0;
  let minutes = 0;
  let unread = 0;
  let nightlyStatus = null;
  if (me.role === "student") {
    const [statuses, count] = await Promise.all([fetchDayStatuses(await createClient(), [me.id], today), countUnreadFeedback(me.id)]);
    nightlyStatus = statuses.get(me.id) ?? null;
    unread = count;
  }
  if (student) {
    const [tasks, sessions] = await Promise.all([fetchTasks(student.id, today, today), fetchSessions(student.id, today, today)]);
    left = tasks.filter((t) => !t.done_at).length;
    minutes = sessions.reduce((a, s) => a + s.minutes, 0);
  }

  const groups: NavGroup[] = [
    {
      group: "홈",
      items: [
        { href: "/dashboard", label: "대시보드" },
        { href: "/feedback", label: "피드백", badge: unread ? `새 글 ${unread}` : undefined },
      ],
    },
    {
      group: "계획",
      items: [
        { href: "/plan", label: "학습 계획", badge: left ? `오늘 ${left}` : undefined },
        { href: "/timer", label: "혼공 타이머", badge: minutes ? fmtMinutes(minutes) : undefined },
      ],
    },
    { group: "정리", items: [{ href: "/lessons", label: "수업 노트" }, { href: "/wrong", label: "오답노트", soon: true }] },
    {
      group: "시험",
      items: [
        { href: "/memo", label: "시험 범위·암기", soon: true },
        { href: "/mock", label: "주간 모의 테스트", soon: true },
        { href: "/exam", label: "시험 대비", soon: true },
        { href: "/perf", label: "수행평가", soon: true },
      ],
    },
    { group: "전략", items: [{ href: "/strategy", label: "과목별 전략", soon: true }] },
  ];

  return (
    <div className="shell">
      <aside className="side">
        <Brand />
        <div className="me">
          <div>
            <b>{me.name}</b> <span className="bd">{ROLE_LABEL[me.role]}</span>
          </div>
          {me.role !== "student" && (
            <div className="chips" aria-label="학생 선택">
              {students.map((s) =>
                s.student ? (
                  <form key={s.id} action={selectStudent.bind(null, s.student.id)}>
                    <button className="chip" aria-pressed={student?.id === s.student.id}>{s.student.name}</button>
                  </form>
                ) : null,
              )}
              {students.length === 0 && <span className="sm muted">연결된 학생이 없어요</span>}
            </div>
          )}
          {me.role === "student" && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && (
            <PushToggle vapidKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY} />
          )}
          <div className="row" style={{ gap: 12 }}>
            <Link href="/link" className="sm">연결 관리</Link>
            <form action={signOut}>
              <button className="linkbtn">로그아웃</button>
            </form>
          </div>
        </div>
        <nav className="nav" aria-label="메뉴">
          <NavLinks groups={groups} />
        </nav>
      </aside>
      <main className="main">{children}</main>
      {nightlyStatus && <NightlyPopup status={nightlyStatus} date={today} />}
    </div>
  );
}
