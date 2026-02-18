# Product Spec Handoff — 동아리 관리 플랫폼

## 참조 문서
- **`docs/IMPLEMENTATION_PLAN.md`**: 전체 요구사항, 역할 정의, 필수 기능, 페이지 구성, DB 개요, **단계별 구현 계획(Phase 1~5)**, 필수 체크리스트.

## 아키텍트 작업 시
1. `docs/IMPLEMENTATION_PLAN.md`의 DB 개요를 바탕으로 상세 스키마(마이그레이션) 작성.
2. 동아리 도메인은 기존 학원(academy) 스키마와 분리할 것(별도 테이블 prefix 또는 스키마).
3. API 계약서 작성 시 Phase 1~5 순서와 위 문서의 페이지/권한을 반영할 것.

## 다음 에이전트
Architect: `01-architecture.md` 작성 시 이 제품 스펙과 `IMPLEMENTATION_PLAN.md`를 입력으로 사용.
