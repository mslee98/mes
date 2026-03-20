# 제품 관리 모듈 (프론트엔드)

**의미**: 발주에 사용할 **제품 분류**, **제품 유형**, **제품 마스터**를 관리하는 모듈입니다. 발주 등록 전에 제품을 등록·관리해야 합니다.

---

## 제품 관리 4단계 워크플로

권장 진행 순서는 아래와 같습니다.

| 단계 | 내용 | 현재 지원 |
|------|------|-----------|
| **1단계** | **제품 마스터 먼저** — 검출기 중심으로 제품을 등록합니다. (예: 냉각형 적외선 검출기, 비냉각형 적외선 검출기, SWIR 검출기, X-ray 검출기) | 제품 등록/수정 폼으로 가능 |
| **2단계** | **제품 분류 · 제품 유형 · 속성 정의** — 분류(예: SENSOR_IR_COOLED), 유형(예: DETECTOR), 속성 정의(예: BAND, DETECTOR_TECH, PIXEL_PITCH)를 함께 정의합니다. | 분류·유형 CRUD 있음. 속성 정의는 백엔드 API(api-items-management.md 또는 전용 엔드포인트) 확정 시 연동 예정 |
| **3단계** | **제품별 속성값** — 제품마다 속성값을 입력합니다. (예: CD-MWIR-T2SL-1280-10 → MWIR / T2SL / 1280x1024 / 10 / 25 / 99.5) | 상세 화면에서 속성값 읽기 전용 표시. **저장**은 백엔드 API(PUT /items/:id 의 attributeValues 또는 전용 엔드포인트) 지원 시 편집 UI 추가 예정 |
| **4단계** | **발주에서 제품 참조 + 규격 스냅샷** — 발주 시 제품은 마스터에서 선택하고, 규격은 문구로 따로 저장(스냅샷)합니다. | 제품 선택은 발주 쪽에서 getItems 사용. 규격 스냅샷 저장 구조는 발주 API/스키마에 따름 (별도 작업) |

- **1단계**: [제품 등록](/items/new)에서 분류·유형을 선택하고 코드·이름·규격·단위 등을 입력해 제품 마스터를 먼저 채웁니다.
- **2단계**: [제품 분류](/item-categories), [제품 유형](/item-types)에서 분류·유형을 정의합니다. 속성 정의는 백엔드 API 확정 후 관리 화면 또는 유형 상세 내 블록으로 추가할 예정입니다.
- **3단계**: 제품별 속성값 입력/수정은 위 API 지원 시 ItemForm 또는 ItemDetail에 "속성값" 편집 블록을 추가하는 형태로 구현합니다.
- **4단계**: 발주 모듈에서 제품 선택 시 `src/api/items.ts`의 getItems를 사용하고, 규격 스냅샷은 발주 라인(주문 제품) 엔티티에 저장하는 방식이 가능한지 [PURCHASE_ORDER.md](PURCHASE_ORDER.md)를 참고해 확인합니다.

---

## 1. 요약

| 구분 | 내용 |
|------|------|
| **라우트** | `/item-categories` 제품 분류, `/item-types` 제품 유형, `/items` 제품 목록, `/items/new` 제품 등록, `/items/:itemId` 상세, `/items/:itemId/edit` 수정 |
| **API Base** | `src/api/apiBase.ts`의 `API_BASE` (발주·메뉴 등과 동일) |
| **인증** | `Authorization: Bearer <access_token>` 필수 |
| **주요 화면** | 제품 분류(트리 + CRUD), 제품 유형(목록 + CRUD), 제품 목록(필터/검색), 제품 상세/등록/수정 |

---

## 2. 라우트·파일 매핑

| 경로 | 컴포넌트 | 설명 |
|------|----------|------|
| `/item-categories` | `pages/ItemCategories.tsx` | 제품 분류 트리, 추가/수정/삭제 (하위 있으면 삭제 불가) |
| `/item-types` | `pages/ItemTypes.tsx` | 제품 유형 목록, 모달로 추가/수정/삭제 |
| `/items` | `pages/Items.tsx` | 제품 목록, 필터(분류·유형·제품구분·활성), 검색, 페이지네이션 |
| `/items/new` | `pages/ItemForm.tsx` | 제품 신규 등록 |
| `/items/:itemId` | `pages/ItemDetail.tsx` | 제품 상세 (속성값 포함 시 표시) |
| `/items/:itemId/edit` | `pages/ItemForm.tsx` | 제품 수정 |

---

## 3. API 모듈 (`src/api/items.ts`)

### 3.1 제품 분류 (item-categories)

| 함수 | 메서드/경로 | 비고 |
|------|-------------|------|
| `getItemCategories(token, params?)` | GET `/api/item-categories` | `params.tree === true` 시 트리 |
| `getItemCategory(id, token)` | GET `/api/item-categories/:id` | 단건 |
| `createItemCategory(payload, token)` | POST `/api/item-categories` | parentId 선택 |
| `updateItemCategory(id, payload, token)` | PUT `/api/item-categories/:id` | |
| `deleteItemCategory(id, token)` | DELETE `/api/item-categories/:id` | 하위 있으면 400 |

