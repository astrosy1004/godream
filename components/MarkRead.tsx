"use client";

import { useEffect } from "react";
import { markFeedbackRead } from "@/app/feedback-actions";

/** 화면이 열리면 안 읽은 피드백을 읽음으로 바꾼다 (메뉴 배지도 함께 갱신). */
export function MarkRead() {
  useEffect(() => {
    void markFeedbackRead();
  }, []);
  return null;
}
