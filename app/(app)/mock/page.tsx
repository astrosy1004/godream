import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "주간 모의 테스트" };

export default function Page() {
  return <ComingSoon title="주간 모의 테스트" desc="매주 과목별 짧은 테스트를 풀고 점수를 기록해요." phase="2단계" />;
}