### 3.2 제품 유형 (item-types)

| 함수 | 메서드/경로 |
|------|-------------|
| `getItemTypes(token)` | GET `/api/item-types` |
| `getItemType(id, token)` | GET `/api/item-types/:id` |
| `createItemType(payload, token)` | POST `/api/item-types` |
| `updateItemType(id, payload, token)` | PUT `/api/item-types/:id` |
| `deleteItemType(id, token)` | DELETE `/api/item-types/:id` |

### 3.3 제품 마스터 (items)

| 함수 | 메서드/경로 | 비고 |
|------|-------------|------|
| `getItems(token, params?)` | GET `/api/items` | params: categoryId, itemTypeId, productDiv, isActive |
| `getItem(id, token, withAttributes?)` | GET `/api/items/:id` | withAttributes=true 시 속성 포함 |
| `createItem(payload, token)` | POST `/api/items` | |
| `updateItem(id, payload, token)` | PUT `/api/items/:id` | |
| `deleteItem(id, token)` | DELETE `/api/items/:id` | 비활성화(소프트 삭제) |

**제품 API 요청 body 필드 매핑**: 명세에 맞춰 POST/PUT items는 `code`, `name`, `categoryId`, `itemTypeId`, `productDiv`, `spec`, `unit`을 전송합니다. 단가가 필요한 경우 `standardPrice`를 추가로 보낼 수 있으며, 백엔드가 다른 필드명을 기대하면 [src/api/items.ts](src/api/items.ts)의 createItem/updateItem body를 수정합니다.

---

## 4. 사용 흐름

1. **분류/유형 관리**: `GET /api/item-categories?tree=true`, `GET /api/item-types`로 드롭다운 구성 후, POST/PUT으로 분류·유형 등록/수정.
2. **제품 목록**: `GET /api/items?categoryId=2&itemTypeId=1` 등으로 필터 조회.
3. **제품 등록/상세**: 분류·유형 선택 후 `POST /api/items` 또는 `PUT /api/items/:id`. 상세 시 `GET /api/items/:id?withAttributes=true`로 속성값까지 조회(2단계에서 활용).
4. **발주**: 기존처럼 `GET /api/items`로 제품 선택 후 발주 제품에 item_id 등 전달. (`purchaseOrder.ts`의 `getItems(accessToken)` 또는 `items.ts`의 `getItems(token, params?)` 사용 가능)

---

## 5. 발주와의 연동

- 발주 등록 화면(`OrderForm.tsx`)에서는 `purchaseOrder.getItems(accessToken)`으로 제품 목록을 가져와 제품 선택 드롭다운에 사용합니다.
- 제품 관리 화면은 `src/api/items.ts`의 `getItems(token, params?)`를 사용하며, 필요 시 쿼리 파라미터(categoryId, itemTypeId 등)로 필터링할 수 있습니다.
- **4단계(규격 스냅샷)**: 발주 시 제품은 마스터에서 선택하고, 규격 문구는 발주 라인(주문 제품)에 따로 저장하는 구조가 필요하면 발주 API/스키마에 규격 스냅샷 필드를 두고 OrderForm 등에서 연동합니다.

### 5.1 단가 통화 확장 (원·달러·엔)

백엔드 반영 완료 후 프론트 연동이 적용된 상태입니다.

| 구분 | 내용 |
|------|------|
| **공통코드** | 그룹 `CURRENCY` 시드(KRW, USD, JPY). `GET /api/common-codes/groups/CURRENCY/codes`로 조회 후 Select 옵션 사용 |
| **제품(Item)** | 엔티티/DTO에 `currencyCode`(기본 'KRW'). ItemForm에서 통화 Select + payload에 `currencyCode` 전송. 목록/상세는 `formatCurrency(amount, item.currencyCode)` |
| **발주 헤더** | `purchase_orders.currencyCode`. OrderForm에서 "기본 통화" Select, Create/Update 시 `currencyCode` 전송 |
| **발주 제품** | `purchase_order_items.currencyCode`. 행별 통화 Select, 생성 시 `row.currencyCode → order.currencyCode → item.currencyCode → KRW` 우선순위로 백엔드 적용 |
| **표시** | `src/lib/formatCurrency.ts`의 `formatCurrency(amount, currencyCode ?? 'KRW')`. 제품·발주 목록/상세에서 통화별 포맷(원/달러/엔) 적용 |

---

## 6. 제품 프로세스별 검토

프로세스 정의(기준 데이터 → 제품 마스터 → 스펙/구성 → 발주 사용) 기준으로 현재 구현 상태를 점검한 결과입니다.

### 6.1 기준 데이터 (1단계)

