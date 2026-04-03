# 발주 모듈 (프론트엔드) 정리

**API 공통 규칙·엔드포인트 표**: [FRONTEND_API.md](./FRONTEND_API.md) (특히 §4 발주)

**의미**: 타 업체가 **우리 회사에게** 발주 요청한 건을 관리하는 모듈입니다. (우리 회사 → 타 업체 발주가 아님)

**품목·대표 제품(선행)**: 발주 라인은 **`product_definition_id` 기준**이며, 화면에서는 **대표 제품(`products`)**을 선택합니다. SKU 단위 품목 마스터는 [ITEMS.md](./ITEMS.md), 대표 제품·정의 API·화면은 앱 내 `/products`, `/items` 및 `src/api/products.ts` 등을 참고.

**대표 제품 vs 제품 정의 UX**: [FRONTEND_PRODUCT_DEFINITION_UX.md](./FRONTEND_PRODUCT_DEFINITION_UX.md)

**도메인 전체 정의(리비전·BOM·도면·order_items 변경 방향)**: [DOMAIN_PROCESS_STRUCTURE.md](./DOMAIN_PROCESS_STRUCTURE.md)

---

## 1. 요약

| 구분 | 내용 |
|------|------|
| **라우트** | `/order` 목록, `/order/new` 등록, `/order/:orderId` 상세, `/order/:orderId/edit` 수정 |
| **API Base** | **공통** `src/api/apiBase.ts`의 `API_BASE` (호스트 + `/api`, 예: `http://localhost:3000/api`) — auth·메뉴·유저·발주 등 전체가 동일 prefix 사용 |
| **인증** | `Authorization: Bearer <access_token>` 필수 (로그인 후 사용) |
| **주요 화면** | 발주 목록(필터/검색), 발주 상세(납품·첨부), 발주 등록/수정 폼 |

---

