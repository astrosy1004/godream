-- 공부길 수업 노트: 학생 본인 또는 연결된 선생님이 작성, 학부모는 열람만.
-- 0001_init.sql 을 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  lesson_on date not null,
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 4000),
  homework text not null default '' check (char_length(homework) <= 1000),
  next_questions text not null default '' check (char_length(next_questions) <= 1000),
  homework_done_at timestamptz,
  created_at timestamptz not null default now()
);
create index lesson_notes_student_idx on public.lesson_notes (student_id, lesson_on desc);

-- 지금 로그인한 사용자가 target 학생의 수업 노트를 쓸 수 있는가 (학생 본인, 또는 연결된 선생님)
create or replace function public.can_write_notes(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    (auth.uid() = target and public.is_student())
    or exists (
      select 1 from public.links l
      where l.student_id = target and l.member_id = auth.uid() and l.relation = 'teacher'
    )
  );
$$;

-- 숙제 완료 체크는 해당 학생만 할 수 있다 (선생님이 쓴 노트도 학생이 체크).
create or replace function public.set_homework_done(p_id uuid, p_done boolean)
returns void
language sql
security definer
set search_path = public
as $$
  update public.lesson_notes
     set homework_done_at = case when p_done then now() else null end
   where id = p_id and student_id = auth.uid() and homework <> '';
$$;

revoke all on function public.set_homework_done(uuid, boolean) from public, anon;
grant execute on function public.set_homework_done(uuid, boolean) to authenticated;
grant execute on function public.can_write_notes(uuid) to authenticated;

alter table public.lesson_notes enable row level security;

create policy notes_select on public.lesson_notes for select to authenticated
  using (public.can_view(student_id));

create policy notes_insert on public.lesson_notes for insert to authenticated
  with check (author_id = auth.uid() and public.can_write_notes(student_id));

-- 수정: 작성자만, 내용 칸만 (학생·작성자 지정과 숙제 체크는 바꿀 수 없다)
create policy notes_update on public.lesson_notes for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid() and public.can_write_notes(student_id));
revoke update on public.lesson_notes from authenticated;
grant update (subject, lesson_on, title, summary, homework, next_questions) on public.lesson_notes to authenticated;

-- 삭제: 작성자, 또는 노트의 주인인 학생
create policy notes_delete on public.lesson_notes for delete to authenticated
  using (author_id = auth.uid() or student_id = auth.uid());
