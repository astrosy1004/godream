import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "수업 노트" };

export default function Page() {
  return <ComingSoon title="수업 노트" desc="과외·학원 수업 내용을 핵심 정리와 숙제로 정리해요." phase="1단계 후반" />;
}
