# 프론트 핸드오프 — 납품 계획 목록 · tab-counts

백엔드 `GET /api/delivery-plans/tab-counts` (API-OVERVIEW §8.7) 기준.  
화면: `/delivery/plans` (`DeliveryPlans.tsx`)

## API 호출

```http
GET /api/delivery-plans?tab=OPEN&page=1&pageSize=20&…
GET /api/delivery-plans/tab-counts?q=…&partnerId=…&fromMonth=…&toMonth=…
```

- tab-counts는 **목록과 동일 필터** (`q`, `partnerId`, `purchaseOrderId`, `fromMonth`+`toMonth`)
- tab-counts에 **보내지 않음**: `tab`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`
- 응답: `{ all, open, completed, delayed, total }` — `total === all`

## 탭 분류 (백엔드 동작)

| tab | 조건 |
|-----|------|
| **COMPLETED** | `status = COMPLETED` |
| **DELAYED** | 미완료 + 미납품 Unit 존재 + `COALESCE(deliveryDate, plannedDeliveryDate) < today` (Asia/Seoul) |
| **OPEN** | 미완료 + 미납품 Unit 존재 + 지연 아님 |
| **ALL** | 공통 필터만 |

- 취소·종료 등 terminal status → `all`에만 포함 (`open`/`completed`/`delayed` 제외)
- Unit 전부 납품됐으나 status 미완료 → `all`에만 포함 가능

## 월 필터 · 검색

| 항목 | 규칙 |
|------|------|
| 월 범위 | `fromMonth`·`toMonth` **둘 다** 있을 때만 적용, 하나만 오면 400 |
| 월 기준일 | `COALESCE(deliveryDate, plannedDeliveryDate)` 연-월 |
| `q` | planNo, title, orderNo, partner.name (+ order.title) |

## 프론트 UI

- 탭 뱃지: `getDeliveryPlansTabCounts` → SegmentedControl 라벨 inline Badge (납품·생산 계획 목록과 동일 패턴)
- 하단 안내: 조회 월 범위 · 기준일(coalesce) · `tabCounts.total`
- 목록·탭 건수 무효화: `invalidateDeliveryPlanListQueries`

## 일치 검증

동일 필터에서 `GET …?tab=X` 의 `total` === tab-counts의 `X` 필드.
