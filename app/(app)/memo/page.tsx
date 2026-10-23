import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "시험 범위·암기" };

export default function Page() {
  return <ComingSoon title="시험 범위·암기" desc="시험 범위를 올리면 단원별 암기 방법을 알려 줘요." phase="2단계" />;
}
