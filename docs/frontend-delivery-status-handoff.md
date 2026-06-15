# 프론트 핸드오프 — production-plan-units perspective

## API 호출

```http
GET /api/production-plan-units?perspective=production&tab=…
GET /api/production-plan-units/tab-counts?perspective=production
GET /api/production-plan-units?perspective=delivery&tab=…
GET /api/production-plan-units/tab-counts?perspective=delivery
```

- `tab=DELIVERY_READY`, `tab-counts.deliveryReady` — **사용 중단**
- `meta.perspective` / `tab-counts.perspective`로 COMPLETED 라벨 분기

## 관점별 탭 의미

| tab | production (생산) | delivery (납품) |
|-----|-------------------|-----------------|
| WAITING | 공정 대기 | 납품 대기 (`isDeliveryReady`) |
| IN_PROGRESS | 공정 진행 | 납품 계획 포함·공정 중 |
| COMPLETED | 완료 (`isDelivered` 또는 납품대기) | 납품 완료 (`isDelivered`) |
| DELAYED | `productionCompletedAt`(null→today) > `plan.plannedDate` | 납품대기+기한경과 |

납품 관점은 납품 관련 품목만 (`isDelivered` / `isDeliveryReady` / 납품계획 포함).

## 테이블 컬럼 매핑

| UI 컬럼 | perspective=production | perspective=delivery |
|---------|------------------------|----------------------|
| 예정일 | `plan.plannedDate` | `deliveryPlanPlannedDeliveryDate` ?? `dueDate` |
| 완료일 | `productionCompletedAt` | `deliveredAt` |
| 지연 | `delayDays` | `delayDays` |

- 지연 뱃지/색상: `delayDays > 0` (탭 DELAYED와 동일 기준)
- 생산 완료 전: `productionCompletedAt === null` → 지연 계산은 서버가 **오늘** 기준

## 탭 UI 라벨

| tab | production | delivery |
|-----|------------|----------|
| WAITING | 생산 대기 | 납품 대기 |
| IN_PROGRESS | 생산 진행 | 계획·공정중 |
| COMPLETED | 생산 완료 | 납품 완료 |
| DELAYED | 생산 지연 | 지연 |

## 정렬

| perspective | tab=COMPLETED | 기타 |
|-------------|---------------|------|
| production | `sortBy=productionCompletedAt&sortOrder=desc` | `dueDate` asc |
| delivery | `sortBy=deliveredAt&sortOrder=desc` | `dueDate` asc |

## 단건 상세 (`GET /production-plan-units/:id`)

- `productionCompletedAt`, `delayDays`, `dueDate` — 생산 관점 (`plan.plannedDate` 기준)
- 납품 지연 UI: `deliveryPlanPlannedDeliveryDate` / `dueDate` + `deliveredAt` (목록과 동일 필드 우선)

## 변경 없음

- `GET /api/production-plans` `unitSummary` — Collapse 뱃지용 5필드 (`deliveryReady` 포함) 그대로

## 프론트 라우트

| 화면 | 경로 | perspective |
|------|------|-------------|
| 생산 품목 목록 | `/production/units` | `production` |
| 납품 품목 목록 | `/delivery/units` | `delivery` |

정책 모듈: `src/domains/production-plan/helpers/unitListPerspective.ts`
날짜 매핑: `src/domains/production-plan/helpers/unitListDates.ts`
