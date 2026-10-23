import { Brand } from "./Brand";

export function SetupNeeded() {
  return (
    <main className="auth">
      <div className="card">
        <Brand />
        <h1>Supabase 연결이 필요해요</h1>
        <p className="muted">
          환경 변수 <code>NEXT_PUBLIC_SUPABASE_URL</code> 과 <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 가 아직 설정되지 않았어요.
          README의 “Supabase 설정” 순서대로 프로젝트를 만들고 값을 넣은 뒤 다시 배포해 주세요.
        </p>
      </div>
    </main>
  );
}
