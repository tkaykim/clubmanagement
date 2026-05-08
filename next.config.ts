import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY,
  },
  images: {
    // Vercel 무료 플랜 Image Optimization 한도(월 1000회) 초과 시 next/image 가
    // 402 로 깨지는 문제를 우회. 외부 이미지(YouTube 썸네일 i.ytimg.com / Supabase
    // Storage)는 이미 적정 사이즈로 호스팅되므로 Vercel 최적화 이득이 작다.
    // Pro 업그레이드 또는 한도 reset 후 false 로 되돌리면 자동 webp/resize 복원.
    unoptimized: true,
    remotePatterns: [
      // Supabase Storage (포트폴리오 이미지, 멤버 프로필 사진)
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      // YouTube 썸네일 (i.ytimg.com)
      {
        protocol: "https",
        hostname: "i.ytimg.com",
        pathname: "/vi/**",
      },
    ],
  },
};

export default nextConfig;
