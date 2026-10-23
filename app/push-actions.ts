"use server";

import { createClient } from "@/lib/supabase/server";
import { getProfile } from "@/lib/auth";

export async function savePushSubscription(sub: { endpoint: string; p256dh: string; auth: string }): Promise<{ ok: boolean }> {
  const me = await getProfile();
  if (!me || me.role !== "student") return { ok: false };
  if (!/^https:\/\//.test(sub.endpoint) || sub.endpoint.length > 1000 || !sub.p256dh || !sub.auth) return { ok: false };
  const supabase = await createClient();
  const { error } = await supabase.rpc("save_push_subscription", { p_endpoint: sub.endpoint, p_p256dh: sub.p256dh, p_auth: sub.auth });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  const supabase = await createClient();
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint); // 본인 것만 지워진다 (RLS)
}
