-- 고드림 수행평가: 마감일에서 거꾸로 나눈 단계와 단계별 기한
-- 0001~0007 을 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.perf_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  title text not null check (char_length(title) between 1 and 80),
  kind text not null check (kind in ('발표', '보고서', '서술형', '실기')),
  points int not null default 20 check (points between 1 and 100),
  due_on date not null,
  notes text not null default '' check (char_length(notes) <= 500),
  ai_used boolean not null default false, -- AI 단계 생성 횟수 제한용
  created_at timestamptz not null default now()
);
create index perf_tasks_student_idx on public.perf_tasks (student_id, due_on);

create table public.perf_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.perf_tasks (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  by_on date not null,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index perf_steps_task_idx on public.perf_steps (task_id, by_on);

alter table public.perf_tasks enable row level security;
alter table public.perf_steps enable row level security;

create policy perf_select on public.perf_tasks for select to authenticated
  using (public.can_view(student_id));
create policy perf_insert on public.perf_tasks for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy perf_delete on public.perf_tasks for delete to authenticated
  using (student_id = auth.uid());

create policy steps_select on public.perf_steps for select to authenticated
  using (public.can_view(student_id));
-- 단계는 본인 수행평가에만 추가할 수 있다.
create policy steps_insert on public.perf_steps for insert to authenticated
  with check (
    student_id = auth.uid() and public.is_student()
    and exists (select 1 from public.perf_tasks t where t.id = task_id and t.student_id = auth.uid())
  );
create policy steps_update on public.perf_steps for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
revoke update on public.perf_steps from authenticated;
grant update (done_at) on public.perf_steps to authenticated; -- 완료 체크만 바꿀 수 있다
create policy steps_delete on public.perf_steps for delete to authenticated
  using (student_id = auth.uid());
