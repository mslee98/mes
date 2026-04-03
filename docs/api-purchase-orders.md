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

## 공통 품목 `items` (참고)

- 보드/부품 등 공통 마스터. 선택 필드: `spec`, `manufacturer`.

---

프론트 구현: `src/api/products.ts`, `src/api/purchaseOrder.ts`, `src/api/approvalRequests.ts`, 발주 폼 `OrderForm.tsx`, 상세 `OrderDetail.tsx`.
