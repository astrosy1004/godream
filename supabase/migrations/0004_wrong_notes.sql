-- 고드림 오답노트: 사진(비공개 저장소) + 틀린 이유 + AI 분석 + 간격 복습
-- 0001~0003 을 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

create table public.wrong_notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  unit text not null default '' check (char_length(unit) <= 60),
  question_text text not null default '' check (char_length(question_text) <= 1000),
  my_answer text not null default '' check (char_length(my_answer) <= 200),
  correct_answer text not null default '' check (char_length(correct_answer) <= 200),
  reason text not null default 'etc' check (reason in ('concept', 'mistake', 'time', 'misread', 'etc')),
  memo text not null default '' check (char_length(memo) <= 500),
  image_path text,
  ai_analysis jsonb,
  analyzed_at timestamptz,
  review_count int not null default 0 check (review_count between 0 and 10),
  next_review_on date,
  mastered_at timestamptz,
  created_at timestamptz not null default now()
);
create index wrong_notes_student_idx on public.wrong_notes (student_id, created_at desc);
create index wrong_notes_review_idx on public.wrong_notes (student_id, next_review_on) where mastered_at is null;

alter table public.wrong_notes enable row level security;

create policy wrong_select on public.wrong_notes for select to authenticated
  using (public.can_view(student_id));
create policy wrong_insert on public.wrong_notes for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy wrong_update on public.wrong_notes for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy wrong_delete on public.wrong_notes for delete to authenticated
  using (student_id = auth.uid());

-- 사진 저장소: 비공개. 파일 경로는 '<학생 id>/<파일명>' 형태이고, 첫 폴더가 학생 id 이다.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('wrong-notes', 'wrong-notes', false, 4194304, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- 본인 폴더에만 올리고 지울 수 있다. 읽기는 본인과 연결된 학부모·선생님.
create policy wrong_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'wrong-notes' and (storage.foldername(name))[1] = auth.uid()::text and public.is_student());
create policy wrong_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'wrong-notes' and (storage.foldername(name))[1] = auth.uid()::text);
create policy wrong_files_select on storage.objects for select to authenticated
  using (
    bucket_id = 'wrong-notes'
    and (storage.foldername(name))[1] ~ '^[0-9a-fA-F-]{36}$'
    and public.can_view(((storage.foldername(name))[1])::uuid)
  );
