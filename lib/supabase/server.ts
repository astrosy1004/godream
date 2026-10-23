import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

/** 서버 컴포넌트·서버 액션용 클라이언트. 호출 전에 supabaseEnv() 가 null 이 아닌지 확인한다. */
export async function createClient() {
  const env = supabaseEnv();
  if (!env) throw new Error("Supabase 환경 변수가 설정되지 않았습니다.");
  const cookieStore = await cookies();
  return createServerClient(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // 서버 컴포넌트에서 호출되면 쿠키를 쓸 수 없다. proxy 가 세션을 갱신하므로 무시해도 된다.
        }
      },
    },
  });
}
