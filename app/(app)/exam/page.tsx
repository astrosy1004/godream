import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "시험 대비" };

export default function Page() {
  return <ComingSoon title="시험 대비" desc="시험 날짜에서 거꾸로 계산한 단계별 준비 로드맵이에요." phase="2단계" />;
}
