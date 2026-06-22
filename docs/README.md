# 문서 목차

프론트엔드(`ojt`) 개발·연동 가이드입니다. 백엔드 DDL·시드·상세 API 스펙은 `vms-back` 저장소 `docs/`를 함께 참고하세요.

## 시작하기

| 순서 | 문서 | 내용 |
|------|------|------|
| 1 | [프론트 API 공통](./FRONTEND_API.md) | Base URL, 인증, 오류, 모듈별 엔드포인트 표 |
| 2 | [인증](./AUTH.md) | 로그인·토큰·세션 |
| 3 | [메뉴·권한](./MENU.md) | 사이드바, 메뉴 관리, DnD |
| 4 | [공통 코드](./COMMON_CODE.md) | code_groups / codes, UI 표시 규칙 |

## 도메인

| 문서 | 내용 |
|------|------|
| [발주·결재](./domains/ORDER.md) | 발주 목록/상세/등록, API 변경, 결재 |
| [제품·제품 정의](./domains/PRODUCT.md) | product vs product_definition, UX, 레거시 items |
| [생산 계획·LOT·공정](./domains/PRODUCTION.md) | 생산 계획, LOT, 시리얼, 임시 하드코딩 |
| [납품](./domains/DELIVERY.md) | 납품 계획 목록, Unit perspective |

## 배포

- [Release notes](./release-notes/README.md) — 날짜별 반영 범위·스모크
