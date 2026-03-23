# 프론트엔드 API 클라이언트 가이드

백엔드와 통신하는 `src/api/*.ts` 모듈의 **공통 규칙**과 **엔드포인트 요약**입니다.  
상세 도메인 설명은 각각 [PURCHASE_ORDER.md](./PURCHASE_ORDER.md), [ITEMS.md](./ITEMS.md) 등을 참고하세요.

---

## 1. Base URL

| 항목 | 내용 |
|------|------|
| **정의** | `src/api/apiBase.ts`의 `API_BASE` |
| **환경 변수** | `VITE_AUTH_BASE_URL` (미설정 시 `http://localhost:3000`) |
| **최종 형태** | 호스트가 이미 `/api`로 끝나면 그대로, 아니면 `{호스트}/api` |

모든 API 함수는 `{API_BASE}/…` 경로로 `fetch` 합니다.

---

## 2. 공통 규칙

### 2.1 인증

- 로그인 이후 대부분의 요청에 **`Authorization: Bearer <accessToken>`** 헤더를 붙입니다.
- **`credentials: "include"`** 로 refresh 등 **HttpOnly 쿠키**를 함께 보냅니다.
- 예외: `auth.ts`의 `login`은 JSON body만 보내고, 이후 응답·쿠키로 세션이 이어집니다.

### 2.2 요청 본문

| 종류 | 헤더 | 본문 |
|------|------|------|
| JSON | `Content-Type: application/json` | `JSON.stringify(객체)` |
| Multipart (파일) | 브라우저가 `boundary` 포함해 설정 | `FormData` (예: 필드명 `file`) |

파일 업로드 시 **`Content-Type`을 수동으로 넣지 않습니다** (multipart 경계가 깨질 수 있음).

### 2.3 응답·목록 래핑

많은 목록 API가 다음 둘 중 하나로 옵니다.

- 배열 그대로: `[ … ]`
- 래핑: `{ data: [ … ] }`

각 모듈에서 `Array.isArray(data) ? data : data?.data ?? []` 패턴으로 통일해 파싱합니다.

### 2.4 오류 처리

- `createApiError` (`src/lib/apiError.ts`): `!res.ok`일 때 응답 JSON의 `message` 또는 **폴백 메시지**로 `ApiError` 생성.
- `auth.ts`의 로그인/refresh는 `ApiError` 대신 `Error` + JSON `message`를 사용하는 부분이 있음.

### 2.5 필드명 정규화

백엔드가 `snake_case` 또는 별칭(`order_items`, `orderedAt` 등)을 쓰면, 해당 모듈의 **`map*`** 함수에서 프론트 타입(camelCase)으로 맞춥니다.  
대표: `purchaseOrder.ts`의 `mapPurchaseOrderDetail`, `mapApiOrderLineToPurchaseOrderItem`.

---

## 3. 모듈별 요약

| 파일 | 역할 | 대표 경로 (모두 `API_BASE` 접두) |
|------|------|----------------------------------|
| **apiBase.ts** | `API_BASE` 단일 export | — |
| **auth.ts** | 로그인·토큰 갱신·로그아웃 | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout` |
| **authCookie.ts** | 쿠키 관련 보조 | (파일 내 주석·구현 참고) |
| **commonCode.ts** | 공통코드 그룹·코드 목록 | `GET /common-codes/groups`, 그룹별 codes (파일 내 경로 참고) |
| **items.ts** | 품목·분류·유형 CRUD | `/items`, `/item-categories`, `/item-types` 등 |
| **menu.ts** | 메뉴 트리·CRUD·역할 연결 | `/menus` 등 |
| **organization.ts** | 조직 트리·부서 사용자 | `GET /organization-unit/tree`, 사용자 목록 API |
| **permission.ts** | 권한 | (파일 내 경로 참고) |
| **purchaseOrder.ts** | 발주·라인·첨부·납품·거래처·코드그룹 보조 | 아래 §4 |
| **role.ts** | 역할 | (파일 내 경로 참고) |
| **user.ts** | 사용자 | (파일 내 경로 참고) |
| **userRole.ts** | 사용자–역할 | (파일 내 경로 참고) |

---

## 4. 발주 (`purchaseOrder.ts`) 상세

타입(`PurchaseOrderCreatePayload`, `PurchaseOrderItemPayload` 등)은 **소스의 `export interface`** 가 정본입니다.

| 함수 | 메서드 | 경로 | 본문/비고 |
|------|--------|------|-----------|
| `getPurchaseOrders` | GET | `/purchase-orders?partnerId&orderStatus&approvalStatus` | — |
| `getPurchaseOrder` | GET | `/purchase-orders/:id` | 상세 + 품목·첨부 메타 등 |
| `createPurchaseOrder` | POST | `/purchase-orders` | JSON: 헤더 + `items[]` |
| `updatePurchaseOrder` | PUT | `/purchase-orders/:id` | JSON: 헤더 필드 (선택) |
| `getPurchaseOrderItems` | GET | `/purchase-orders/:id/lines` | 품목만 재조회 |
| `createPurchaseOrderLine` | POST | `/purchase-orders/:id/lines` | JSON: 품목 1줄 (`PurchaseOrderItemPayload`) |
| `updatePurchaseOrderLine` | PATCH | `/purchase-orders/:orderId/lines/:lineId` | JSON: 부분 수정 |
| `deletePurchaseOrderLine` | DELETE | `/purchase-orders/:orderId/lines/:lineId` | — |
| `uploadPurchaseOrderFile` | POST | `/purchase-orders/:id/files` | `FormData` + `file` |
| `getPurchaseOrderFiles` | GET | `/purchase-orders/:id/files` | — |
| `deletePurchaseOrderFile` | DELETE | `/purchase-orders/:orderId/files/:fileLinkId` | 링크 ID 기준 |
| `createDelivery` | POST | `/purchase-orders/:id/deliveries` | JSON: 납품 |
| `getDeliveries` | GET | `/purchase-orders/:id/deliveries` | — |
| `getPartners` | GET | `/partners` | — |
| `createPartner` | POST | `/partners` | JSON |
| `getCodeGroupCodes` | GET | `/code-groups/:groupCode/codes` | 레거시 코드 그룹 API |

> **참고**: `commonCode.ts`의 `getCommonCodesByGroup` 등은 경로가 다를 수 있음 — 발주 화면에서 쓰는 공통코드는 보통 `commonCode.ts` 쪽을 사용합니다.

---

## 5. 관련 문서

- [PURCHASE_ORDER.md](./PURCHASE_ORDER.md) — 발주 화면·API 흐름
- [ITEMS.md](./ITEMS.md) — 품목 마스터
- [COMMON_CODE.md](./COMMON_CODE.md) — 공통코드 (있는 경우)

코드 내 **함수 단위 JSDoc**은 `src/api/purchaseOrder.ts` 등에 `@` 태그로 경로를 반복 기재해 두었습니다.
