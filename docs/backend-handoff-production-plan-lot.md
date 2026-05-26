# 생산 계획 · LOT — 백엔드 연동 핸드오프 (프론트 → 백엔드)

작성 기준: 프론트 `OrderDetail` 생산 계획 모달 + `purchaseOrder.ts` API 래퍼.

---

## 1. 프론트가 기대하는 전체 흐름

| 순서 | 사용자 행위 | 프론트 API | 백엔드 기대 |
|------|-------------|------------|-------------|
| 0 | 발주 접수(종결) | `PUT` 발주 `PO_CLOSED` | 계획·LOT 전제 |
| 1 | 수량·IDCCA 인수일 입력 | `GET .../lot/preview?quantity=&issuedDate=` | **DB 변경 없음**, `previews[].unitCode` N건 |
| 2 | 저장 클릭 | `POST .../production-plans` | 계획·`production_plan_items`만, **`units` 없음** |
| 3 | (저장 직후 자동) | `POST .../production-plans/:planId/issue-lot-units` | **`{}`** — 품목별 `plannedQty - 기존 유닛 수` 만큼 LOT·유닛 생성 |
| 4 | 계획 상세 | 공정 `process/pass` … | 기존 |
| 5 | 생산 종료 시 | `POST .../assign-product-serials` | `serialNo`만 확정, **`unitCode`(LOT) 유지** |
| 6 | 납품 | `POST .../deliveries` 등 | 기존 |

> **확인 요청**: `issue-lot-units` 본문에 `previews: [{ unitCode }]`(미리보기에서 사용자가 수정한 값)를 **지원하는지**.  
> 현재 프론트는 **미지원 가정으로 `{}`만 전송**합니다. 지원 시 스펙(필드명·검증·중복) 알려주시면 연동하겠습니다.

---

## 2. API별 상세

### 2.1 LOT 미리보기 (수량 입력 시)

```
GET /api/purchase-orders/:purchaseOrderId/lot/preview
  ?quantity={int}
  &issuedDate={YYYY-MM-DD}
```

- `quantity`: 이번 생산 수량(프론트는 **잔여 수량으로 클램프** 후 전달)
- `issuedDate`: **IDCCA 인수일** (모달 `deliveryDate`) → LOT의 `yyyyMMdd` 조각

**응답 (프론트 파싱)**

```json
{
  "previews": [
    { "unitCode": "LT-20260522-PO0001" },
    { "unitCode": "LT-20260522-PO0002" }
  ],
  "quantity": 2,
  "issuedDate": "2026-05-22"
}
```

- 래핑 `{ "data": { "previews": [...] } }` 도 파싱함
- **필수**: `previews[].unitCode` 문자열 배열
- **하지 않음**: `serial_sequences` 증가, `production_plan_units` INSERT

**백엔드 채번 규칙 (프론트는 서버 값만 표시)**

- 발급일: `issuedDate` → `yyyyMMdd`
- 년도 1자: 발주 **`orderedAt` 연도** → 공통코드 **`LOT_YEAR_CODE`** (`name`=YYYY, `code`=O/P/…)
- 업체: `partners.code`
- 순번: `serial_sequences` 키 `LOT:{poComposite}` 기준 **다음 번호** (날짜 바뀌어도 누적)

**경합**: 미리보기 후 다른 사용자가 LOT 발급 시 확정 번호가 달라질 수 있음 → 확정 후 `GET` 계획 상세로 유닛 목록 재조회 권장.

---

### 2.2 생산 계획 등록

```
POST /api/purchase-orders/:purchaseOrderId/production-plans
```

**프론트 Body 예시**

```json
{
  "deliveryDate": "2026-05-22",
  "plannedDeliveryDate": "2026-06-01",
  "title": "…",
  "remark": "…",
  "productionManagerId": 1,
  "items": [
    { "purchaseOrderItemId": 101, "plannedQty": 3 },
    { "purchaseOrderItemId": 102, "plannedQty": 2 }
  ]
}
```

- **`serials` / `lines[].serials` 없음**
- 응답 `items[].units` 는 **빈 배열** 또는 없음 기대

---

### 2.3 LOT 확정 발급

