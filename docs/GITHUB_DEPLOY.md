# GitHub 저장소 연결 및 배포

## 1. GitHub에서 저장소 만들기

1. [GitHub](https://github.com/new) 에서 **New repository** 클릭
2. Repository name: **clubmanagement**
3. Public 선택 후 **Create repository** (README 추가 안 해도 됨)

## 2. 리모트 설정 및 푸시

본인 GitHub 사용자명에 맞게 리모트 URL을 설정한 뒤 푸시하세요.

```bash
# 리모트가 이미 origin으로 추가되어 있으면 URL만 변경
git remote set-url origin https://github.com/YOUR_USERNAME/clubmanagement.git

# 푸시
git push -u origin main
```

## 3. Vercel 배포

- [Vercel](https://vercel.com) 에서 **Import** → GitHub **clubmanagement** 저장소 선택
- 환경 변수 없이 배포 가능 (목 데이터로 체험)
- Supabase 연동 시 Vercel 프로젝트에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 추가
