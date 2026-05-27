# 배포 기록 — 2026-05-18 (납품 계획 · 발주 · 검출기)

프론트엔드(`ojt`) 기준 배포·업데이트 노트입니다.  
백엔드(`vms-back`, `delivery-plan` 브랜치)와 **같은 배포 단위**로 올릴 때 아래 Git ref·스모크를 함께 확인하세요.

---

## 배포 기록 (템플릿)

| 항목 | 내용 |
|------|------|
| **배포일** | 2026-05-18 |
| **배포 서버** | (운영 URL / 호스트) |
| **접속 ID** | (사번) |
| **패스워드** | (사번 또는 별도 정책) |
| **Front 빌드** | `dist2026051401` |
| **Back 빌드** | `vms-back:26.05.140` — `npm run docker:build:auto` 시 YY.MM.DD + 일일 순번 태그 |
| **Git ref (Front)** | `feature/delivery-plan` @ **`29e85d0`** |
| **Git ref (Back, 권장)** | `delivery-plan` @ **`133bf548`** (최근 3커밋) + 직전 **`5dc6de03`**(검출기·시리얼 채번) |

---

## 반영 내용 요약 (사용자 관점)

### 발주

- **발주 상세** — 카드형 대시보드 레이아웃(기존 테이블형 `?layout=classic` 제거).
  - 헤딩: `발주 상세` + 발주번호(중립색, 링크 아님), 상태 뱃지는 헤딩에서 제거.
  - **납품 계획** 카드·**발주 제품**·**발주 정보**(고객 발주번호·특이사항 포함).
  - 종결 발주에서 **납품 계획 등록**·**납품 등록**·Unit 연결 모달 연동.
- **발주 목록** — 검색·필터·거래처 표시 보강.
- **발주 등록/수정** — 라인·첨부·시리얼 생성 UI와 백엔드 `max-sequence` 연동.

### 납품 · 납품 계획

- **납품 계획 상세** (`/delivery-plans/:planId`) — 신규.
  - 탭: 개요(공정 PASS/FAIL·이력·첨부) / 요약 / 품목·Unit.
  - 공정 스테퍼·게이트 패널·실납품 등록(출고 준비 Unit).
  - 품목 추가·Unit 추가·지연 분할·Unit 이동.
- **제품 납품 목록** (`/delivery-units`) — 신규.
  - 탭: 대기 / 진행 / 완료 / 지연 + 서버 집계 뱃지.
  - 검색 옵션: **시작·종료 월** — `DatePicker` **`monthOnly`**(flatpickr **monthSelect** 플러그인, 일 선택 없음).
  - 기준일(planned / delivery / coalesce), 키워드 검색.
- **납품 목록** (`/delivery`) — 목록·필터 정비.

### 검출기 마스터

- **검출기 관리** — 시리즈 **세그먼트 탭** + `추가`(시리즈 등록).
  - 특정 시리즈 탭 선택 시 **시리즈 편집** 링크(탭과 같은 줄, `justify-between`).
- **검출기 시리즈 수정** — **시리즈 삭제**(`DELETE /api/detector-series/:id`, ConfirmModal, 성공 시 검출기 목록으로 이동).
- **검출기 상세** — 삭제 버튼 + ConfirmModal (`DELETE /api/detectors/:id`).

### 마스터 공통 (삭제)

- **제품 · 렌즈 · 거래처 · 검출기** 상세 — `product.manage` 권한 시 **삭제** + `ConfirmModal` + React Query 무효화 후 목록 이동.
- API 클라이언트: `deleteProduct`, `deleteLens`, `deletePartner`, `deleteDetector`, **`deleteDetectorSeries`**.

### UI · 디자인 시스템

- **`TimePickerInput`** — 12시간제, `onSelect` / `onSave` 커밋 모드.
- **`DatePicker` `monthOnly`** — flatpickr `monthSelect`, `Y-m` 출력, 다크 테마 연동.
- **`DangerSoftTag`**, **`ConfirmModal`** 보강, **`PartnerCountryCell`**, 모달 헤더 레이아웃.
- **`/ui`** 플레이그라운드에 위 컴포넌트 데모.
- **monthSelect 달력 CSS** (`src/index.css`) — 기본 flatpickr와 동일 너비(~308px), **3열×4행** 그리드, `rContainer` 전체 폭 사용.

---

## 프론트 상세 (화면 · 경로)

### 라우팅 (`src/App.tsx`)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/order`, `/order/:id` | Order, OrderDetail | 발주 목록·상세 |
| `/delivery` | Delivery | 납품 헤더 목록 |
| `/delivery-plans/:planId` | DeliveryPlanDetail | 납품 계획 상세 |
| `/delivery-units` | DeliveryUnits | 제품 납품(Unit) 목록 |
| `/detectors` | Detectors | 검출기·시리즈 탭 목록 |
| `/detector-series/new`, `/detector-series/:seriesId/edit` | DetectorSeriesForm | 시리즈 등록·수정·삭제 |
| `/detectors/:detectorId` | DetectorDetail | 검출기 상세·삭제 |

### API 클라이언트 (`src/api/`)

