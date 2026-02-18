동아리 운영·관리 플랫폼 (Next.js, Vercel 배포용)

## 체험하기 (env 없이 가능)

배포 후에도 **Supabase·env 설정 없이** 체험할 수 있습니다. 목 데이터로 동아리·이벤트·캘린더를 둘러보세요.

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) — 홈 / 동아리 / 공개 이벤트 / 체험 대시 / 캘린더

## DB 스키마 (추후 연동용)

- **스키마 정의**: `docs/schema.sql` (참고용 전체 스키마)
- **마이그레이션·데이터 삽입**: Supabase 연동 시 `supabase/migrations/` 및 `npm run seed` 사용 예정. 현재는 실행하지 않음.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
