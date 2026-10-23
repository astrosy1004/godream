-- 고드림 1단계 스키마: 계정, 학생-학부모/선생님 연결, 학습 계획, 공부 기록, 타이머
-- Supabase 대시보드 > SQL Editor 에 붙여 넣어 실행하세요.

create extension if not exists pgcrypto;

create type public.user_role as enum ('student', 'guardian', 'teacher');

-- 1. 프로필 (auth.users 와 1:1)
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null,
  name text not null check (char_length(name) between 1 and 40),
  grade text check (grade is null or char_length(grade) <= 10),
  goal_minutes int not null default 240 check (goal_minutes between 30 and 960),
  created_at timestamptz not null default now()
);

-- 2. 학생과 학부모·선생님의 연결
create table public.links (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  relation text not null check (relation in ('guardian', 'teacher')),
  created_at timestamptz not null default now(),
  unique (student_id, member_id),
  check (student_id <> member_id)
);
create index links_member_idx on public.links (member_id);

-- 3. 초대 코드 (학생이 만들고, 학부모·선생님이 입력)
create table public.invite_codes (
  code text primary key,
  student_id uuid not null references public.profiles (id) on delete cascade,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

-- 4. 공부 기록
create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  minutes int not null check (minutes between 1 and 720),
  studied_on date not null,
  created_at timestamptz not null default now()
);
create index study_sessions_student_day_idx on public.study_sessions (student_id, studied_on);

-- 5. 학습 계획
create table public.plan_tasks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  task_date date not null,
  subject text not null check (subject in ('국어', '수학', '영어', '과학', '사회')),
  title text not null check (char_length(title) between 1 and 120),
  minutes int not null default 30 check (minutes between 5 and 600),
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index plan_tasks_student_day_idx on public.plan_tasks (student_id, task_date);

-- 6. 타이머 (학생당 1행). 경과 시간은 항상 서버 시각으로 계산한다.
create table public.timers (
  student_id uuid primary key references public.profiles (id) on delete cascade,
  subject text not null default '수학' check (subject in ('국어', '수학', '영어', '과학', '사회')),
  started_at timestamptz,
  acc_ms bigint not null default 0 check (acc_ms >= 0),
  pomodoro boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ---------- 도우미 함수 ----------

-- 지금 로그인한 사용자가 target 학생의 기록을 볼 수 있는가 (본인 또는 연결된 학부모·선생님)
create or replace function public.can_view(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    auth.uid() = target
    or exists (
      select 1 from public.links l
      where l.student_id = target and l.member_id = auth.uid()
    )
  );
$$;

create or replace function public.is_student()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'student');
$$;

-- 가입 시 프로필을 자동 생성 (가입 폼의 메타데이터 사용)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  r text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
begin
  if r not in ('student', 'guardian', 'teacher') then
    r := 'student';
  end if;
  insert into public.profiles (id, role, name, grade)
  values (
    new.id,
    r::public.user_role,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 40),
    nullif(left(trim(coalesce(new.raw_user_meta_data ->> 'grade', '')), 10), '')
  );
  if r = 'student' then
    insert into public.timers (student_id) values (new.id);
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 학생이 초대 코드를 만든다 (24시간 유효, 이전 코드는 삭제)
create or replace function public.create_invite()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  c text;
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  i int;
begin
  if not public.is_student() then
    raise exception '학생 계정만 초대 코드를 만들 수 있어요.';
  end if;
  delete from public.invite_codes where student_id = auth.uid();
  loop
    c := '';
    for i in 1..8 loop
      c := c || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    begin
      insert into public.invite_codes (code, student_id, expires_at)
      values (c, auth.uid(), now() + interval '24 hours');
      return c;
    exception when unique_violation then
      -- 드물게 코드가 겹치면 다시 만든다
    end;
  end loop;
end;
$$;

-- 학부모·선생님이 초대 코드를 입력해 학생과 연결한다. 연결된 학생 id 를 돌려준다.
create or replace function public.redeem_invite(p_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
  inv public.invite_codes;
begin
  select * into me from public.profiles where id = auth.uid();
  if me.id is null or me.role = 'student' then
    raise exception '학부모 또는 선생님 계정만 코드를 입력할 수 있어요.';
  end if;
  select * into inv from public.invite_codes
    where code = upper(trim(p_code)) and expires_at > now();
  if inv.code is null then
    raise exception '코드가 올바르지 않거나 만료됐어요.';
  end if;
  insert into public.links (student_id, member_id, relation)
  values (inv.student_id, me.id, me.role::text)
  on conflict (student_id, member_id) do nothing;
  delete from public.invite_codes where code = inv.code;
  return inv.student_id;
end;
$$;

revoke all on function public.create_invite() from public, anon;
revoke all on function public.redeem_invite(text) from public, anon;
grant execute on function public.create_invite() to authenticated;
grant execute on function public.redeem_invite(text) to authenticated;
grant execute on function public.can_view(uuid) to authenticated;
grant execute on function public.is_student() to authenticated;

-- ---------- 행 단위 접근 제어(RLS) ----------
alter table public.profiles enable row level security;
alter table public.links enable row level security;
alter table public.invite_codes enable row level security;
alter table public.study_sessions enable row level security;
alter table public.plan_tasks enable row level security;
alter table public.timers enable row level security;

-- 프로필: 본인, 연결된 학생, 나와 연결된 학부모·선생님의 이름을 볼 수 있다. 수정은 본인만(역할은 변경 불가).
create policy profiles_select on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.can_view(id)
    or exists (select 1 from public.links l where l.member_id = profiles.id and l.student_id = auth.uid())
  );
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (name, grade, goal_minutes) on public.profiles to authenticated;

-- 연결: 당사자만 보고, 당사자만 해제한다. 생성은 redeem_invite 함수로만 가능.
create policy links_select on public.links for select to authenticated
  using (student_id = auth.uid() or member_id = auth.uid());
create policy links_delete on public.links for delete to authenticated
  using (student_id = auth.uid() or member_id = auth.uid());

-- 초대 코드: 직접 접근 불가(정책 없음). 함수로만 다룬다.

-- 공부 기록 / 학습 계획 / 타이머: 본인과 연결된 사람이 읽고, 학생 본인만 쓴다.
create policy sessions_select on public.study_sessions for select to authenticated
  using (public.can_view(student_id));
create policy sessions_insert on public.study_sessions for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy sessions_delete on public.study_sessions for delete to authenticated
  using (student_id = auth.uid());

create policy tasks_select on public.plan_tasks for select to authenticated
  using (public.can_view(student_id));
create policy tasks_insert on public.plan_tasks for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy tasks_update on public.plan_tasks for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy tasks_delete on public.plan_tasks for delete to authenticated
  using (student_id = auth.uid());

create policy timers_select on public.timers for select to authenticated
  using (public.can_view(student_id));
create policy timers_insert on public.timers for insert to authenticated
  with check (student_id = auth.uid() and public.is_student());
create policy timers_update on public.timers for update to authenticated
  using (student_id = auth.uid()) with check (student_id = auth.uid());