| 파일 | 추가·변경 요약 |
|------|----------------|
| `purchaseOrder.ts` | 납품 계획 CRUD, Unit 목록·집계·공정 pass/fail·이력, 시리얼 max-sequence 등 대량 추가 |
| `detectorSeries.ts` | `deleteDetectorSeries` |
| `detectors.ts` | `deleteDetector` |
| `products.ts`, `lenses.ts` | `deleteProduct`, `deleteLens` |
| `purchaseOrder.ts` (partner) | `deletePartner` |

문서: `docs/api-purchase-orders.md` (발주·납품 API 요약 보강).

### 주요 신규 컴포넌트

| 경로 | 역할 |
|------|------|
| `src/pages/DeliveryPlanDetail.tsx` | 납품 계획 상세 페이지 |
| `src/pages/DeliveryUnits.tsx` | 제품 납품 목록 |
| `src/components/delivery/*` | 공정 스테퍼, 이력 타임라인, 개요/요약/품목 탭 |
| `src/components/order/OrderDetailDeliveryPlansCard.tsx` | 발주 상세 납품 계획 카드 |
| `src/components/order/OrderDetailLinkUnitsModal.tsx` | 납품·Unit 연결 모달 |
| `src/lib/deliveryPlanProcessLabels.ts` 등 | 공정 코드 라벨·순서·납품 등록 헬퍼 |

---

## 백엔드 연동 매트릭스 (프론트 → API)

| 화면 | 대표 API | 비고 |
|------|----------|------|
| 발주 상세 → 납품 계획 등록 | `POST /api/purchase-orders/:id/delivery-plans` | `PO_CLOSED`만 |
| 발주 시리얼 채번 | `GET .../serials/max-sequence?sequenceKey=` | 프론트 조합 + 백엔드 검증 |
| 납품 계획 상세 | `GET .../delivery-plans/:planId` | 탭·공정·Unit |
| 공정 PASS/FAIL | `POST .../delivery-plan-units/:unitId/process/pass\|fail` | |
| 공정 이력 | `GET .../process-records` | 첨부 다운로드 `fileDownload` |
| 제품 납품 목록 | `GET /api/delivery-plan-units/overview`, `?tab=` | `fromMonth`·`toMonth` |
| 검출기 시리즈 삭제 | `DELETE /api/detector-series/:id` | 409 시 토스트 |
| 검출기 삭제 | `DELETE /api/detectors/:id` | |

상세 스펙: 백엔드 `docs/API-OVERVIEW.md`, `docs/frontend-delivery-plan-bigbang.md`.

---

## 배포 전 체크 (프론트)

1. **환경** — `.env.production`의 `VITE_AUTH_BASE_URL`, Keycloak 설정 확인.
2. **권한** — `delivery.read`, `delivery.create`, `product.read`, `product.manage` 메뉴·역할 매핑.
3. **빌드** — `npm run build` 성공, `dist/` 산출물명을 위 표 **Front 빌드**에 기록.
4. **백엔드 버전** — 최소 `26bd38b1` 이상(납품 계획 API); 시리얼·검출기 삭제는 **`5dc6de03` + `133bf548`** 포함 권장.
5. **CORS·쿠키** — 운영 도메인에서 API·Keycloak 리다이렉트 스모크.

---

## 스모크 시나리오 (프론트)

1. 로그인 → 사이드바 **발주** · **납품** · **검출기** 메뉴 노출.
2. 종결 발주 상세 → **납품 계획 등록** → 계획 상세 진입 → Unit 공정 PASS → 이력·첨부 확인.
3. **제품 납품 목록** → 월 필터(`monthOnly` 달력, 3열) → 탭 전환·검색.
4. **검출기** → 시리즈 탭 → **시리즈 편집** → 저장 / (미참조 시) **시리즈 삭제**.
5. 제품·렌즈·거래처·검출기 상세 → **삭제** 모달 → 목록 복귀 (409 시 메시지 확인).

---

## 알려진 제한 / 로드맵

| 영역 | 현재 (프론트) | 추후 |
|------|----------------|------|
| 제품 시리얼 | 소자·파장·검출기 조합 + max-sequence | 템플릿·세그먼트 UI |
| 공정 | 공통코드 기반 PASS/FAIL 모달 | 제품별 공정 템플릿 UI |
| 발주 상세 | 카드형만 (classic 제거) | — |
| 납품 완료 | `isDelivered`, 탭 집계 표시 | 실납품(`deliveries`) 플로우 UI 통합 |
| 월 필터 | flatpickr monthSelect (브라우저별 UI 차이 가능) | 필요 시 커스텀 월 패널 |

---

## 제외·미포함

- 저장소 루트 **`dist2026051302.7z`** 등 배포 아카이브 — Git 미추적(커밋 제외).
- 백엔드 DDL·Docker·시드 실행 절차 — 백엔드 배포 노트 참고.

---

## 변경 이력

| 날짜 | 작성 | Git (Front) |
|------|------|-------------|
| 2026-05-18 | 납품 계획·발주·검출기 프론트 배포 노트 초안 | `29e85d0` |
