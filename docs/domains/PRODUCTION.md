# 생산 계획·LOT·공정

**발주 연동**: [ORDER.md](./ORDER.md) · **납품**: [DELIVERY.md](./DELIVERY.md)

---

## 1. 전체 흐름

| 순서 | 사용자 행위 | API |
|------|-------------|-----|
| 0 | 발주 접수(종결) | `PUT` 발주 `PO_CLOSED` |
| 1 | 수량·IDCCA 인수일 입력 | `GET .../lot/preview?quantity=&issuedDate=` |
| 2 | 저장 | `POST .../production-plans` — `items`만, **units 없음** |
| 3 | (자동) LOT 확정 | `POST .../production-plans/:planId/issue-lot-units` — `{}` |
| 4 | 공정 PASS/FAIL | `POST .../production-plan-units/:unitId/process/pass\|fail` |
| 5 | 제품 시리얼 확정 | `POST .../assign-product-serials` |
| 6 | 납품 | `POST .../deliveries` 등 |

발주 → 생산 계획 → 공정 → 시리얼 → 실납품 → 납품 라인 Unit 연결.

**프론트 라우트**: `/order/:orderId/plan/:planId` — 계획 상세·Unit 보드.

---

## 2. API

| 메서드 | 경로 | 비고 |
|--------|------|------|
| GET | `/api/purchase-orders/:id/production-plans` | 발주별 목록 |
| GET | `/api/purchase-orders/:id/lot/preview` | `quantity`, `issuedDate` — DB 변경 없음 |
| POST | `/api/purchase-orders/:id/production-plans` | `deliveryDate` 필수, `items: [{ purchaseOrderItemId, plannedQty }]` |
| GET | `/api/purchase-orders/production-plans/:planId` | 상세 (`items[].units[]`, `unitCode`=LOT) |
| POST | `.../production-plans/:planId/issue-lot-units` | `{}` — LOT·유닛 생성 |
| POST | `.../production-plans/:planId/assign-product-serials` | `serialNo` 전체 문자열, `unitCode` 유지 |
| POST | `.../production-plan-items/:planItemId/units` | `{}` — qty +1 (LOT 없음) |
| POST | `.../production-plan-units/:unitId/process/pass\|fail` | 공정 처리 |
| GET | `.../production-plan-units/:unitId/process-records` | 공정 이력 |
| GET | `/api/production-plan-units/overview`, 목록, `tab-counts` | Unit 대시보드 |
| POST | `/api/purchase-orders/delivery-items/:deliveryItemId/units` | `{ unitIds }` — 출고 준비 Unit 연결 |

### 2.1 LOT 미리보기

```
GET /api/purchase-orders/:purchaseOrderId/lot/preview?quantity={int}&issuedDate={YYYY-MM-DD}
```

- `quantity`: 선택 품목별 `plannedQty` **합** (§3 품목별 선택)
- `issuedDate`: IDCCA 인수일 → LOT `yyyyMMdd` 조각
- 응답: `{ previews: [{ unitCode }], quantity, issuedDate }` (또는 `{ data: { ... } }`)

**LOT 패턴 (참고)**:

```text
LT - 20260522 - P - K - 0004
     └ issuedDate  └ LOT_YEAR(orderedAt) └ partners.code └ 순번
```

- 년도 1자: 발주 `orderedAt` 연도 → 공통코드 **`LOT_YEAR_CODE`**
- 순번: `serial_sequences` 키 `LOT:{poComposite}` 누적
- 채번 정본: 서버. 프론트는 `GET /common-codes/groups/LOT_YEAR_CODE/codes` 팝오버용만

> `issue-lot-units`에 미리보기 `unitCode` 오버라이드는 **현재 미지원 가정** — `{}`만 전송.

### 2.2 생산 계획 등록 Body

```json
{
  "deliveryDate": "2026-05-22",
  "plannedDeliveryDate": "2026-06-01",
  "title": "…",
  "items": [
    { "purchaseOrderItemId": 101, "plannedQty": 3 }
  ]
}
```

### 2.3 제품 시리얼 확정

```json
{
  "units": [{ "unitId": "…", "serialNo": "YIM_EI0640PA-PC0001", "detectorElementCode": "…", "wavelengthCode": "…" }],
  "markPlanCompleted": true
}
```

