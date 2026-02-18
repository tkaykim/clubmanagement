#!/bin/bash
# GitHub에 clubmanagemnt 저장소를 만들고 푸시합니다.
# 먼저 터미널에서: gh auth login (브라우저에서 로그인 완료)

set -e
cd "$(dirname "$0")/.."

if ! gh auth status &>/dev/null; then
  echo "먼저 GitHub 로그인이 필요합니다: gh auth login"
  exit 1
fi

# 저장소 생성 (이미 있으면 스킵)
gh repo create tkaykim/clubmanagemnt --public --source=. --remote=origin --push 2>/dev/null || {
  echo "저장소가 이미 있거나 생성 실패. 푸시만 시도합니다."
  git push -u origin main
}

echo "완료: https://github.com/tkaykim/clubmanagemnt"
