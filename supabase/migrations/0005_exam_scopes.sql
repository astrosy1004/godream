-- 공부길 시험 범위·암기: 시험 범위(글·사진) + AI 암기 가이드 + 학습 계획으로 보내기
-- 0001~0004 를 실행한 뒤 Supabase SQL Editor 에서 실행하세요.
-- 사진은 오답노트와 같은 비공개 저장소(wrong-notes)의 '<학생 id>/exam/' 폴더를 쓴다.

create table public.exam_scopes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  title text not null check (char_length(title) between 1 and 60),
  exam_on date,
  scope_text text not null default '' check (char_length(scope_text) <= 2000),
  image_paths text[] not null default '{}' check (cardinality(image_paths) <= 3),
  ai_plan jsonb,
  analyzed_at timestamptz,
  plan_added_at timestamptz,
  created_at timestamptz not null default now()
);
create index exam_scopes_student_idx on public.exam_scopes (student_id, exam_on);

alter table public.exam_scopes enable row level security;

create policy exam_select on public.exam_scopes for select to authenticated
  using (public.can_view(student_id));
create policy exam_insert on public.exam_scopes for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy exam_update on public.exam_scopes for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy exam_delete on public.exam_scopes for delete to authenticated
  using (student_id = auth.uid());
