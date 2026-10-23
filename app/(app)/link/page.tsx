import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { unlink } from "@/app/actions";
import { InviteMaker, RedeemForm } from "@/components/LinkForms";
import { getLinkedStudents, getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ROLE_LABEL, type LinkedMember } from "@/lib/types";

export const metadata: Metadata = { title: "연결 관리" };
export const dynamic = "force-dynamic";

export default async function LinkPage() {
  const me = await getProfile();
  if (!me) redirect("/login");

  if (me.role === "student") {
    const supabase = await createClient();
    const { data } = await supabase
      .from("links")
      .select("id, relation, member:profiles!links_member_id_fkey(id, name)")
      .eq("student_id", me.id)
      .order("created_at");
    const members = (data ?? []) as unknown as LinkedMember[];
    return (
      <>
        <header className="ph">
          <h1><span>연결 관리</span></h1>
          <p>학부모·선생님과 연결하면 내 학습 현황을 함께 볼 수 있어요. 언제든 연결을 끊을 수 있어요.</p>
        </header>
        <section className="card stack">
          <h2 style={{ margin: 0 }}>초대 코드</h2>
          <p className="muted sm">코드를 만들어 학부모·선생님에게 알려 주세요. 코드는 24시간 동안 한 번만 쓸 수 있어요.</p>
          <InviteMaker />
        </section>
        <section className="card">
          <h2>연결된 사람</h2>
          {members.length ? (
            members.map((m) => (
              <div className="todo" key={m.id}>
                <div className="tt"><b>{m.member?.name ?? "알 수 없음"}</b> <span className="bd">{m.relation === "guardian" ? "학부모" : "선생님"}</span></div>
                <form action={unlink.bind(null, m.id)}>
                  <button className="btn quiet s">연결 끊기</button>
                </form>
              </div>
            ))
          ) : (
            <p className="muted">아직 연결된 사람이 없어요.</p>
          )}
        </section>
      </>
    );
  }

  const students = await getLinkedStudents(me.id);
  return (
    <>
      <header className="ph">
        <h1><span>연결 관리</span></h1>
        <p>{ROLE_LABEL[me.role]} 계정은 학생이 만든 초대 코드를 입력해 연결해요.</p>
      </header>
      <section className="card stack">
        <h2 style={{ margin: 0 }}>초대 코드 입력</h2>
        <RedeemForm />
      </section>
      <section className="card">
        <h2>연결된 학생</h2>
        {students.length ? (
          students.map((s) => (
            <div className="todo" key={s.id}>
              <div className="tt"><b>{s.student?.name ?? "알 수 없음"}</b> <span className="sm muted">{s.student?.grade}</span></div>
              <form action={unlink.bind(null, s.id)}>
                <button className="btn quiet s">연결 끊기</button>
              </form>
            </div>
          ))
        ) : (
          <p className="muted">아직 연결된 학생이 없어요.</p>
        )}
      </section>
    </>
  );
}
