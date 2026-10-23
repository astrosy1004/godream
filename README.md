# 공부길 (Gongbugil)

중·고등학생을 위한 학습 관리 서비스. 이 저장소는 개발 계획서의 **1단계 앞부분**(뼈대, 계정·권한, 학습 계획, 혼공 타이머, 대시보드)을 담고 있어요.

> 문서: [개발 계획서](docs/개발계획서.html) · [목업 화면(프로토타입)](docs/mockup/gongbugil-prototype.html) — 내려받아 브라우저에서 여세요.

## 구현된 것

| 기능 | 상태 |
|---|---|
| 가입·로그인 (학생 / 학부모 / 선생님), 세션 갱신 | 완료 |
| 학생 ↔ 학부모·선생님 연결 (초대 코드 24시간, 학생이 언제든 해제) | 완료 |
| 학습 계획 (주간 보기, 추가·완료·삭제) | 완료 |
| 혼공 타이머 (서버 시각 기준, 과목별, 하루 목표, 25/5 표시, 직접 기록) | 완료 |
| 대시보드 (주간 공부 시간, 계획 달성률, 연속 공부일, 과목별) | 완료 |
| 수업 노트 (학생·연결된 선생님이 작성, 학부모 열람, 숙제 체크, 과목 필터) | 완료 (`0002_lessons.sql` 실행 필요) |
| 오답노트, 시험 범위·암기, 모의 테스트, 시험 대비, 수행평가, 과목별 전략 | 화면 자리만 있음 (다음 단계) |

학부모·선생님은 연결된 학생의 기록을 **읽기만** 할 수 있고, 이 제한은 화면이 아니라 DB 정책(RLS)으로 강제돼요.

## 기술 스택

Next.js 16 (App Router, Server Actions, `proxy.ts`) · TypeScript · Supabase (PostgreSQL + Auth + RLS) · Vitest

## Supabase 설정 (처음 한 번)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 `supabase/migrations/0001_init.sql`, 이어서 `0002_lessons.sql` 내용을 차례로 붙여 넣고 각각 실행합니다.
3. **Project Settings → API**에서 `Project URL`과 `anon`(또는 `publishable`) 키를 복사합니다.
4. (테스트할 때만) **Authentication → Providers → Email**에서 *Confirm email*을 끄면 가입 즉시 로그인돼요. 켜 두면 확인 메일의 링크를 눌러야 해요.
5. 배포 주소가 정해지면 **Authentication → URL Configuration**의 *Site URL*에 그 주소를 넣습니다.

## 로컬 실행

```bash
cp .env.example .env.local   # 위에서 복사한 값을 넣기
npm install
npm run dev                  # http://localhost:3000
npm test                     # 날짜 계산 단위 테스트
npm run typecheck
```

## Vercel 배포

1. Vercel 프로젝트의 **Settings → Environment Variables**에 아래 두 개를 *Production / Preview* 모두에 추가합니다.
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **다시 배포**합니다. `NEXT_PUBLIC_*` 값은 빌드 때 번들에 들어가므로, 값을 넣거나 바꾼 뒤에는 반드시 재배포가 필요해요.

환경 변수가 없으면 앱은 “Supabase 연결이 필요해요” 안내 화면을 보여 줘요.

## 폴더 구조

```
app/
  (auth)/login, signup      로그인·가입
  (app)/                    로그인 후 화면 (대시보드, 계획, 타이머, 연결 관리, 준비 중 화면들)
  actions.ts                인증·연결 서버 액션
  study-actions.ts          계획·타이머·기록 서버 액션
components/                 화면 조각 (타이머, 주간 막대, 폼 등)
lib/                        날짜 계산(한국 시간), 쿼리, 인증 도우미, Supabase 클라이언트
proxy.ts                    세션 갱신과 비로그인 접근 차단
supabase/migrations/        DB 스키마와 접근 정책
```

## 설계 메모

- 날짜는 모두 한국 시간(Asia/Seoul) 기준 `YYYY-MM-DD` 문자열이에요. 서버가 UTC로 돌아가도 자정 경계가 어긋나지 않아요.
- 타이머는 시작 시각을 서버에 저장하고 경과 시간을 `누적 + (지금 − 시작)`으로 계산해요. 탭을 닫거나 기기를 바꿔도 이어져요.
- 초대 코드는 만든 직후 화면에서만 보여요(DB 정책상 코드를 다시 읽을 수 없음). 놓치면 새로 만들면 돼요.

## 출시 전에 꼭 해야 할 일

- 가입 화면의 동의 문구는 **베타용 임시 문구**예요. 만 14세 미만 가입자의 법정대리인 동의 등 개인정보 관련 요건은 전문가 검토 후 약관·처리방침으로 교체해야 해요.
- RLS 정책은 SQL 문법만 검증했고, 실제 Supabase 프로젝트에서 학생 간 데이터 격리 테스트(다른 학생 id로 조회·수정 시도)를 해야 해요.
