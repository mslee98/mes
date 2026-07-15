# FE → BE API 동기화 핸드오프

작성 기준: FE 잔여 동기화 + BE 회신(2026-06, 2차 확인 반영).

---

## 1. FE 동기화 완료 사항

### P0

| 항목 | FE 상태 |
|------|---------|
| 발주 `partnerSummary`, `receive`, `lines[]` | 적용 |
| 공통코드 빈 그룹 | `200 []` (BE 배포 완료 확인), hook `data ?? []` 유지 |
| deprecated 응답 필드 | 발주 `partner`, `priority`, `totalAmountVatIncluded` 미사용 |

### 이번 스프린트

| 항목 | FE 상태 |
|------|---------|
| **Canonical URL** | §3 — 생산·납품·Unit mutation canonical 전환 완료 |
| **라인 요청** | `quantity`, `quantityUnitCode` only |
| **결재** | `stepOrder` only |
| **발주 PUT** | `status` 미전송 |
| **거래처** | `resolvePartnerForDisplay` — §6과 BE 2차 회신 일치 확인 |
| **뒤로가기** | `useGoBack`, `useConfirmLeaveWithGoBack` |

---

## 2. FE가 더 이상 보내지 않는 요청 필드

`items`, `status`(PUT), `qty`/`unit`(라인), `stepNo`, `plannedDate`(PATCH)

**BE 2차:** FE 중단 확인. 서버도 **당분간 수용**, 중단 일정 미정.

---

## 3. URL 전략 (FE 호출 기준)

### 3.1 Canonical 사용 (alias 미호출)

| FE 함수 | Canonical |
|---------|-----------|
| `getProductionPlan` | `GET /production-plans/:planId` |
| `issueProductionPlanLotUnits` | `POST /production-plans/:planId/issue-lot-units` |
| `assignProductSerialsToPlan` | `POST /production-plans/:planId/assign-product-serials` |
| `addProductionPlanPlanItem` | `POST /production-plans/:planId/plan-items` |
| `getDeliveryPlan`, `patchDeliveryPlan`, … | `/delivery-plans/:planId/*` |
| `updateProductionPlanUnit`, process pass/fail, … | `/production-plan-units/:unitId/*` |

**BE 2차 (`plan-items`):** canonical과 alias **둘 다 유효**. FE는 canonical 사용.

### 3.2 구 경로만 (canonical 없음)

| FE 함수 | 경로 |
|---------|------|
| `createProductionPlanItemUnit` | `POST /purchase-orders/production-plan-items/:planItemId/units` |
| `moveProductionPlanItemUnits` | `POST /purchase-orders/production-plan-items/:planItemId/move-units` |
| `createProductionPlan` (발주 하위) | `POST /purchase-orders/:orderId/production-plans` |
| `getPurchaseOrderProductionPlans` | `GET /purchase-orders/:orderId/production-plans` |
| `splitProductionPlan` | `POST /purchase-orders/:orderId/production-plans/split` |
| 발주 납품·결재 | `/purchase-orders/:id/deliveries/*`, `.../approval/*` |

**BE 2차:** `units` / `issue-lot`(canonical) / `move-units`는 위 구분대로. `production-plan-items/...`만 구 경로.

### 3.3 Alias 제거

BE가 **1~2 sprint 전 공지** 후 alias 삭제 예정. FE는 canonical만 호출 중 → 추가 작업 없음.

---

## 4. BE 회신 로그

### 1차 (2026-06)

| 주제 | BE | FE |
|------|-----|-----|
| 공통코드 | `200 []` 배포 완료 | 404 catch 없음, `?? []` 유지 |
| deprecated 요청 | FE 중단 OK, BE 수용 | 반영 완료 |
| partner | API별 상이 (§6) | `resolvePartnerForDisplay` |
| alias | 제거 전 공지 | canonical 사용 |

### 2차 (2026-06, 확인)

| 주제 | BE | FE |
|------|-----|-----|
| 공통코드 | 반영 확인 | — |
| qty/unit/stepNo | 서버도 당분간 수용 | — |
| partnerDisplay | 현재 BE 응답과 일치 | — |
| plan-items | **canonical + alias 둘 다 유효** | canonical로 호출 |
| plan-items 하위 | `units`/`move-units` → `production-plan-items/...` only | 이미 구 경로 |
| alias 제거 | 1~2 sprint 전 공지 | 대기 |
| P1 | Line/Delivery DTO 착수 시 migration doc 공유 예정 | 대기 |

---

## 5. P1 대기 (BE migration doc 수신 후)

| BE 작업 | FE |
|---------|-----|
| Line DTO | `PurchaseOrderItem` mapper |
| `DeliveryDetailDto` | 납품 상세 |
| Unit `partnerSummary` | Unit 화면 |

---

## 6. 거래처 필드 계약

| API | 필드 | FE |
|-----|------|-----|
| 발주 | `partnerSummary` | summary 우선 |
| 생산/납품 목록·계획 | `partner` (4필드) | `partner` |
| 중첩 `purchaseOrder` | `partnerSummary` 보장 | summary 우선 |
| Unit | 확장 `partner` → P1 summary | 현재 partner |

---

## 7. FE 구현 참고

- `src/domains/order/helpers/buildOrderLineRequestPayload.ts`
- `src/domains/partner/display/partnerDisplay.ts`
- `src/hooks/useGoBack.ts`
- `src/api/purchaseOrder.ts`
