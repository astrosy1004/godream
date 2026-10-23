import { SetupNeeded } from "@/components/SetupNeeded";
import { supabaseEnv } from "@/lib/supabase/env";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  if (!supabaseEnv()) return <SetupNeeded />;
  return <main className="auth">{children}</main>;
}
