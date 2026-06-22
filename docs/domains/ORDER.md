# 발주·결재

**API 공통 규칙**: [FRONTEND_API.md](../FRONTEND_API.md) (§4 `purchaseOrder.ts` 표)

**의미**: 타 업체가 **우리 회사에게** 발주 요청한 건을 관리합니다. (우리 → 타 업체 발주가 아님)

**선행 도메인**: 발주 라인은 **`product_definition_id` 기준**입니다. [제품·제품 정의](./PRODUCT.md)

**연관**: 생산 계획·LOT → [PRODUCTION.md](./PRODUCTION.md) · 납품 → [DELIVERY.md](./DELIVERY.md)

---

## 1. 요약

| 구분 | 내용 |
|------|------|
| **라우트** | `/order` 목록, `/order/new` 등록, `/order/:orderId` 상세, `/order/:orderId/edit` 수정 |
| **API** | `src/api/purchaseOrder.ts`, `src/api/approvalRequests.ts`, `src/api/products.ts` |
| **주요 화면** | 발주 목록(필터/검색), 발주 상세(납품·첨부·생산 계획), 발주 등록/수정 폼 |

---

## 2. 라우트·파일 매핑

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/order` | `pages/Order.tsx` | 발주 목록, 필터(거래처/발주상태/승인상태), 검색, 페이지네이션 |
| `/order/new` | `pages/OrderForm.tsx` | 발주 신규 등록 (헤더 + 제품 여러 건) |
| `/order/:orderId` | `pages/OrderDetail.tsx` | 발주 상세, 납품·생산 계획, 첨부파일 |
| `/order/:orderId/edit` | `pages/OrderForm.tsx` | 발주 헤더만 수정 (제품 수정 불가) |
| `/order/:orderId/plan/:planId` | `pages/ProductionPlanDetail.tsx` | 생산 계획 상세 |

---

## 3. 페이지별 기능

### 3.1 발주 목록 (`Order.tsx`)

- **데이터**: `getPurchaseOrders(accessToken, { partnerId, orderStatus, approvalStatus })`
- **필터**: 거래처, 발주 상태(`PURCHASE_ORDER_STATUS`), 승인 상태(`APPROVAL_STATUS`)
- **검색**: 발주번호·제목·거래처명, 발주 일자 구간 → 클라이언트 필터
- **버튼**: 「발주 추가」 → `/order/new`

### 3.2 발주 상세 (`OrderDetail.tsx`)

- **데이터**: `getPurchaseOrder`, `getPurchaseOrderFiles`, `getDeliveries`
- **액션**: 수정, 첨부 업로드, 납품 등록, 생산 계획 등록
- **결재(상신·승인·반려)**
  - `currentApprovalRequest.lines` 중 **현재 `PENDING`인 줄의 결재자**와 JWT 사용자 id 비교
  - **`ADMIN` / `SYSTEM_MANAGER`** 역할은 결재선 우회 정책에 맞춰 버튼 노출 (승인은 백엔드 최종 검증)
  - API에 `canCurrentUserApprove` 없음 → 프론트에서 `lines` + 역할로 계산

### 3.3 발주 등록·수정 (`OrderForm.tsx`)

- **등록**: 헤더 + 발주 제품 행 → `createPurchaseOrder` → `/order/:id`
- **수정**: 헤더만 `updatePurchaseOrder` (제품 테이블 읽기 전용)
- **UI**: 거래처·제품은 `SearchableSelectWithCreate`, 빠른 등록 모달 지원

---

## 4. API 변경 요약

### 4.1 발주 라인 (`order_items`)

| 구분 | 내용 |
|------|------|
| **이전** | `itemId` + items 마스터 |
| **현재** | `productDefinitionId` 또는 별칭 `definitionId`. `itemId`만 내면 오류 |
| **응답** | `productDefinition` (필요 시 `productDefinition.product`) |
| **스냅샷** | `productNameSnapshot`, `definitionNameSnapshot`, `versionSnapshot`, `orderTypeSnapshot` |

**UI**: 대표 제품 선택 → `GET /products/:id/definitions` 로 정의 선택. ([PRODUCT.md](./PRODUCT.md))

### 4.2 결재 (`approval_requests`)

- 경로: `/api/approval-requests/...` (구 `approval-documents` 대체)
- 발주 상세: `currentApprovalRequest` (최신 1건, `lines`, `requestedBy`)
- 상신 `lines[]`: `stepOrder` 권장 (`stepNo` 호환), 라인 상태 필드명 `status`

**발주 헤더에서 제거된 필드** (결재는 `approval_requests`만 사용):

- `firstApproverUserId` / `firstApprover`
- `approvalSubmittedAt`, `approvalApprovedAt`, `approvalApprovedBy` / `approvalApprovedById`
- `currentApprovalDocumentId`, `currentApprovalDocument`

### 4.3 납품 등록

- `order.status === 'PO_CLOSED'` 일 때만 납품 등록 가능 (백엔드 검사)

### 4.4 검출기 (`detectors`)

| 메서드 | 경로 |
|--------|------|
| GET | `/api/detectors`, `/api/detectors/:id` |
| POST | `/api/detectors` |
| PATCH | `/api/detectors/:id` |

- `partnerId`(nullable FK): 셀렉트 거래처 선택 시 UUID, legacy 직접 입력 시 `null`
- `customerName`: 표시·검색 호환용

---

## 5. `purchaseOrder.ts` 함수

| 분류 | 함수 | 경로 |
|------|------|------|
| 발주 | `getPurchaseOrders`, `getPurchaseOrder`, `createPurchaseOrder`, `updatePurchaseOrder` | `/purchase-orders` |
| 품목 | `getPurchaseOrderItems`, `createPurchaseOrderLine`, `updatePurchaseOrderLine`, `deletePurchaseOrderLine` | `/purchase-orders/:id/lines` |
| 첨부 | `uploadPurchaseOrderFile`, `getPurchaseOrderFiles`, `deletePurchaseOrderFile` | `/purchase-orders/:id/files` |
| 납품 | `createDelivery`, `getDeliveries` | `/purchase-orders/:id/deliveries` |
| 보조 | `getPartners`, `createPartner` | `/partners` |
| 공통코드 | `getCodeGroupCodes` | `/code-groups/:groupCode/codes` (별칭) |

> 발주 **상태 이력**: `GET /purchase-orders/:id/status-histories` — 프론트 미연동. 구 경로 `…/approvals`, `…/histories` 미사용.

생산 계획·LOT API 표는 [PRODUCTION.md](./PRODUCTION.md) §2 참고.

---

## 6. 공통코드

- **발주 상태** 필터: `PURCHASE_ORDER_STATUS`
- **승인 상태** 필터: `APPROVAL_STATUS`
- 표준 조회: `getCommonCodesByGroup` — [COMMON_CODE.md](../COMMON_CODE.md)

---

## 7. 구현 파일

- `src/pages/Order.tsx`, `OrderDetail.tsx`, `OrderForm.tsx`
- `src/api/purchaseOrder.ts`, `src/api/approvalRequests.ts`, `src/api/products.ts`