## 2. 라우트·파일 매핑

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/order` | `pages/Order.tsx` | 발주 목록, 필터(거래처/발주상태/승인상태), 검색, 페이지네이션 |
| `/order/new` | `pages/OrderForm.tsx` | 발주 신규 등록 (헤더 + 제품 여러 건) |
| `/order/:orderId` | `pages/OrderDetail.tsx` | 발주 상세, 납품 등록, 첨부파일 |
| `/order/:orderId/edit` | `pages/OrderForm.tsx` | 발주 헤더만 수정 (제품 수정 불가) |

---

## 3. API 모듈 (`src/api/purchaseOrder.ts`)

### 3.1 Base URL

- **공통**: `src/api/apiBase.ts`에서 `API_BASE` export (호스트 + `/api`)
- 호스트 = `import.meta.env.VITE_AUTH_BASE_URL ?? "http://localhost:3000"`
- 이미 `/api`로 끝나면 그대로 사용, 아니면 뒤에 `/api` 붙임 → auth, menus, users, 발주 등 **모든 API**가 `API_BASE` 사용

### 3.2 UI (검색 셀렉트 + 추가)

- 발주 등록/수정·발주 목록 필터에서 **거래처**는 `react-select` 기반 `SearchableSelectWithCreate`로 검색 후 선택합니다.
- **거래처**는 라벨 옆 **information-circle** 팝오버에서 **「거래처 등록」**으로 `PartnerQuickCreateModal`을 엽니다(발주 등록·목록 필터). 제품 행은 기존처럼 셀렉트 아래 점선 **추가** 버튼을 유지합니다.
- 발주 등록의 **제품** 행도 동일 패턴으로 **「제품 추가」** → `ItemQuickCreateModal` → `POST /items` (제품 분류·유형 필수).

### 3.3 타입 (주요)

| 타입명 | 용도 |
|--------|------|
| `Partner` | 거래처 (id, code, name, …) |
| `PartnerCreatePayload` | 거래처 생성 Body |
| `Item` | 제품 (id, code, name, spec, unit, …) |
| `PurchaseOrderListItem` | 목록 1건 (id, orderNo, title, partnerId, partner, orderDate, dueDate, orderStatus, approvalStatus, totalQty, totalAmount, …) |
| `PurchaseOrderDetail` | 상세 1건 (ListItem 확장 + requestDeliveryDate, vendorOrderNo, vendorRequest, specialNote, items, createdBy) |
| `PurchaseOrderItem` | 발주 제품 1건 (id, itemId, item, itemName, spec, unit, qty, unitPrice, amount, deliveredQty, …) |
| `PurchaseOrderCreatePayload` | 발주 생성 Body (title, partnerId, orderDate, dueDate, requestDeliveryDate, vendorOrderNo, vendorRequest, specialNote, **items[]**) |
| `PurchaseOrderUpdatePayload` | 발주 수정 Body (헤더 필드만, 제품 없음) |
| `PurchaseOrderFile` | 첨부파일 1건 |
| `Delivery`, `DeliveryCreatePayload`, `DeliveryItemPayload` | 납품 관련 |
| `CodeItem` | 공통코드 1건 (groupCode, code, name, …) |

### 3.4 API 함수 목록

| 분류 | 함수명 | 메서드/경로 | 설명 |
|------|--------|-------------|------|
| **발주** | `getPurchaseOrders(accessToken, params?)` | GET `/purchase-orders` | 목록 (query: partnerId, orderStatus, approvalStatus) |
| | `getPurchaseOrder(id, accessToken)` | GET `/purchase-orders/:id` | 상세(응답에 `orderItems` + `item` 관계 권장) |
| | `createPurchaseOrder(payload, accessToken)` | POST `/purchase-orders` | 생성 |
| | `updatePurchaseOrder(id, payload, accessToken)` | PUT `/purchase-orders/:id` | 헤더 수정 |
| **제품** | `getPurchaseOrderItems(id, accessToken)` | GET `/purchase-orders/:id/lines` | 품목 라인만(상세에 라인 없을 때 보조) |
| **첨부** | `uploadPurchaseOrderFile(id, file, accessToken)` | POST `/purchase-orders/:id/files` | multipart 업로드 |
| | `getPurchaseOrderFiles(id, accessToken)` | GET `/purchase-orders/:id/files` | 첨부 목록 |
| **납품** | `createDelivery(purchaseOrderId, payload, accessToken)` | POST `/purchase-orders/:id/deliveries` | 납품 등록 |
| | `getDeliveries(purchaseOrderId, accessToken)` | GET `/purchase-orders/:id/deliveries` | 납품 목록 |
| **드롭다운** | `getPartners(accessToken)` | GET `/partners` | 거래처 목록 |
| | `createPartner(payload, accessToken)` | POST `/partners` | 거래처 등록 (빠른 등록 모달) |
| | `getItems(accessToken)` | GET `/items` | 제품 목록 |
| | `getCommonCodesByGroup(groupCode, accessToken)` | GET `/common-codes/groups/:groupCode/codes` | 공통코드 목록 (**표준**) |
| | `getCodeGroupCodes(groupCode, accessToken)` | GET `/code-groups/:groupCode/codes` | 동일 목록 (**별칭**, 표준과 동일 응답) |

> **백엔드 참고**: 발주 **상태 이력**은 `GET /purchase-orders/:id/status-histories`로 제공됩니다. 현재 프론트 모듈에서는 연동하지 않으며, 구 경로 `…/approvals`, `…/histories`는 사용하지 않습니다.

---

## 4. 페이지별 기능 정리

### 4.1 발주 목록 (`Order.tsx`)

- **데이터**: `getPurchaseOrders(accessToken, { partnerId, orderStatus, approvalStatus })`
- **필터(쿼리)**: 거래처, 발주 상태(`PURCHASE_ORDER_STATUS`), 승인 상태(`APPROVAL_STATUS`)
- **검색**: 발주번호·제목·거래처명 키워드, 발주 일자 구간 → 클라이언트 필터
- **테이블**: 발주번호(클릭 시 상세), 제목, 거래처, 발주일, 요청납기, 발주 상태, 승인 상태, 총 금액
- **버튼**: 「발주 추가」 → `/order/new`

### 4.2 발주 상세 (`OrderDetail.tsx`)

- **데이터**: `getPurchaseOrder`, `getPurchaseOrderFiles`, `getDeliveries`
- **표시**: 발주 정보, 발주 제품 테이블, 첨부파일 목록, 납품 목록
- **액션**  
  - **수정**: `/order/:orderId/edit` 링크  
  - **첨부**: 파일 선택 → `uploadPurchaseOrderFile(id, file)`  
  - **납품 등록**: 모달에서 납품일, 제품별 납품 수량/LOT/비고 입력 → `createDelivery(purchaseOrderId, payload)`

### 4.3 발주 등록 (`OrderForm.tsx`, `orderId === "new"`)

- **기본 정보**: 발주 ID(자동 부여 안내·비활성), 제목, 발주일자·납품예정일자·납품요청일자(DatePicker/flatpickr), 업체명(검색 셀렉트), 업체발주번호, 업체요청사항·특이사항(TextArea)
- **발주 제품**: 제품 기본 통화(Select), 행 추가/삭제, 제품(SearchableSelect+제품 빠른 등록 모달), 수량, 통화·단가(SelectInput), 납품 요청일(DatePicker), 비고
- **제출**: `createPurchaseOrder(payload)` (헤더 + `items[]`) → 성공 시 `/order/:id` 이동

### 4.4 발주 수정 (`OrderForm.tsx`, `orderId` 숫자)

- **수정 가능**: 기본 정보 필드(발주 ID는 표시만 비활성)
- **제품**: 읽기 전용 테이블(API는 헤더 `PUT`만 가정). 변경은 상세 등 다른 화면에서.
- **제출**: `updatePurchaseOrder(id, payload)` → 성공 시 `/order/:id` 이동

---

## 5. 공통코드 사용

백엔드에서 `GET /common-codes/groups/{groupCode}/codes` 와 `GET /code-groups/{groupCode}/codes` 는 **같은 서비스·같은 응답**입니다. 프론트는 다음처럼 쓰고 있습니다.

- **발주 상태** 필터 (`Order.tsx`): `getCommonCodesByGroup` → `PURCHASE_ORDER_STATUS` (**표준** 경로)
- **승인 상태** 필터 (`Order.tsx`): `getCodeGroupCodes` → `APPROVAL_STATUS` (**별칭** 경로, 응답은 표준과 동일)
- **발주 폼/상세** 등: `commonCode.ts`의 `getCommonCodesByGroup` 위주

문서상 그룹 예: `PURCHASE_ORDER_STATUS`, `APPROVAL_STATUS`, `PROGRESS_STATUS`, `DELIVERY_STATUS`, `FILE_TYPE`, `UNIT`  
→ 그룹별 코드만 필요하면 `getCommonCodesByGroup(groupCode, accessToken)` 권장. 기존 호환으로 `getCodeGroupCodes` 도 동일 데이터를 반환합니다.

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
