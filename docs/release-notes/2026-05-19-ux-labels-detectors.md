# 배포 기록 — 2026-05-19 (납기 D-day · 검출기 타입 · 버그 게시판)

프론트엔드(`ojt`) 기준 배포·업데이트 노트입니다.

---

## 배포 기록 (템플릿)

| 항목 | 내용 |
|------|------|
| **배포일** | 2026-05-19 |
| **배포 서버** | (운영 URL / 호스트) |
| **Front 빌드** | (배포 시 기록) |
| **Git ref (Front)** | `development` @ **`87e1575`** |

---

## 반영 내용 요약 (사용자 관점)

### 발주 · 납품

- **고객 요청 납기 D-day** — 발주 상세·등록/수정, 제품 납품 목록, 납품 계획 개요 탭에서 납기일 대비 `D-N` / `D-Day` / `D+N` 뱃지 및 한글 보조 라벨(지연·임박 등).
- **날짜 표시** — `formatDateYmd`·`dueDateDisplay` 유틸로 표기 통일.

### 검출기

- **검출기 타입 현황** — `/iddca-type` 신규(기존 `/iddca-type-table`은 리다이렉트).
  - 검출기 목록 툴바 **검출기 타입 보기** 버튼.
  - `PageMeta` · `PageBreadcrumb`(뒤로 가기) · `ListPageLoading` 적용.
- **사이드바** — 검출기 타입 페이지에서도 **자원관리** 메뉴(검출기 `/detectors` 하위) 활성 유지.

### 버그 게시판

- **상태·우선순위 한글 표시** — API 코드는 유지, 화면만 한글(접수, 처리 중, 수정 완료, 검증 완료, 종료 / 낮음~긴급).

---

## 프론트 상세

### 라우팅 (`src/App.tsx`)

| 경로 | 페이지 | 설명 |
|------|--------|------|
| `/iddca-type` | IddcaTypeTable | 검출기 타입·양산 현황 표 |
| `/iddca-type-table` | — | `/iddca-type`으로 replace |

### 신규·변경 유틸 (`src/lib/`)

| 파일 | 역할 |
|------|------|
| `appRoutes.ts` | `IDDCA_TYPE_PATH` 상수 |
| `sidebarMenuActive.ts` | 사이드바 path 활성(검출기 타입 ↔ `/detectors`) |
| `dueDateDisplay.ts` | 납기 D-day·톤(지연/임박) 계산 |
| `bugBoardDisplay.ts` | 버그 게시판 상태·우선순위 한글 라벨 |

### 변경 페이지

| 페이지 | 변경 요약 |
|--------|-----------|
| `Detectors.tsx` | 검출기 타입 보기 링크 |
| `IddcaTypeTable.tsx` | 레이아웃·메타·브레드크럼 |
| `OrderDetail.tsx` | 납기 D-day, 검출기 타입 안내 URL |
| `OrderForm.tsx` | 납기 D-day |
| `DeliveryUnits.tsx` | 납기 D-day |
| `DeliveryPlanDetailOverviewTab.tsx` | 납기 D-day |
| `BugBoard.tsx` | 한글 라벨 |
| `AppSidebar.tsx` | 하위 메뉴 활성 시 부모 강조 |

---

## 스모크 시나리오

1. **검출기** 목록 → **검출기 타입 보기** → 표 로드 · ◀ 이전(목록 복귀) · 사이드바 자원관리·검출기 활성.
2. **발주 상세** — 고객 요청 납기 옆 D-day 뱃지 색·문구 확인.
3. **제품 납품 목록** — 납기/계획일 컬럼 D-day 표시.
4. **버그 게시판** — 상태·우선순위 한글, 필터·뱃지 동일 라벨.

---

## 변경 이력

| 날짜 | 작성 | Git (Front) |
|------|------|-------------|
| 2026-05-19 | 납기 D-day, 검출기 타입 페이지, 버그 게시판 한글 | `87e1575` |
