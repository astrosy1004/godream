import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "과목별 전략" };

export default function Page() {
  return <ComingSoon title="과목별 전략" desc="과목마다 다른 공부 방법과 시험 전 일정을 안내해요." phase="2단계" />;
}
