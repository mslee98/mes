# 납품

**발주·생산**: [ORDER.md](./ORDER.md) · [PRODUCTION.md](./PRODUCTION.md)

---

## 1. 납품 계획 목록 (`/delivery/plans`)

화면: `DeliveryPlans.tsx`

### API

```http
GET /api/delivery-plans?tab=OPEN&page=1&pageSize=20&…
GET /api/delivery-plans/tab-counts?q=…&partnerId=…&fromMonth=…&toMonth=…
```

- tab-counts는 목록과 **동일 필터** (`q`, `partnerId`, `purchaseOrderId`, `fromMonth`+`toMonth`)
- tab-counts에 **보내지 않음**: `tab`, `status`, `page`, `pageSize`, `sortBy`, `sortOrder`
- 응답: `{ all, open, completed, delayed, total }` — `total === all`

### 탭 분류

| tab | 조건 |
|-----|------|
| **COMPLETED** | `status = COMPLETED` |
| **DELAYED** | 미완료 + 미납품 Unit + `COALESCE(deliveryDate, plannedDeliveryDate) < today` (Asia/Seoul) |
| **OPEN** | 미완료 + 미납품 Unit + 지연 아님 |
| **ALL** | 공통 필터만 |

- terminal status → `all`에만 포함
- Unit 전부 납품됐으나 status 미완료 → `all`에만 가능

### 월 필터·검색

| 항목 | 규칙 |
|------|------|
| 월 범위 | `fromMonth`·`toMonth` **둘 다** 있을 때만, 하나만 오면 400 |
| 월 기준일 | `COALESCE(deliveryDate, plannedDeliveryDate)` 연-월 |
| `q` | planNo, title, orderNo, partner.name |

### 프론트 UI

- 탭 뱃지: `getDeliveryPlansTabCounts` → SegmentedControl inline Badge
- 무효화: `invalidateDeliveryPlanListQueries`
- 검증: 동일 필터에서 `GET …?tab=X` total === tab-counts의 `X`

---

## 2. production-plan-units perspective

### API

```http
GET /api/production-plan-units?perspective=production&tab=…
GET /api/production-plan-units/tab-counts?perspective=production
GET /api/production-plan-units?perspective=delivery&tab=…
GET /api/production-plan-units/tab-counts?perspective=delivery
```

- `tab=DELIVERY_READY`, `tab-counts.deliveryReady` — **사용 중단**
- `meta.perspective` / `tab-counts.perspective`로 COMPLETED 라벨 분기

### 관점별 탭

| tab | production (생산) | delivery (납품) |
|-----|-------------------|-----------------|
| WAITING | 공정 대기 | 납품 대기 (`isDeliveryReady`) |
| IN_PROGRESS | 공정 진행 | 납품 계획·공정 중 |
| COMPLETED | 완료 (`isDelivered` 또는 납품대기) | 납품 완료 (`isDelivered`) |
| DELAYED | `productionCompletedAt`(null→today) > `plan.plannedDate` | 납품대기+기한경과 |

납품 관점: `isDelivered` / `isDeliveryReady` / 납품계획 포함 유닛만.

### 생산 관점 납품 배정 필터

| UI | API `deliveryPlanAssignment` |
|----|------------------------------|
| 미배정 | `unassigned` |
| 배정됨 | `assigned` |
| 전체 | *(파라미터 생략)* |

- 기본 필터: **미배정** — 납품 계획 등록 대상 유닛 처리
- 생산 완료 전에도 납품 계획 등록 가능 (UI 안내 문구)

### 탭 라벨

| tab | production | delivery |
|-----|------------|----------|
| WAITING | 생산 대기 | 납품 대기 |
| IN_PROGRESS | 생산 진행 | **납품 진행** |
| COMPLETED | 생산 완료 | 납품 완료 |
| DELAYED | 생산 지연 | 지연 |

### 정렬

| perspective | tab=COMPLETED | 기타 |
|-------------|---------------|------|
| production | `productionCompletedAt` desc | `dueDate` asc |
| delivery | `deliveredAt` desc | `dueDate` asc |

---

## 19. MVP 1 — 3화면 IA (2026-06)

| 화면 | 경로 | Primary Job |
|------|------|-------------|
| **생산 현황** | `/production/overview` | 진행·잔여 업무 **발견** (`?view=plans\|units`) |
| **납품 준비** | `/delivery/preparation` | 미등록 Unit **선택·DP 생성** (유일한 DP 생성 진입점) |
| **납품 계획** | `/delivery/plans` | DP **관리·실행** |

### 리다이렉트

