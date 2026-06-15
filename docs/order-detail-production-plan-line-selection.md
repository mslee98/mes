# 발주 상세 · 생산 계획 등록 — 품목별 선택 (방안 A)

## 개요

발주 상세 `OrderDetail` 생산 계획 모달에서 **품목별 선택 + 이번 생산수량**으로 `POST .../production-plans` 의 `items[]` 를 구성합니다.

- 자동 순서 분배(`distributeProductionPlanItems`)는 **plan 모달에서 사용하지 않음**
- 실납품 모달(`actual`)은 기존 합산 수량 UI 유지

## UI

### 기본 정보

- 생산 계획명 (`title`)
- IDCCA 인수일 (`deliveryDate`, 필수)
- 생산 예정일 (`plannedDeliveryDate`, 필수)
- 관리 담당자 (`productionManagerId`)
- 비고 (`remark`)

### 대상 발주 품목

| 컬럼 | 설명 |
|------|------|
| 선택 | 체크박스, 미계획 0이면 비활성 |
| 품목명 | `getOrderLineDisplayName` |
| 발주수량 | `line.qty` |
| 미계획수량 | `qty - registered` |
| 이번 생산수량 | 미선택 시 비활성 |
| 잔여 | 선택 시 `미계획수량 - 이번 생산수량`, 미선택 시 `-` |

### 수량 통계 (발주 전체)

품목별 이번 생산수량 입력 합계에 따라 **발주 · 생산 등록 · 잔여** 표시 (기존 단일 입력 UI와 동일).

### LOT 미리보기

| No | 품목명 | LOT 번호 | 생산 담당자 | 비고 |
|----|--------|----------|-------------|------|

## Payload 예시

```json
{
  "deliveryDate": "2026-06-15",
  "plannedDeliveryDate": "2026-06-20",
  "title": "…",
  "items": [
    { "purchaseOrderItemId": 101, "plannedQty": 2 },
    { "purchaseOrderItemId": 102, "plannedQty": 1 }
  ]
}
```

## 프론트 검증

| 규칙 | 메시지 |
|------|--------|
| 선택 품목 ≥ 1, 수량 ≥ 1 | `선택한 품목의 생산 수량을 입력해주세요.` |
| 이번 수량 ≤ 미계획 | `미계획 수량을 초과할 수 없습니다.` |
| 생산 예정일 ≥ IDCCA 인수일 (당일 허용) | `완료예정일은 IDCCA 인수일 이후 날짜로 선택해주세요.` |
| LOT 행 수 = Σ plannedQty | `LOT 미리보기가 현재 생산 수량과 맞지 않습니다.` |

구현: [`src/domains/production-plan/helpers/lineSelection.ts`](../src/domains/production-plan/helpers/lineSelection.ts)

## 백엔드 권장 검증

프론트와 동일 규칙을 `POST .../production-plans` 에서도 적용 권장:

- `items.length >= 1`
- 각 `purchaseOrderItemId` 가 해당 발주 소속
- 각 `plannedQty >= 1` 및 미계획(잔여) 이하
- `plannedDeliveryDate >= deliveryDate` (날짜 필드명은 API 스펙에 맞게)

자세한 LOT·발급 흐름: [`backend-handoff-production-plan-lot.md`](./backend-handoff-production-plan-lot.md)

## 관련 파일

- [`src/pages/OrderDetail.tsx`](../src/pages/OrderDetail.tsx)
- [`src/components/order/ProductionPlanLineSelectionTable.tsx`](../src/components/order/ProductionPlanLineSelectionTable.tsx)
- [`src/components/order/ProductionPlanOrderQtyStats.tsx`](../src/components/order/ProductionPlanOrderQtyStats.tsx)
- [`src/domains/order/display/orderLineDisplay.ts`](../src/domains/order/display/orderLineDisplay.ts)
