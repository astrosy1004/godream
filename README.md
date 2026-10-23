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
| 학부모·선생님 피드백 (학생은 읽음 표시·새 글 배지) | 완료 (`0003_feedback_push.sql` 실행 필요) |
| 저녁 9시 알림: 앱 안 팝업 + 웹 푸시 (오늘 입력이 없으면 경고, 남은 할 일이 있으면 할 일 알림) | 완료 (아래 ‘저녁 9시 알림 설정’ 필요) |
| 오답노트: 사진 업로드(비공개 저장소), 틀린 이유, OpenAI 분석, 간격 복습(1→3→7→14일) | 완료 (`0004_wrong_notes.sql` 실행 + `OPENAI_API_KEY` 필요) |
| 시험 범위·암기: 범위표·시험지 사진(최대 3장)/글 → OpenAI 단원별 암기법·확인 문제, 시험 전까지 학습 계획에 자동 추가 | 완료 (`0005_exam_scopes.sql` 실행 + `OPENAI_API_KEY` 필요) |
| (다음 단계), 모의 테스트, 시험 대비, 수행평가, 과목별 전략 | 화면 자리만 있음 (다음 단계) |

학부모·선생님은 연결된 학생의 기록을 **읽기만** 할 수 있고, 이 제한은 화면이 아니라 DB 정책(RLS)으로 강제돼요.

## 기술 스택

Next.js 16 (App Router, Server Actions, `proxy.ts`) · TypeScript · Supabase (PostgreSQL + Auth + RLS) · Vitest

## Supabase 설정 (처음 한 번)

1. [supabase.com](https://supabase.com)에서 새 프로젝트를 만듭니다.
2. **SQL Editor**에 `supabase/migrations/0001_init.sql`, 이어서 `0002_lessons.sql`, `0003_feedback_push.sql`, `0004_wrong_notes.sql`, `0005_exam_scopes.sql` 내용을 차례로 붙여 넣고 각각 실행합니다.
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

## 저녁 9시 알림 설정

앱 안 팝업은 설정 없이 동작해요(한국 시간 21시 이후 사이트가 열려 있을 때, 하루 한 번). **푸시 알림**은 아래를 해야 켜져요.

1. 키 만들기: 터미널에서 `npx web-push generate-vapid-keys` → Public Key / Private Key가 나와요.
2. Vercel **Environment Variables**에 추가 (Production):
   - `NEXT_PUBLIC_VAPID_PUBLIC_KEY` = Public Key
   - `VAPID_PRIVATE_KEY` = Private Key (비공개)
   - `VAPID_SUBJECT` = `mailto:내이메일`
   - `SUPABASE_SERVICE_ROLE_KEY` = Supabase **service_role(secret)** 키 (서버 전용, 절대 공개 금지)
   - `CRON_SECRET` = 아무 긴 임의 문자열
3. **Redeploy**. `vercel.json`의 크론이 매일 UTC 12:00(= 한국 21:00)에 `/api/cron/nightly`를 호출해요.
4. 학생이 사이드바의 **‘저녁 9시 알림 켜기’**를 눌러 브라우저 알림을 허용해요. 아이폰은 홈 화면에 추가한 뒤에 가능해요.

참고: Vercel Hobby 요금제의 크론은 지정한 시각 ‘안의 한 시간 이내’에 실행돼 정확히 9시가 아닐 수 있어요. 정확한 시각이 필요하면 Pro 요금제 또는 외부 스케줄러(예: cron-job.org)로 `Authorization: Bearer <CRON_SECRET>` 헤더를 붙여 `/api/cron/nightly`를 매일 21:00(KST)에 호출하세요.

## 오답노트 AI 분석 설정 (OpenAI)

1. [platform.openai.com](https://platform.openai.com)에서 API 키를 만들고 결제 한도(Usage limits)를 정해 두세요.
2. Vercel **Environment Variables**에 `OPENAI_API_KEY`(서버 전용, 공개 금지)를 추가하고 **Redeploy**합니다. 모델을 바꾸려면 `OPENAI_MODEL`도 넣어요(비우면 `gpt-4o-mini`).
3. 학생은 오답 카드의 **‘AI로 분석하기’**를 눌러요. 결과는 노트에 저장돼 다시 비용이 들지 않고, 학생당 하루 20번으로 제한해요.

주의: AI 분석 시 문제 사진과 입력한 글이 OpenAI로 전송돼요. 만 14세 미만 학생의 개인정보 국외 전송과 보호자 동의 문구는 출시 전에 전문가 검토 후 약관·처리방침에 반영해야 해요.

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