| 구 경로 | 신 경로 |
|---------|---------|
| `/production/plans` | `/production/overview?view=plans` |
| `/production/units` | `/production/overview?view=units` |
| `/delivery` | `/delivery/preparation` |

`/delivery/units` — Unit 상세·납품 perspective 목록 (Full1 전까지 유지)

### 행동 중심 카피 (`deliveryActionCopy.ts`)

| 상황 | 문장 |
|------|------|
| 전량 미등록 | `N대 모두 납품 계획 필요` |
| 부분 등록 | `N대 중 M대는 납품 계획 필요` |
| 전량 등록 | `N대 모두 납품 계획 등록됨` |
| Unit 미등록 | `납품 계획 필요` |
| Unit 등록됨 | `DP-001에 등록됨` |

CTA: `[계획 필요 N대 처리 →]` → `/delivery/preparation?productionPlanId=...`

### deprecated (MVP1 UI에서 제거)

- 생산 계획 목록 **5칩 납품 연계 필터** (`PRODUCTION_PLAN_LINKAGE_FILTER_OPTIONS`)
- Plan 행 **납품연계** 컬럼 (`ProductionPlanDeliveryLinkageCell` — 펼침·유닛 행용으로 파일 유지)
- 생산 품목 목록의 **납품 배정 SegmentedControl**·체크박스·DP 생성 (→ 납품 준비로 이동)
- 납품 계획 목록 **전체/지연** 탭 (지연은 행 Badge)

### API (MVP1)

- `GET /api/production-plans?deliveryLinkage=ALL` 우선 시도
- 미지원 시 `WITHOUT_DELIVERY` + `WITH_DELIVERY` 병렬 fetch → `planId` dedupe → 클라이언트 페이지네이션 (`useMergedProductionPlanList`)

---

## 3. 생산 계획 목록 — 납품 연계 UI (`/production/plans`) — **deprecated → `/production/overview`**

> MVP1부터 §19 3화면 IA로 대체. 아래 §3 내용은 Phase1(5필터) 참고용.

화면: `ProductionPlanListView.tsx` · 헬퍼: `deliveryActionCopy.ts`, `deliveryLinkage.ts`(펼침 집계)

### 백엔드 분류 (확정)

| API `tab` | 조건 |
|-----------|------|
| **WITHOUT_DELIVERY** | Plan 소속 Unit **전부** 미배정 |
| **WITH_DELIVERY** | Unit **1대 이상** 납품 계획 배정 (전량 배정 아님) |

### ~~프론트 납품 연계 필터~~ (deprecated)

| UI 칩 | API | 비고 |
|-------|-----|------|
| 전량 미배정 | `tab=WITHOUT_DELIVERY` | deprecated |
| 1대 이상 연계 | `tab=WITH_DELIVERY` | deprecated |
| 부분 연계 | client | deprecated |
| 전량 배정 | client | deprecated |
| 미배정 유닛 있음 | `tab=WITHOUT_DELIVERY` | deprecated |

- Plan 행: **남은 업무** 컬럼 (행동 문장 + 납품 준비 CTA)
- 펼침 패널: `납품 계획 필요` / `DP-xxx에 등록됨` · MVP2에서 펼침 DP 생성 제거 예정

### optional API (백엔드 follow-up)

```http
GET /api/production-plans?deliveryLinkage=ALL|PARTIAL|FULL|NONE|ANY|HAS_GAP
```

`unitSummary.deliveryAssigned`, `unitSummary.deliveryUnassigned` — 목록에서 exact N/M 표시

---

## 2. 유닛 목록 — perspective (갱신)

| 화면 | 경로 | mode / perspective |
|------|------|-------------------|
| 생산 현황 (품목별) | `/production/overview?view=units` | `overview-units` |
| 납품 준비 | `/delivery/preparation` | `preparation` |
| 납품 품목 목록 | `/delivery/units` | `delivery` |
| ~~생산 품목 목록~~ | ~~`/production/units`~~ | → overview redirect |

---

## 4. 관련 파일

- `src/pages/ProductionOverview.tsx`, `ProductionPlanListView.tsx`, `DeliveryPreparation.tsx`
- `src/pages/DeliveryPlans.tsx`, `DeliveryUnits.tsx`, `DeliveryPlanDetail.tsx`
- `src/domains/production-plan/helpers/deliveryActionCopy.ts`
- `src/hooks/useMergedProductionPlanList.ts`
- `src/components/delivery/*`, `src/components/production/ProductionPlanDeliveryLinkageCell.tsx` (deprecated in plan rows)
- `src/components/order/OrderDetailDeliveryPlansCard.tsx`
