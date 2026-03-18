# 발주 모듈 (프론트엔드) 정리

**의미**: 타 업체가 **우리 회사에게** 발주 요청한 건을 관리하는 모듈입니다. (우리 회사 → 타 업체 발주가 아님)

**품목 관리(선행)**: 발주 시 품목을 선택하므로, 그 전에 **품목 분류·품목 유형·품목 마스터**를 등록해 두어야 합니다. 품목 관리 라우트·API·화면은 [docs/ITEMS.md](ITEMS.md) 참고.

---

## 1. 요약

| 구분 | 내용 |
|------|------|
| **라우트** | `/order` 목록, `/order/new` 등록, `/order/:orderId` 상세, `/order/:orderId/edit` 수정 |
| **API Base** | **공통** `src/api/apiBase.ts`의 `API_BASE` (호스트 + `/api`, 예: `http://localhost:3000/api`) — auth·메뉴·유저·발주 등 전체가 동일 prefix 사용 |
| **인증** | `Authorization: Bearer <access_token>` 필수 (로그인 후 사용) |
| **주요 화면** | 발주 목록(필터/검색), 발주 상세(결재·납품·첨부), 발주 등록/수정 폼 |

---

## 2. 라우트·파일 매핑

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/order` | `pages/Order.tsx` | 발주 목록, 필터(거래처/발주상태/승인상태), 검색, 페이지네이션 |
| `/order/new` | `pages/OrderForm.tsx` | 발주 신규 등록 (헤더 + 품목 여러 건) |
| `/order/:orderId` | `pages/OrderDetail.tsx` | 발주 상세, 결재 상신/승인/반려, 납품 등록, 첨부파일 |
| `/order/:orderId/edit` | `pages/OrderForm.tsx` | 발주 헤더만 수정 (품목 수정 불가) |

---

## 3. API 모듈 (`src/api/purchaseOrder.ts`)

### 3.1 Base URL

- **공통**: `src/api/apiBase.ts`에서 `API_BASE` export (호스트 + `/api`)
- 호스트 = `import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000"`
- 이미 `/api`로 끝나면 그대로 사용, 아니면 뒤에 `/api` 붙임 → auth, menus, users, 발주 등 **모든 API**가 `API_BASE` 사용

### 3.2 타입 (주요)

| 타입명 | 용도 |
|--------|------|
| `Partner` | 거래처 (id, code, name, …) |
| `Item` | 품목 (id, code, name, spec, unit, …) |
| `PurchaseOrderListItem` | 목록 1건 (id, orderNo, title, partnerId, partner, orderDate, dueDate, orderStatus, approvalStatus, totalQty, totalAmount, …) |
| `PurchaseOrderDetail` | 상세 1건 (ListItem 확장 + requestDeliveryDate, vendorOrderNo, vendorRequest, specialNote, items, createdBy) |
| `PurchaseOrderItem` | 발주 품목 1건 (id, itemId, item, itemName, spec, unit, qty, unitPrice, amount, deliveredQty, …) |
| `PurchaseOrderCreatePayload` | 발주 생성 Body (title, partnerId, orderDate, dueDate, requestDeliveryDate, vendorOrderNo, vendorRequest, specialNote, **items[]**) |
| `PurchaseOrderUpdatePayload` | 발주 수정 Body (헤더 필드만, 품목 없음) |
| `PurchaseOrderFile` | 첨부파일 1건 |
| `PurchaseOrderApproval` | 결재 라인 1건 (approvalStep, approverId, approver, approvalStatus, approvalComment, approvedAt) |
| `PurchaseOrderHistory` | 변경 이력 1건 |
| `Delivery`, `DeliveryCreatePayload`, `DeliveryItemPayload` | 납품 관련 |
| `CodeItem` | 공통코드 1건 (groupCode, code, name, …) |

### 3.3 API 함수 목록

| 분류 | 함수명 | 메서드/경로 | 설명 |
|------|--------|-------------|------|
| **발주** | `getPurchaseOrders(accessToken, params?)` | GET `/purchase-orders` | 목록 (query: partnerId, orderStatus, approvalStatus) |
| | `getPurchaseOrder(id, accessToken)` | GET `/purchase-orders/:id` | 상세 |
| | `createPurchaseOrder(payload, accessToken)` | POST `/purchase-orders` | 생성 |
| | `updatePurchaseOrder(id, payload, accessToken)` | PUT `/purchase-orders/:id` | 헤더 수정 |
| **품목** | `getPurchaseOrderItems(id, accessToken)` | GET `/purchase-orders/:id/items` | 발주 품목 목록 |
| **첨부** | `uploadPurchaseOrderFile(id, file, accessToken)` | POST `/purchase-orders/:id/files` | multipart 업로드 |
| | `getPurchaseOrderFiles(id, accessToken)` | GET `/purchase-orders/:id/files` | 첨부 목록 |
| **결재** | `getPurchaseOrderApprovals(id, accessToken)` | GET `/purchase-orders/:id/approvals` | 결재 라인 목록 |
| | `submitPurchaseOrderApproval(id, approverIds, accessToken)` | POST `/purchase-orders/:id/submit-approval` | 상신 |
| | `approvePurchaseOrderApproval(approvalId, comment, accessToken)` | POST `/purchase-order-approvals/:id/approve` | 승인 |
| | `rejectPurchaseOrderApproval(approvalId, comment, accessToken)` | POST `/purchase-order-approvals/:id/reject` | 반려 |
| **이력** | `getPurchaseOrderHistories(id, accessToken)` | GET `/purchase-orders/:id/histories` | 변경 이력 |
| **납품** | `createDelivery(purchaseOrderId, payload, accessToken)` | POST `/purchase-orders/:id/deliveries` | 납품 등록 |
| | `getDeliveries(purchaseOrderId, accessToken)` | GET `/purchase-orders/:id/deliveries` | 납품 목록 |
| **드롭다운** | `getPartners(accessToken)` | GET `/partners` | 거래처 목록 |
| | `getItems(accessToken)` | GET `/items` | 품목 목록 |
| | `getCodeGroupCodes(groupCode, accessToken)` | GET `/code-groups/:groupCode/codes` | 공통코드 목록 |

