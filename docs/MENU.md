# 메뉴 / 권한 / 메뉴 관리 가이드

이 문서는 현재 프로젝트의 **사이드바 메뉴 표시 방식**, **권한에 따른 메뉴 노출**, **메뉴 관리 페이지**, **드래그 정렬 저장 방식**을 정리한 문서입니다.

---

## 1. 개요

현재 메뉴는 프론트에서 하드코딩하지 않고, **현재 로그인 사용자 기준 메뉴 트리**를 백엔드에서 받아와 렌더링합니다.

- 사이드바 메뉴 표시: `GET /menus/my`
- 관리자용 메뉴 관리: `GET /menus`, `GET /menus/:id`, `POST /menus`, `PATCH /menus/:id`, `DELETE /menus/:id`
- 메뉴 노출 여부는 **권한/역할에 따라 백엔드가 내려주는 메뉴 응답**을 기준으로 결정합니다.

즉, 메뉴가 안 보이는 경우는 프론트 렌더링 문제일 수도 있지만, 실제로는 **권한이 없어 백엔드가 메뉴를 내려주지 않는 경우**도 많습니다.

---

## 2. 사이드바 메뉴 표시 방식

### 2.1 내 메뉴 조회

- **GET** `http://localhost:3000/menus/my`
- Headers: `Authorization: Bearer <access_token>`
- 인증 필요

예시 응답:

```json
[
  {
    "id": 1,
    "code": "DASHBOARD",
    "name": "Dashboard",
    "path": "/",
    "component": "DashboardPage",
    "icon": "GridIcon",
    "sortOrder": 0,
    "children": []
  },
  {
    "id": 10,
    "code": "ADMIN",
    "name": "Admin",
    "path": null,
    "component": null,
    "icon": "PieChartIcon",
    "sortOrder": 3,
    "children": [
      {
        "id": 14,
        "code": "USER",
        "name": "사용자 관리",
        "path": "/user",
        "component": "UserPage",
        "icon": null,
        "sortOrder": 3,
        "children": []
      }
    ]
  }
]
```

### 2.2 프론트 처리 방식

- `src/layout/AppSidebar.tsx`에서 `useQuery(["myMenus"])`로 조회
- 응답의 `icon` 문자열을 기존 아이콘 컴포넌트에 매핑
- `ADMIN` 메뉴는 현재 UI 구조상 `Others` 섹션으로 분리
- 자식이 없는 메뉴는 일반 링크, 자식이 있으면 드롭다운 메뉴로 렌더링

### 2.3 권한과 메뉴 표시

- 메뉴는 프론트가 권한 코드를 직접 계산해서 숨기는 구조가 아니라,
  **백엔드가 이미 필터링한 메뉴 트리**를 내려주는 구조입니다.
- 따라서 특정 사용자가 `Admin`을 못 보는 경우:
  - 프론트 버그일 수도 있지만
  - 실제로는 해당 사용자에게 `ADMIN` 메뉴 권한이 없어 `/menus/my`에 포함되지 않은 경우가 많습니다.

---

## 3. 새로고침 시 메뉴가 안 보이는 현상

### 3.1 정상적인 초기 흐름

새로고침 시에는 access token이 메모리에서 사라지므로 아래 순서로 복구됩니다.

1. 앱 시작
2. `AuthContext`가 `/auth/refresh` 호출
3. access token 복구
4. 그 후 `/menus/my` 호출
5. 사이드바 메뉴 렌더링

현재는 이 과정에서:

- 보호 라우트는 `Auth` 초기화가 끝날 때까지 로딩 화면 유지
- 사이드바는 빈 메뉴 대신 스켈레톤 표시

로 처리하고 있습니다.

### 3.2 메뉴가 실제로 안 보일 때 확인할 점

Network 탭에서 아래를 먼저 확인합니다.

- `/auth/refresh` 상태 코드
- `/menus/my` 상태 코드
- `/menus/my` 응답 body

판단 기준:

- `401`: 세션 만료 또는 refresh 실패
- `403`: 권한 없음
- `200` + 응답에 `ADMIN` 없음: 권한상 내려오지 않는 것
- `304 Not Modified`: 브라우저 캐시 재검증 응답. 이 자체는 에러가 아닐 수 있음

이번 사례처럼 실제 원인이 **권한 부족**이었다면, 메뉴가 안 보이는 것은 프론트 캐시 문제보다
**백엔드가 메뉴를 내려주지 않은 것**으로 보는 게 맞습니다.

### 3.3 `cache: "no-store"` 제거 이유

한때 메뉴 API에 `cache: "no-store"`를 넣어 브라우저 캐시 재검증을 피하게 했지만,
원인이 권한 부족으로 확인된 이후에는 다시 제거했습니다.

현재는:

- `getMyMenus()`
- `getMenus()`
- `getMenu()`

모두 기본 fetch 동작을 사용합니다.

즉, 앞으로는 **권한/응답 자체를 먼저 확인**하는 것이 우선입니다.

