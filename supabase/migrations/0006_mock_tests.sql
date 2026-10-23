-- 고드림 주간 모의 테스트: AI가 만든 문제를 풀고 채점, 틀린 문제는 오답노트로 자동 저장
-- 0001~0005 를 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.mock_tests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  title text not null check (char_length(title) between 1 and 80),
  questions jsonb not null,
  answers jsonb,
  score int check (score is null or score >= 0),
  total int not null check (total between 1 and 30),
  taken_at timestamptz,
  created_at timestamptz not null default now()
);
create index mock_tests_student_idx on public.mock_tests (student_id, created_at desc);

alter table public.mock_tests enable row level security;

create policy mock_select on public.mock_tests for select to authenticated
  using (public.can_view(student_id));
create policy mock_insert on public.mock_tests for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy mock_update on public.mock_tests for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy mock_delete on public.mock_tests for delete to authenticated
  using (student_id = auth.uid());
