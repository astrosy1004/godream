-- 고드림 시험 대비: 시험(날짜) + 단원별 3단계 진행도(개념 → 문제풀이 → 오답복습)
-- 0001~0006 을 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.exams (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  exam_on date not null,
  created_at timestamptz not null default now()
);
create index exams_student_idx on public.exams (student_id, exam_on);

create table public.exam_units (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  title text not null check (char_length(title) between 1 and 80),
  stage int not null default 0 check (stage between 0 and 3), -- 0 미시작, 1 개념, 2 문제풀이, 3 오답복습 완료
  created_at timestamptz not null default now()
);
create index exam_units_exam_idx on public.exam_units (exam_id);

alter table public.exams enable row level security;
alter table public.exam_units enable row level security;

create policy exams_select on public.exams for select to authenticated
  using (public.can_view(student_id));
create policy exams_insert on public.exams for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy exams_delete on public.exams for delete to authenticated
  using (student_id = auth.uid());

create policy units_select on public.exam_units for select to authenticated
  using (public.can_view(student_id));
-- 단원은 본인 시험에만 추가할 수 있다.
create policy units_insert on public.exam_units for insert to authenticated
  with check (
    student_id = auth.uid() and public.is_student()
    and exists (select 1 from public.exams e where e.id = exam_id and e.student_id = auth.uid())
  );
create policy units_update on public.exam_units for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
revoke update on public.exam_units from authenticated;
grant update (stage) on public.exam_units to authenticated; -- 진행도만 바꿀 수 있다
create policy units_delete on public.exam_units for delete to authenticated
  using (student_id = auth.uid());
