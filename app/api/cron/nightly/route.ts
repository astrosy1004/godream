import { createClient } from "@supabase/supabase-js";
import webpush from "web-push";
import { todayISO } from "@/lib/dates";
import { buildNightly } from "@/lib/nightly";
import { fetchDayStatuses } from "@/lib/today-status";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

interface Sub {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * 매일 한국 시간 저녁 9시(UTC 12:00)에 호출된다 (vercel.json 의 crons).
 * 학생별로 오늘 입력 현황을 보고 경고(입력 없음) 또는 할 일 푸시를 보낸다. 같은 날 한 번만 보낸다.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET 이 설정되지 않았어요." }, { status: 500 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  if (!url || !serviceKey || !vapidPublic || !vapidPrivate) {
    return Response.json({ error: "서버 환경 변수가 부족해요 (SUPABASE_SERVICE_ROLE_KEY, VAPID 키)." }, { status: 500 });
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:noreply@godream.app", vapidPublic, vapidPrivate);

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const today = todayISO();

  const { data: subRows, error: subErr } = await db.from("push_subscriptions").select("user_id, endpoint, p256dh, auth");
  if (subErr) return Response.json({ error: "구독 목록을 읽지 못했어요." }, { status: 500 });
  const subs = (subRows ?? []) as Sub[];
  const byUser = new Map<string, Sub[]>();
  for (const s of subs) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  const userIds = [...byUser.keys()];
  if (userIds.length === 0) return Response.json({ day: today, students: 0, sent: 0 });

  const { data: studentRows } = await db.from("profiles").select("id").in("id", userIds).eq("role", "student");
  const studentIds = ((studentRows ?? []) as { id: string }[]).map((r) => r.id);
  const statuses = await fetchDayStatuses(db, studentIds, today);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const id of studentIds) {
    const status = statuses.get(id);
    const nightly = status ? buildNightly(status) : null;
    if (!nightly) {
      skipped += 1;
      continue;
    }
    // 오늘 이미 보냈으면 건너뛴다 (기본키 충돌)
    const { error: logErr } = await db.from("reminder_log").insert({ student_id: id, day: today, kind: nightly.kind });
    if (logErr) {
      skipped += 1;
      continue;
    }
    const payload = JSON.stringify({
      title: nightly.title,
      body: nightly.body,
      url: nightly.kind === "todo" ? "/plan" : "/timer",
      tag: `nightly-${today}`,
    });
    let ok = 0;
    for (const s of byUser.get(id) ?? []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, { TTL: 60 * 60 * 3 });
        ok += 1;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("endpoint", s.endpoint); // 만료된 구독 정리
      }
    }
    if (ok > 0) sent += 1;
    else {
      failed += 1;
      await db.from("reminder_log").delete().eq("student_id", id).eq("day", today); // 다시 시도할 수 있게
    }
  }
  return Response.json({ day: today, students: studentIds.length, sent, skipped, failed });
}