- `serialNo`: **완성 문자열** — 서버 `^(.*?)(\d{4})$` 파싱. 4자리만 내면 오류.
- UI: 접두사 읽기 전용 + 끝 4자리 (`ProductionPlanAssignProductSerialsCard.tsx`)

---

## 3. 발주 상세 — 품목별 선택 (방안 A)

`OrderDetail` 생산 계획 모달: **품목별 체크 + 이번 생산수량**으로 `items[]` 구성.

| 컬럼 | 설명 |
|------|------|
| 선택 | 미계획 0이면 비활성 |
| 발주수량 / 미계획 / 이번 생산수량 / 잔여 | `line.qty`, `qty - registered` |

**프론트 검증**: 선택 ≥1, 수량 ≤ 미계획, `plannedDeliveryDate >= deliveryDate`, LOT 행 수 = Σ plannedQty.

**백엔드 권장 검증**: 동일 규칙 + `purchaseOrderItemId` 발주 소속 확인.

구현: `src/domains/production-plan/helpers/lineSelection.ts`, `ProductionPlanLineSelectionTable.tsx`

---

## 4. 프론트 구현 파일

| 파일 | 역할 |
|------|------|
| `src/pages/OrderDetail.tsx` | 생산 계획 모달, preview·저장·issue-lot-units |
| `src/pages/ProductionPlanDetail.tsx` | 계획 상세, 공정·시리얼·납품 |
| `src/pages/UnitDetail.tsx` | Unit 단건 공정 |
| `src/api/purchaseOrder.ts` | LOT·계획 API 래퍼 |
| `src/lib/format/lotUnitCodeFormat.ts` | LOT 패턴·UI 예시 |

---

## 5. 임시 하드코딩 (기술 부채)

> 백엔드·공통코드 정본 도입 전 **프론트 임시 규칙**. 제거 시 이 §를 기준으로 통합.

### 5.1 임시 로직 4축

| 축 | 내용 | 정본 |
|----|------|------|
| A. 공정 경로 | 엔진 vs 카메라 단계 배열 | 제품 정의 / 공정 템플릿 API |
| B. 소자·파장 | 파장 `M`, 소자=사업명 스냅샷 | Unit API·공통코드 |
| C. 시리얼 채번 | legacy + 마스터 조회 | `assign-product-serials` 정책 |
| D. 공정 UI | 입고·포장·출고준비 분기 | `UNIT_PROCESS_STEP` + 백엔드 |

### 5.2 파일 인덱스

| 파일 | 심볼 |
|------|------|
| `detailHelpers.ts` | `ENGINE/CAMERA_PROCESS_CODES`, `buildProcessStepCodesForPlanUnitRow`, `resolvePlanUnitDetectorFields` |
| `orderLineDetectorFields.ts` | `ORDER_LINE_WAVELENGTH_CODE`, `detectorElementCodeFromBusinessName` |
| `legacyProductSerialNumber.ts` | `generateProductSerialDraftRows` |
| `unitMappers.ts` | `flatRowFromUnitDetail`, `planUnitForDeliveryPayload` |
| `ProcessGateContextPanel.tsx` | 입고=검출기 S/N, 포장=시리얼, 출고=납품 |
| `registerFromPlanUnit.ts` | `buildMinimalDeliveryCreatePayloadFromPlanUnit` |

**호출 화면**: `ProductionPlanDetail`, `ProductionPlanDetailOverviewTab`, `UnitDetail`, `UnitOverviewTab`

### 5.3 개선 체크리스트

- [ ] Unit API에 `productId`, `detectorElementCode`, `wavelengthCode` 포함
- [ ] 공정 경로를 API·공통코드로 이전 (`ENGINE_PROCESS_CODES` 제거)
- [ ] 발주·생산·납품 소자/파장 해석 단일 모듈화
- [ ] `UnitOverviewTab`과 `UnitDetail` flatRow 데이터 소스 일치

---

## 6. 에러·엣지

| 상황 | 프론트 |
|------|--------|
| `lot/preview` 실패 | 테이블 비움 |
| 인수일/수량 0 | preview 미호출 |
| `issue-lot-units` 실패 | 토스트 — 계획은 이미 생성됐을 수 있음 |

---

## 7. 백엔드 확인 체크리스트

- [ ] `GET lot/preview` — `previews` 길이 = quantity
- [ ] `POST production-plans` — units 없이 생성
- [ ] `POST issue-lot-units` — `{}` 시 plannedQty 기준 전량
- [ ] `assign-product-serials` — `unitCode` 불변
