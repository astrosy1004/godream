-- 공부길: 학부모·선생님 피드백, 웹 푸시 구독, 저녁 알림 발송 기록
-- 0001, 0002 를 실행한 뒤 Supabase SQL Editor 에서 실행하세요.

-- 1. 피드백 (학부모·선생님 → 학생)
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 1000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index feedback_student_idx on public.feedback (student_id, created_at desc);

-- 지금 로그인한 사용자가 target 학생에게 피드백을 쓸 수 있는가 (연결된 학부모·선생님)
create or replace function public.can_give_feedback(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1 from public.links l
    where l.student_id = target and l.member_id = auth.uid()
  );
$$;

-- 학생이 피드백을 읽음으로 표시 (본인 것만)
create or replace function public.mark_feedback_read()
returns void
language sql
security definer
set search_path = public
as $$
  update public.feedback set read_at = now()
   where student_id = auth.uid() and read_at is null;
$$;

revoke all on function public.mark_feedback_read() from public, anon;
grant execute on function public.mark_feedback_read() to authenticated;
grant execute on function public.can_give_feedback(uuid) to authenticated;

alter table public.feedback enable row level security;

-- 학생 본인과, 연결된 학부모·선생님이 읽는다.
create policy feedback_select on public.feedback for select to authenticated
  using (public.can_view(student_id));
-- 쓰기는 연결된 학부모·선생님만 (학생은 쓸 수 없다)
create policy feedback_insert on public.feedback for insert to authenticated
  with check (author_id = auth.uid() and public.can_give_feedback(student_id));
-- 지우기는 작성자만
create policy feedback_delete on public.feedback for delete to authenticated
  using (author_id = auth.uid());

-- 2. 웹 푸시 구독 (기기마다 1행). 본인 것만 다룬다.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;
create policy push_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
create policy push_delete on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- 같은 기기(endpoint)를 다른 계정이 쓰는 경우를 위해, 저장은 함수로 한다 (기존 행을 지우고 현재 계정으로 등록).
create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception '로그인이 필요해요.';
  end if;
  delete from public.push_subscriptions where endpoint = p_endpoint;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth);
end;
$$;
revoke all on function public.save_push_subscription(text, text, text) from public, anon;
grant execute on function public.save_push_subscription(text, text, text) to authenticated;

-- 3. 저녁 알림 발송 기록 (같은 날 중복 발송 방지). 정책이 없으므로 서버(service role)만 접근한다.
create table public.reminder_log (
  student_id uuid not null references public.profiles (id) on delete cascade,
  day date not null,
  kind text not null check (kind in ('todo', 'empty')),
  sent_at timestamptz not null default now(),
  primary key (student_id, day)
);
alter table public.reminder_log enable row level security;
