# 제품·제품 정의

**API 공통**: [FRONTEND_API.md](../FRONTEND_API.md)

**발주 연동**: [ORDER.md](./ORDER.md)

---

## 1. 핵심 원칙

```text
발주 대상 = item           ❌
발주 대상 = product_definition   ✅

제품은 단순하게 (대표 product)
구성은 내부적으로 관리 (definition · item · revision)
```

| 개념 | 역할 |
|------|------|
| `products` | 사용자에게 보이는 **대표 제품** (MARKOS, ICE1280) |
| `product_definitions` | 실제 **생산/발주 기준** (군수/민수, 버전, BOM·공정) |
| `items` | 보드·하우징·부품 등 **공통 품목** |
| `item_revisions` | 도면/버전 관리 단위 |
| `order_items` | 발주 라인 — **`product_definition_id` 저장** |

---

## 2. 도메인 관계 (요약)

```text
partners → orders → order_items → product_definitions → products
                                        │
                                        ▼
                        product_definition_item_revisions
                                        │
                                        ▼
                               item_revisions → items
```

**BOM 정책**: 전자 BOM은 선택적(파일 참조). 하우징·기구 파트는 리비전·도면·업체 생산 가능 여부(`partner_item_revisions`)까지 관리.

**도면 연결**: `file_links` — `target_type = ITEM_REVISION`, `target_id = item_revision.id`

---

## 3. 프론트 UX

### 핵심 한 문장

**제품 목록은 단순하게 유지**합니다. 사용자는 **대표 제품**을 선택하고, 시스템이 **발주유형 / 프로젝트**에 맞는 `product_definition`을 **자동 추천**하거나 후보 중 선택하게 합니다.

### 권장 사용자 흐름

1. 발주유형·프로젝트 선택
2. 대표 **제품** 선택
3. definition 후보 조회 → 1건이면 자동, N건이면 선택
4. 발주 라인 저장 (`product_definition_id`)

### 화면 구조 (목표)

```text
제품 목록 → 제품 상세 → 제품 정의 목록 → 정의 상세 (구성 / BOM / 공정 탭)

발주 등록 → 거래처 → 발주유형 → 프로젝트 → 제품 → 정의 → 라인 저장
```

### 표시 규칙

| 구분 | 기준 |
|------|------|
| 화면 라벨·목록 | **product** 중심 |
| 저장·API | **productDefinitionId** |

---

## 4. API

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/api/products` | 활성 대표 제품 목록 |
| GET | `/api/products/:id` | 대표 제품 단건 |
| GET | `/api/products/:id/definitions` | 제품 정의 목록 |
| GET | `/api/product-definitions/:id` | 제품 정의 단건 |

**공통 품목 `items`** (보드/부품 마스터, 발주 라인과 별개):

- `GET/POST/PATCH /api/items` 등 — `src/api/items.ts`
- 선택 필드: `spec`, `manufacturer`

---

## 5. 구현 파일

| 경로 | 역할 |
|------|------|
| `src/api/products.ts` | 대표 제품·정의 API |
| `src/pages/OrderForm.tsx` | 발주 등록 시 제품·정의 선택 |
| `/products`, `/items` 라우트 | 제품·품목 관리 화면 |

> **현재 단순화**: 신규 발주에서 정의 열을 숨기고 해당 제품의 **첫 definition**을 자동 사용하는 경우가 있음. 발주유형·프로젝트 연동 후보 조회·다건 선택 UI는 백엔드 API와 함께 확장 예정.

---

## 6. 레거시 — items 마스터 화면

구 **item 중심** 발주 이전에 쓰이던 품목 마스터 CRUD입니다. 발주 라인 기준은 `product_definition`으로 전환되었으나, 분류·유형·items API는 보조 마스터로 유지됩니다.

| 경로 | 컴포넌트 |
|------|----------|
| `/item-categories` | `ItemCategories.tsx` |
| `/item-types` | `ItemTypes.tsx` |
| `/items`, `/items/new`, `/items/:itemId` | `Items.tsx`, `ItemForm.tsx`, `ItemDetail.tsx` |

API: `src/api/items.ts` — `getItemCategories`, `getItems`, `createItem` 등. 상세 표는 소스·[FRONTEND_API.md](../FRONTEND_API.md) 참고.

---

## 7. 도입 전략

1. `product_definition` 도입
2. `order_items.product_definition_id` 추가
3. **신규 발주**부터 적용, 기존 item 구조는 점진 전환

```text
구조 변경 ❌  /  구조 확장 ✅
```