| 요구 | 구현 | 비고 |
|------|------|------|
| 분류 트리 | ✅ | `GET /api/item-categories?tree=true` — ItemForm, Items, ItemCategories에서 사용 |
| 제품 유형 목록 | ✅ | `GET /api/item-types` — ItemForm, Items, ItemTypes에서 사용 |
| 단위(UNIT) 공통코드 | ✅ | ItemForm에서 `GET /api/common-codes/groups/UNIT/codes`로 단위 목록 조회 후 Select로 선택. 수정 시 기존 값이 목록에 없으면 "(기존값)" 옵션으로 표시 |
| 상태(ITEM_STATUS) 등 | ⚠️ | 제품 목록/상세에서 isActive만 사용. 공통코드로 확장 시 동일 패턴으로 드롭다운 채우기 가능 |

### 6.2 제품 목록 (3.2)

| 요구 | 구현 | 비고 |
|------|------|------|
| GET /api/items + categoryId, itemTypeId, productDiv, isActive | ✅ | [Items.tsx](src/pages/Items.tsx) listParams로 전달 |
| 분류/유형 필터 UI | ✅ | 검색 옵션에서 분류·유형 Select (트리 flatten 후 옵션) |
| 테이블: 코드, 제품명, 분류, 유형, 단위, 상태 | ✅ | 코드·제품명·분류·유형·규격·단위·단가·상태 컬럼 표시 |
| 행 클릭 → 상세 | ✅ | 행 클릭 시 `/items/:id`로 이동 |

### 6.3 제품 상세 / 등록·수정 (3.3)

| 요구 | 구현 | 비고 |
|------|------|------|
| 상세 조회(스펙 포함) | ✅ | `getItem(id, token, true)` — ItemDetail에서 withAttributes=true 고정 |
| 등록 POST /api/items | ✅ | ItemForm → createItem (code, name, categoryId, itemTypeId, unit, spec, productDiv 등) |
| 수정 PUT /api/items/:id | ✅ | ItemForm → updateItem |
| 비활성화 DELETE /api/items/:id | ✅ | ItemDetail에서 삭제 시 deleteItem 호출 |
| 폼: 분류(트리)·유형 선택 | ✅ | categoryOptions(flatten 트리), itemTypeOptions로 Select |
| 폼: 단위 | ✅ | 공통코드 그룹 UNIT Select (ItemForm) |
| 상세: 스펙(속성값) 표시 | ✅ | attributes 있으면 "속성값" 카드에 읽기 전용 테이블 표시 |

### 6.4 속성값(스펙) 편집 (3.4)

| 요구 | 구현 | 비고 |
|------|------|------|
| 조회 전용 표시 | ✅ | ItemDetail에서 i.attributes 테이블로 표시 |
| 저장/수정 API | ❌ | 백엔드 item-attributes, items/:id/attribute-values 미구현 시 프론트 편집 UI 보류 (정의대로 2차 대응) |

### 6.5 제품 관계(BOM) (3.5)

| 요구 | 구현 | 비고 |
|------|------|------|
| BOM/구성 관계 화면 | ❌ | 관계용 API 없음. API 추가 후 조회/추가/삭제 UI 구현 예정 |

### 6.6 발주에서 제품 사용 (3.6)

| 요구 | 구현 | 비고 |
|------|------|------|
| 제품 선택 GET /api/items | ✅ | OrderForm은 [purchaseOrder.getItems(accessToken)](src/api/purchaseOrder.ts) 호출 → 동일하게 GET /api/items 사용 |
| 발주 제품 행: itemId, qty, unitPrice 등 | ✅ | PurchaseOrderItemPayload에 itemId, qty, unitPrice, requestDeliveryDate, remark 포함 |
| itemNameSnapshot / specSnapshot | ⚠️ | 현재 Payload 타입에는 없음. 백엔드가 미입력 시 마스터에서 채우면 생략 가능. 수정용으로 넘기려면 Payload·폼에 필드 추가 후 전송 필요 |

### 6.7 한 줄 요약

- **잘 맞는 부분**: 기준 데이터(분류·유형), 제품 목록/상세/등록/수정/비활성화, 상세 스펙 조회 전용, 발주 제품 선택 및 itemId 전송.
- **보완 권장**: (1) ~~단위를 공통코드 UNIT Select로 바꾸기~~ 완료, (2) 발주 제품 행에 스냅샷 문구 수정용 itemNameSnapshot/specSnapshot 지원 여부를 백엔드와 맞춘 뒤 필요 시 폼/타입 추가.
- **추후(API 연동 후)**: 속성값 편집 UI, BOM/구성 관계 화면.

---

## 7. 메뉴 노출

- 사이드바는 백엔드 `getMyMenus` 결과를 사용하므로, **제품 관리** 메뉴(및 하위: 제품 분류, 제품 유형, 제품 목록)는 백엔드 메뉴/권한 설정에서 path를 위 라우트와 맞춰 등록해야 합니다.
- 라우트만으로도 URL 직접 이동으로 접근 가능합니다.
