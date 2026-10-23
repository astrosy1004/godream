import { cache } from "react";
import { cookies } from "next/headers";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { LinkedStudent, Profile } from "@/lib/types";

export const STUDENT_COOKIE = "gb_student";

export const getProfile = cache(async (): Promise<Profile | null> => {
  if (!supabaseEnv()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("id, role, name, grade, goal_minutes")
    .eq("id", user.id)
    .maybeSingle();
  return (data as Profile | null) ?? null;
});

export const getLinkedStudents = cache(async (memberId: string): Promise<LinkedStudent[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("links")
    .select("id, relation, student:profiles!links_student_id_fkey(id, role, name, grade, goal_minutes)")
    .eq("member_id", memberId)
    .order("created_at");
  return (data ?? []) as unknown as LinkedStudent[];
});

export interface ViewContext {
  me: Profile;
  /** 지금 화면에서 보고 있는 학생 (학생 본인이거나, 학부모·선생님이 선택한 학생). 없으면 null */
  student: Profile | null;
  /** 학부모·선생님은 학생 기록을 읽기만 한다 */
  readOnly: boolean;
  students: LinkedStudent[];
}

export const getViewContext = cache(async (): Promise<ViewContext | null> => {
  const me = await getProfile();
  if (!me) return null;
  if (me.role === "student") {
    return { me, student: me, readOnly: false, students: [] };
  }
  const students = await getLinkedStudents(me.id);
  const picked = (await cookies()).get(STUDENT_COOKIE)?.value;
  const chosen = students.find((s) => s.student?.id === picked) ?? students[0];
  return { me, student: chosen?.student ?? null, readOnly: true, students };
});