---

## 4. 관리자용 메뉴 관리 API

### 메뉴 전체 조회

- **GET** `http://localhost:3000/menus`
- 필요 권한: `menu.read`

### 메뉴 단건 조회

- **GET** `http://localhost:3000/menus/:id`
- 필요 권한: `menu.read`

### 메뉴 생성

- **POST** `http://localhost:3000/menus`
- 필요 권한: `menu.manage`

### 메뉴 수정

- **PATCH** `http://localhost:3000/menus/:id`
- 필요 권한: `menu.manage`

### 메뉴 삭제

- **DELETE** `http://localhost:3000/menus/:id`
- 필요 권한: `menu.manage`

### 역할별 메뉴 조회

- **GET** `http://localhost:3000/menus/roles/:roleId`
- 필요 권한: `menu.read`

### 역할에 메뉴 연결

- **POST** `http://localhost:3000/menus/roles/:roleId`
- 필요 권한: `role_menu.manage`

---

## 5. 메뉴 관리 페이지

경로:

- `/menu`

관련 파일:

- `src/pages/Menu.tsx`
- `src/components/menu/MenuTree.tsx`
- `src/components/menu/MenuTreeItem.tsx`
- `src/components/menu/MenuDetailPanel.tsx`
- `src/components/menu/menuTreeUtils.ts`
- `src/api/menu.ts`

구성:

- 왼쪽: 메뉴 트리
- 오른쪽: 메뉴 상세/수정 패널

지원 기능:

- 메뉴 전체 조회
- 메뉴 단건 조회
- 메뉴 생성
- 메뉴 수정
- 메뉴 삭제
- 트리 드래그앤드롭

---

## 6. 드래그 정렬 저장 방식

현재는 드래그가 끝나면 자동 저장됩니다.

동작 방식:

1. 프론트에서 먼저 트리 위치 반영
2. 변경된 메뉴들(`parentId`, `sortOrder`) 계산
3. 영향받은 메뉴들 전체를 `PATCH /menus/:id`로 저장
4. 성공 시 토스트 표시
5. 실패 시 이전 트리로 롤백

토스트 메시지:

- 성공: `메뉴 순서가 저장되었습니다.`
- 실패: 에러 메시지 또는 기본 실패 문구

추가 제약:

- 저장 중에는 다시 드래그 불가
- 자손 밑으로 드롭하는 프론트 방지는 현재 적용됨

---

## 7. 삭제 정책

메뉴 삭제는 공통 `ConfirmModal`을 사용합니다.

관련 파일:

- `src/components/common/ConfirmModal.tsx`

현재 프론트 검증:

- **최상위 메뉴이면서 하위 메뉴가 있는 경우 삭제 불가**
- 안내 문구:
  - `하위 메뉴가 있어 바로 최상위 메뉴를 삭제할 수 없습니다.`

처리 방식:

- 삭제 버튼 비활성화
- 코드상 삭제 진입도 한 번 더 차단

주의:

- 현재는 “최상위 + 하위 메뉴 존재” 조건만 막고 있음
- 필요하면 이후에는 “하위 메뉴가 하나라도 있는 모든 메뉴 삭제 금지”로 일반화 가능

---

## 8. 권한 에러 공통 처리

관련 파일:

- `src/lib/apiError.ts`
- `src/lib/queryClient.ts`
- `src/context/ApiFeedbackContext.tsx`

동작:

- API가 `403 Forbidden`을 반환하면 공통 `ApiError`로 처리
- React Query 전역 에러 핸들러에서 감지
- 공통 모달 표시

메시지:

- `권한이 없습니다. 관리자에게 문의하세요.`

버튼:

- `돌아가기`
- `홈으로 이동`

---

## 9. 관련 파일 요약

| 경로 | 역할 |
|------|------|
| `src/api/menu.ts` | 메뉴 관련 API, 타입, normalize 함수 |
| `src/layout/AppSidebar.tsx` | `/menus/my` 기반 사이드바 렌더링 |
| `src/pages/Menu.tsx` | 메뉴 관리 페이지 진입점 |
| `src/components/menu/*` | 메뉴 트리, 상세 패널, 유틸 |
| `src/components/common/ConfirmModal.tsx` | 삭제 확인 공통 모달 |
| `src/context/AuthContext.tsx` | 로그인/refresh 기반 인증 상태 복구 |
| `src/lib/queryClient.ts` | 공통 에러/재시도 정책 |
| `src/context/ApiFeedbackContext.tsx` | 403 권한 모달 표시 |

---

## 10. 다음에 확인할 우선순위

문제가 생기면 아래 순서로 확인하면 됩니다.

1. `/auth/refresh` 성공 여부
2. `/menus/my` 상태 코드와 응답 body
3. 해당 사용자에게 메뉴 권한이 실제로 부여되어 있는지
4. `/menu` 페이지에서 CRUD/드래그 저장 요청 payload가 올바른지
5. 삭제 정책이 프론트/백엔드에서 일치하는지
