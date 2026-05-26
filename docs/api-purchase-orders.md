# 발주·제품 정의·결재 API 요약 (프론트 연동)

## 공통

- API 베이스 경로: `/api` (예: `GET /api/products`, `POST /api/purchase-orders`).

## 발주 라인 (order_items)

- **이전**: 라인에 `itemId` + items 마스터.
- **이후**: 라인에 `productDefinitionId` 또는 별칭 `definitionId` (둘 중 하나). `itemId`만내면 오류.
- 생성/수정 본문 필드 예: `quantity`/`qty`, `quantityUnitCode`/`unit`, `unitPrice`, `currencyCode`, `requestedDueDate`, `note` 등.
- 응답: 관계는 `item` 대신 `productDefinition` (필요 시 `productDefinition.product`).
- 스냅샷(문자열): `productNameSnapshot`, `definitionNameSnapshot`, `versionSnapshot`, `orderTypeSnapshot`.

**UI**: 대표 제품 선택 → 해당 제품의 제품 정의 선택 (`GET /api/products` → `GET /api/products/:id/definitions`).

## 제품·제품 정의

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/api/products` | 활성 대표 제품 목록 |
| GET | `/api/products/:id` | 대표 제품 단건 |
| GET | `/api/products/:id/definitions` | 해당 제품의 제품 정의 목록 |
| GET | `/api/product-definitions/:id` | 제품 정의 단건 |

## 결재 (approval_requests)

- 경로: `/api/approval-requests/...` (이전 `approval-documents` 대체).
- 예: `GET /api/approval-requests/:id`, `POST .../:id/approve`, `POST .../:id/reject`.
- 발주 상세: `currentApprovalDocument*` 제거 → `currentApprovalRequest` (최신 1건, `lines`, `requestedBy` 등).
- 상신 본문 `lines[]`: 단계 번호는 `stepOrder` 권장 (`stepNo` 호환). 라인 필드명은 `status` (구 `lineStatus` 대체).

## 발주 헤더에서 빠진 필드

다음은 더 이상 내려오지 않음 (결재는 `approval_requests`로만 추적):

- `firstApproverUserId` / `firstApprover`
- `approvalSubmittedAt`, `approvalApprovedAt`, `approvalApprovedBy` / `approvalApprovedById`
- `currentApprovalDocumentId`, `currentApprovalDocument`

## 납품 등록

- `order.status === 'PO_CLOSED'` 일 때만 납품 등록 가능 (백엔드 검사).

## 생산 계획 · Unit (production_plans)

프론트·백엔드 LOT 연동 상세: [`backend-handoff-production-plan-lot.md`](./backend-handoff-production-plan-lot.md)

발주 → 생산 계획(`POST .../production-plans` — `items` 또는 `lines` 수량만, LOT·Unit 서버 자동) → 공정 PASS/FAIL → 제품 시리얼 확정(`assign-product-serials`) → 실제 납품(`POST .../deliveries`) → 납품 라인에 Unit 연결.

| 메서드 | 경로 | 본문 / 비고 |
|--------|------|-------------|
| GET | `/api/purchase-orders/:purchaseOrderId/production-plans` | 발주별 목록 (`purchase_order.read`). `planSeq` 오름차순, 관계(담당자·항목·유닛·검출기 등) 포함. |
| GET | `/api/purchase-orders/:purchaseOrderId/lot/preview` | `quantity`, `issuedDate` — `previews[].unitCode` (DB 예약 없음) |
| POST | `/api/purchase-orders/:purchaseOrderId/production-plans` | `deliveryDate` 필수. `items: [{ purchaseOrderItemId, plannedQty }]` — **`serials` 금지**, `items[].units = []` |
| GET | `/api/purchase-orders/production-plans/:planId` | 생산 계획 단건 상세 (`items[].units[]`, `unitCode`=LOT) |
| POST | `/api/purchase-orders/production-plans/:planId/issue-lot-units` | `{}` 또는 `items: [{ planItemId, quantity }]` — LOT 확정 발급 |
| POST | `/api/purchase-orders/production-plans/:planId/assign-product-serials` | `{ units: [{ unitId, serialNo(전체, 예: `YIM_EI0640PA-PC0001`), detectorElementCode, wavelengthCode, detectorId? }], markPlanCompleted? }` — 서버는 `^(.*?)(\d{4})$` 파싱, 4자리만내면 오류 |
| POST | `/api/purchase-orders/production-plan-items/:planItemId/units` | `{}` — `plannedQty`만 +1 (LOT 없음) |
| POST | `/api/purchase-orders/production-plan-units/:unitId/process/pass` | `{ processCode, processName, startedAt?, endedAt? }` |
| POST | `/api/purchase-orders/production-plan-units/:unitId/process/fail` | `{ processCode, processName, failReason, actionTaken?, startedAt?, endedAt? }` |
| GET | `/api/purchase-orders/production-plan-units/:unitId/process-records` | 공정 이력 배열 |
| GET | `/api/production-plan-units/overview`, `/tab-counts`, 목록 | 생산 유닛 대시보드 |
| POST | `/api/purchase-orders/delivery-items/:deliveryItemId/units` | `{ unitIds: string[] }` — 출고 준비 완료·미출고 Unit만 연결 권장 (실납품 품목) |

**프론트 라우트**: `/order/:orderId/plan/:planId` — 계획 상세·Unit 보드.

**프론트**: 발주 상세 생산 계획 카드에서 목록 링크·`생산 계획 만들기` 제공.

**유닛 상태 필드(1차 유지)**: `isDeliveryReady`, `isDelivered`, `deliveredAt` — JSON 키 변경 없음.

## 공통 품목 `items` (참고)

- 보드/부품 등 공통 마스터. 선택 필드: `spec`, `manufacturer`.

## 검출기 (detectors)

| 메서드 | 경로 | 용도 |
|--------|------|------|
| GET | `/api/detectors` | 검출기 목록 |
| GET | `/api/detectors/:id` | 검출기 단건 |
| POST | `/api/detectors` | 검출기 등록 |
| PATCH | `/api/detectors/:id` | 검출기 수정 |

- `partnerId`(nullable FK) 지원:
  - 셀렉트에서 기존 거래처를 선택한 경우 `partnerId`에 거래처 UUID 저장
  - 직접 입력(legacy 고객명)인 경우 `partnerId: null`
- `customerName`은 화면 표시/검색 호환을 위해 함께 사용 가능
- DB FK 정책: `partner_id -> partners(id)`, `ON DELETE SET NULL`

---

프론트 구현: `src/api/products.ts`, `src/api/purchaseOrder.ts`, `src/api/approvalRequests.ts`, 발주 폼 `OrderForm.tsx`, 상세 `OrderDetail.tsx`.
