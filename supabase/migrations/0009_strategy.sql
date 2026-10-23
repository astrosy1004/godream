-- 고드림 과목별 전략: 내 기록 기반 AI 진단 저장 (학생·과목당 1건, 새로 받으면 덮어쓴다)
-- 0001~0008 을 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.strategy_diagnoses (
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  body jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (student_id, subject)
);

alter table public.strategy_diagnoses enable row level security;

create policy diag_select on public.strategy_diagnoses for select to authenticated
  using (public.can_view(student_id));
create policy diag_insert on public.strategy_diagnoses for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy diag_update on public.strategy_diagnoses for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy diag_delete on public.strategy_diagnoses for delete to authenticated
  using (student_id = auth.uid());