---

## 4. 페이지별 기능 정리

### 4.1 발주 목록 (`Order.tsx`)

- **데이터**: `getPurchaseOrders(accessToken, { partnerId, orderStatus, approvalStatus })`
- **필터(쿼리)**: 거래처, 발주 상태(`PURCHASE_ORDER_STATUS`), 승인 상태(`APPROVAL_STATUS`)
- **검색**: 발주번호·제목·거래처명 키워드, 발주 일자 구간 → 클라이언트 필터
- **테이블**: 발주번호(클릭 시 상세), 제목, 거래처, 발주일, 요청납기, 발주 상태, 승인 상태, 총 금액
- **버튼**: 「발주 추가」 → `/order/new`

### 4.2 발주 상세 (`OrderDetail.tsx`)

- **데이터**: `getPurchaseOrder`, `getPurchaseOrderApprovals`, `getPurchaseOrderHistories`, `getPurchaseOrderFiles`, `getDeliveries`
- **표시**: 발주 정보, 발주 품목 테이블, 첨부파일 목록, 결재 라인, 변경 이력, 납품 목록
- **액션**  
  - **상신**: approvalStatus가 NONE/DRAFT일 때만. 모달에서 결재자(사용자) 선택 → `submitPurchaseOrderApproval(id, approverIds)`  
  - **승인/반려**: 결재 라인 상태가 PENDING일 때. 반려 시 사유 입력 모달 → `approvePurchaseOrderApproval` / `rejectPurchaseOrderApproval`  
  - **수정**: `/order/:orderId/edit` 링크  
  - **첨부**: 파일 선택 → `uploadPurchaseOrderFile(id, file)`  
  - **납품 등록**: 모달에서 납품일, 품목별 납품 수량/LOT/비고 입력 → `createDelivery(purchaseOrderId, payload)`

### 4.3 발주 등록 (`OrderForm.tsx`, `orderId === "new"`)

- **필수**: 제목, 거래처, 발주일
- **선택**: 요청납기, 납품 요청일, 업체 발주번호, 업체 요청사항, 특이사항
- **품목**: 행 추가/삭제, 품목 선택(getItems), 수량·단가·납품 요청일·비고
- **제출**: `createPurchaseOrder(payload)` → 성공 시 `/order/:id` 이동

### 4.4 발주 수정 (`OrderForm.tsx`, `orderId` 숫자)

- **수정 가능**: 제목, 거래처, 발주일, 요청납기, 납품 요청일, 업체 발주번호, 업체 요청사항, 특이사항
- **품목**: API로 수정 불가(화면에서 편집 불가)
- **제출**: `updatePurchaseOrder(id, payload)` → 성공 시 `/order/:id` 이동

---

## 5. 공통코드 사용

- **발주 상태** 드롭다운: `getCodeGroupCodes("PURCHASE_ORDER_STATUS", accessToken)`
- **승인 상태** 드롭다운: `getCodeGroupCodes("APPROVAL_STATUS", accessToken)`
- 문서상 그룹 예: `PURCHASE_ORDER_STATUS`, `APPROVAL_STATUS`, `PROGRESS_STATUS`, `DELIVERY_STATUS`, `FILE_TYPE`, `UNIT`  
  → 필요 시 동일 패턴으로 `getCodeGroupCodes(groupCode, accessToken)` 사용

---

## 6. 의존성·컨텍스트

- **인증**: `useAuth()` → `accessToken` (모든 API 호출에 사용)
- **캐시/갱신**: `@tanstack/react-query` (useQuery, useMutation, queryClient.invalidateQueries)
- **알림**: `react-hot-toast` (성공/실패 메시지)
- **라우팅**: `react-router` (Link, useParams, useNavigate)

---

## 7. 참고

- 백엔드 API 스펙은 별도 문서(발주 모듈 API) 참고.
- 목록 API에 페이지네이션 파라미터가 없으면, 현재는 **전체 조회 후 클라이언트에서 구간·필터·페이지네이션** 처리합니다.
