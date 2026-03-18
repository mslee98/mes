# OJT Frontend

사내 관리 화면용 React + TypeScript + Vite 프로젝트입니다.

## 문서 진입점

- 인증/로그인 흐름: [`docs/AUTH.md`](docs/AUTH.md)
- 메뉴/권한/메뉴관리 흐름: [`docs/MENU.md`](docs/MENU.md)
- 공통 코드 관리 기준: [`docs/COMMON_CODE.md`](docs/COMMON_CODE.md)
- **발주 모듈(타 업체 → 우리 회사 요청)**: [`docs/PURCHASE_ORDER.md`](docs/PURCHASE_ORDER.md)

처음 확인할 때는 보통 아래 순서로 보면 됩니다.

1. `README.md`
2. `docs/AUTH.md`
3. `docs/MENU.md`
4. `docs/COMMON_CODE.md`
5. 발주 관련: `docs/PURCHASE_ORDER.md`

## 주요 기능

- 로그인 / 로그아웃 / 토큰 재발급
- 권한 기반 메뉴 노출
- 사이드바 동적 메뉴 렌더링
- 메뉴 관리 페이지
- 공통 코드 관리 페이지
- **발주 모듈** (목록/상세/등록/수정, 결재·납품·첨부)
- 메뉴 트리 드래그앤드롭 정렬
- 공통 권한 에러 처리 및 확인 모달

## 실행

```bash
npm install
npm run dev
```

## 주요 경로

- **API 공통 Base**: `src/api/apiBase.ts` — 모든 API가 `API_BASE`(호스트 + `/api`) 사용. auth, menus, users, 발주 등 동일.
- 앱 라우팅: `src/App.tsx`
- 인증 상태: `src/context/AuthContext.tsx`
- 사이드바: `src/layout/AppSidebar.tsx`
- 메뉴 API: `src/api/menu.ts`
- 메뉴 관리 페이지: `src/pages/Menu.tsx`
- 공통 코드 API: `src/api/commonCode.ts`
- 공통 코드 관리 페이지: `src/pages/CommonCode.tsx`
- 발주 API·타입: `src/api/purchaseOrder.ts`
- 발주 목록/상세/등록·수정: `src/pages/Order.tsx`, `OrderDetail.tsx`, `OrderForm.tsx`

## 참고

- 백엔드가 `/api` prefix로 통일된 경우, 프론트는 `src/api/apiBase.ts`에서 한 곳만 관리하므로 별도 수정 없이 동작합니다. (`VITE_AUTH_BASE_URL`만 호스트로 설정)
- 메뉴 노출 여부는 프론트 하드코딩이 아니라 `/api/menus/my` 응답 기준입니다.
- 메뉴가 보이지 않을 때는 렌더링 문제보다 권한/응답 body를 먼저 확인하는 것이 좋습니다.