```
POST /api/purchase-orders/production-plans/:planId/issue-lot-units
Content-Type: application/json

{}
```

- 프론트 현재: **항상 `{}`**
- 대안 스펙(문서상): `items: [{ "planItemId", "quantity" }]`

**기대 동작**

- `serial_sequences` (LOT:…) 증가
- `production_plan_units` 생성, `unitCode` = LOT, `serialNo` = null

**응답**: 갱신된 `ProductionPlan` (+ `items[].units[]`) — 프론트는 저장 성공 후 계획 상세 페이지로 이동·쿼리 무효화.

---

### 2.4 제품 시리얼 확정

```
POST /api/purchase-orders/production-plans/:planId/assign-product-serials
```

```json
{
  "units": [
    {
      "unitId": "…",
      "serialNo": "YIM_EI0640PA-PC0001",
      "detectorElementCode": "…",
      "wavelengthCode": "…",
      "detectorId": 1
    }
  ],
  "markPlanCompleted": true
}
```

- `serialNo`: **완성 문자열** — 서버 `parseSerialNo`는 `^(.*?)(\d{4})$`로 접두사·끝 4자리 분리. `0001`만내면 prefix 빈 값으로 **오류**.
- 프론트: 거래처 코드 + `businessNameSnapshot` + `wavelengthCode`로 접두사 조합 후 끝 4자리 입력 (`productSerialAssign.ts`). 납품 `createDeliverySerials`의 prefix+서버순번 방식과 **다름**.
- **`unitCode` 변경 없음**

---

## 3. LOT_YEAR_CODE (공통코드)

- 그룹: `LOT_YEAR_CODE`
- `GET /api/common-codes/groups/LOT_YEAR_CODE/codes`
- **프론트**: 팝오버·설명용 표만 조회 (채번 정본은 **서버** `lot/preview` · `issue-lot-units`)
- **백엔드**: 채번 시 동일 그룹 사용 유지 (프론트와 별도 로직 불필요)

| name (연도) | code (1자) |
|-------------|------------|
| 2025 | O |
| 2026 | P |
| … | … |
| 2034 | X |
| 2036 | Y |

(2035는 시드에 없을 수 있음 — 공통코드 화면에서 추가)

---

## 4. LOT 문자열 조각 (참고)

```
LT - 20260522 - P - K - 0004
     └ issuedDate  └ LOT_YEAR  └ partners.code └ 4자리 순번
       (쿼리)        (orderedAt)   (발주 거래처)
```

---

## 5. 에러·엣지 케이스 (프론트 처리)

| 상황 | 프론트 |
|------|--------|
| `lot/preview` 실패 | 테이블 비움 (토스트 없음) — **개선 여지: 에러 메시지 표시** |
| 인수일 미입력 | preview 호출 안 함 |
| 수량 0 / 잔여 0 | preview 호출 안 함 |
| `issue-lot-units` 실패 | 토스트, **계획은 이미 생성됐을 수 있음** — 롤백/재시도 API 여부 확인 필요 |

---

## 6. 프론트 구현 파일

| 파일 | 역할 |
|------|------|
| `src/pages/OrderDetail.tsx` | 미리보기·저장·`issue-lot-units` 연쇄 |
| `src/api/purchaseOrder.ts` | `getPurchaseOrderLotPreview`, `issueProductionPlanLotUnits`, … |
| `src/lib/lotUnitCodeFormat.ts` | 패턴 설명·`LOT_YEAR_CODE` 기반 UI 예시 |
| `docs/frontend-production-plan-lot-serial.md` | 프론트 내부 흐름 |

---

## 7. 백엔드 확인 체크리스트

- [ ] `GET lot/preview` — `quantity`, `issuedDate` 필수·검증, `previews` 길이 = quantity
- [ ] `POST production-plans` — `items`만으로 units 없이 생성 가능
- [ ] `POST issue-lot-units` — `{}` 시 plannedQty 기준 전량 발급
- [ ] 년도코드 — `orderedAt` + `LOT_YEAR_CODE` (인수일 연도 아님)
- [ ] `assign-product-serials` — `unitCode` 불변
- [ ] (선택) `issue-lot-units`에 미리보기 `unitCode` 오버라이드 지원 여부
