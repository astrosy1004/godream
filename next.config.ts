import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // 오답노트 사진(브라우저에서 줄인 이미지)을 서버 액션으로 올리기 위해 기본 1MB 제한을 늘린다.
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};

export default nextConfig;
