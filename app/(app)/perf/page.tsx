import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "수행평가" };

export default function Page() {
  return <ComingSoon title="수행평가" desc="수행평가를 단계별로 나누고 기한을 관리해요." phase="2단계" />;
}
