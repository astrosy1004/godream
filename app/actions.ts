"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STUDENT_COOKIE } from "@/lib/auth";
import type { FormState } from "@/lib/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function str(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

/* ---------- 인증 ---------- */

export async function signIn(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email");
  const password = str(fd, "password");
  if (!EMAIL_RE.test(email) || !password) return { error: "이메일과 비밀번호를 입력해 주세요." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "이메일 또는 비밀번호가 맞지 않아요." };
  redirect("/dashboard");
}

export async function signUp(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email");
  const password = String(fd.get("password") ?? "");
  const name = str(fd, "name");
  const role = str(fd, "role");
  const grade = str(fd, "grade");
  if (!EMAIL_RE.test(email)) return { error: "이메일 형식을 확인해 주세요." };
  if (password.length < 8) return { error: "비밀번호는 8자 이상이어야 해요." };
  if (name.length < 1 || name.length > 40) return { error: "이름을 1~40자로 입력해 주세요." };
  if (!["student", "guardian", "teacher"].includes(role)) return { error: "역할을 선택해 주세요." };
  if (fd.get("agree") !== "on") return { error: "안내에 동의해 주세요." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, name, grade: role === "student" ? grade : "" } },
  });
  if (error) {
    return { error: error.message.toLowerCase().includes("already") ? "이미 가입된 이메일이에요." : "가입하지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  }
  if (!data.session) {
    return { message: "확인 메일을 보냈어요. 메일의 링크를 누른 뒤 로그인해 주세요." };
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  (await cookies()).delete(STUDENT_COOKIE);
  redirect("/login");
}

/* ---------- 연결 ---------- */

export async function selectStudent(studentId: string) {
  (await cookies()).set(STUDENT_COOKIE, studentId, { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  revalidatePath("/", "layout");
}

export async function createInvite(_prev: FormState): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_invite");
  if (error || typeof data !== "string") return { error: "코드를 만들지 못했어요. 잠시 뒤 다시 시도해 주세요." };
  return { code: data, message: "24시간 안에 학부모·선생님이 입력해야 해요." };
}

export async function redeemInvite(_prev: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, "code").toUpperCase();
  if (code.length < 6) return { error: "초대 코드를 입력해 주세요." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("redeem_invite", { p_code: code });
  if (error) return { error: error.message.includes("코드") ? error.message : "연결하지 못했어요. 코드를 다시 확인해 주세요." };
  (await cookies()).set(STUDENT_COOKIE, String(data), { path: "/", httpOnly: true, sameSite: "lax", maxAge: 60 * 60 * 24 * 90 });
  revalidatePath("/", "layout");
  return { message: "연결됐어요. 대시보드에서 학생의 기록을 볼 수 있어요." };
}

export async function unlink(linkId: string) {
  const supabase = await createClient();
  await supabase.from("links").delete().eq("id", linkId);
  revalidatePath("/", "layout");
}
