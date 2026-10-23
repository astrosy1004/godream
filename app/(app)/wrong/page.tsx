import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "오답노트" };

export default function Page() {
  return <ComingSoon title="오답노트" desc="틀린 문제를 사진으로 올리고 틀린 이유와 바로잡는 방법을 정리해요." phase="1단계 후반" />;
}
