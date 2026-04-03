# 공정·발주 도메인 구조 정의 (AI·팀 전달용)

> 노션·슬랙·프롬프트에 그대로 붙여도 이해되도록 정리한 **정의 문서**입니다.  
> 프론트 UX 세부는 [FRONTEND_PRODUCT_DEFINITION_UX.md](./FRONTEND_PRODUCT_DEFINITION_UX.md), 발주 화면·API 개요는 [PURCHASE_ORDER.md](./PURCHASE_ORDER.md)와 함께 봅니다.

---

## 1. 전체 설계 방향 (핵심 요약)

본 시스템은 기존의 **item 중심 발주 구조**에서 벗어나, 아래 구조로 **확장**한다.

### 핵심 개념

| 개념 | 역할 |
|------|------|
| `products` | 사용자에게 보이는 **대표 제품** |
| `product_definitions` | 실제 **생산/발주 기준** |
| `items` | 보드·하우징·부품 등 **공통 품목** |
| `item_revisions` | 도면/버전 관리 단위 (**핵심**) |
| `order_items` | 발주 라인 (**product_definition** 기준) |

### 핵심 원칙

```text
발주 대상 = item           ❌
발주 대상 = product_definition   ✅
```

```text
제품은 단순하게
구성은 내부적으로 관리
```

---

## 2. 도메인 개념 정의

### 2.1 Product (대표 제품)

- **정의**: 사용자가 인식하는 제품
- **예**: MARKOS, ICE1280
- **특징**
  - 제품 목록은 과도하게 늘리지 않음
  - UI에서 선택되는 대상

### 2.2 ProductDefinition (제품 정의)

- **정의**: 실제 생산/발주 기준
- **구성 요소(개념)**
  - 제품 (`product_id`)
  - 버전
  - 발주 유형 (군수 / 민수 / 연구과제 등)
  - 프로젝트
  - 적용 BOM / 공정 / 파트 구성
- **예**

```text
MARKOS / 군수 / v1.0
MARKOS / 민수 / v1.0
```

### 2.3 Item (공통 품목)

- **정의**: 실제 물리적 구성 요소
- **포함**: 보드, 하우징, 렌즈, 부품, 전자 소자 등
- **특징**
  - 계층 구조 (`parent_item_id`)
  - 재사용 가능한 마스터

### 2.4 ItemRevision (핵심)

- **정의**: 같은 파트의 **설계/도면 버전**
- **필요 이유**
  - 군수/민수에서 다른 설계 사용
  - 프로젝트별 변경
  - 도면 버전 관리
- **예**

```text
FRONT_CASE Rev.A (민수)
FRONT_CASE Rev.B (군수)
```

### 2.5 ProductDefinitionItemRevision

- **정의**: 제품 정의에 **어떤 파트 리비전을 쓰는지** 연결
- **역할**

```text
MARKOS 군수형 → FRONT_CASE Rev.B
MARKOS 민수형 → FRONT_CASE Rev.A
```

### 2.6 PartnerItemRevision

- **정의**: 업체별 **생산 가능 파트** 관리
- **역할**
  - 어떤 업체가 어떤 리비전을 생산 가능한지
  - 승인 여부
  - 혼합 생산 지원
- **예**

```text
A기업 → FRONT_CASE Rev.B 가능
B기업 → REAR_CASE Rev.A 가능
```

---

## 3. 발주 구조 정의

### 3.1 Orders (발주 헤더)

- 거래처, 발주 유형, 날짜, 상태
- 업무 상태 중심 관리

### 3.2 OrderItems (발주 라인)

**변경 전**

```text
order_items.item_id → items
```

**변경 후**

```text
order_items.product_definition_id → product_definitions
```

### 저장 원칙

- 저장 기준: **`product_definition_id`**
- item은 발주 라인에 **직접 저장하지 않음**

### 의미

```text
MARKOS 군수형 10개 발주
```

→ 구성 파트는 정의·리비전을 통해 **자동 추적** 가능

---

## 4. BOM 정책

### 전자 BOM

- 외주 처리
- 시스템에서는 **선택적** 관리
- 파일/참조 수준 유지 가능

### 하우징·기구 파트

- **핵심 관리 대상**, 반드시 관리

**관리 항목**

1. 파트 단위 관리  
2. 리비전 관리  
3. 도면 연결  
4. 업체 생산 가능 여부  

---

## 5. 파일(도면) 관리

기존 파일 구조 활용:

- `files`
- `file_links`

### 연결 방식(개념)

```text
target_type = ITEM_REVISION
target_id   = item_revision.id
```

---

## 6. 관계 구조 (텍스트 ERD)

```text
partners
  │
  ▼
orders
  │
  ▼
order_items ───► product_definitions ───► products
                      │
                      ▼
          product_definition_item_revisions
                      │
                      ▼
                 item_revisions ───► items
                      │
                      ▼
        partner_item_revisions ───► partners
```

---

## 7. 프론트엔드 가이드

### 사용자 흐름

```text
1. 발주유형 선택 (군수/민수)
2. 프로젝트 선택
3. 제품 선택 (MARKOS)
4. 시스템이 product_definition 자동 추천
5. 필요 시 정의 선택
6. 발주 등록
```

### UI 원칙

- 제품 목록은 **단순** 유지
- 정의는 **내부적으로** 관리
- 사용자는 복잡한 구조를 직접 다루지 않음

### 제품 화면 구조(목표)

```text
제품 목록
→ 제품 상세
→ 제품 정의 목록
→ 제품 정의 상세
    ├ 구성 파트
    ├ 도면
    ├ 공정
```

---

## 8. 백엔드 가이드

### 핵심 변경

```text
order_items.item_id                ❌ (발주 기준으로 사용 중단)
order_items.product_definition_id  ✅
```

### 유지

- `items` 유지
- `delivery` 구조 유지
- 파일 구조 유지

### 추가(개념)

- `product_definitions`
- `item_revisions`
- `product_definition_item_revisions`
- `partner_item_revisions`

### 책임 분리

| 개념 | 역할 |
|------|------|
| product | 사용자용 |
| product_definition | 발주 기준 |
| item | 물리 품목 |
| item_revision | 설계/도면 |
| order_item | 발주 라인 |

---

## 9. 핵심 설계 철학

### 한 문장

> 발주는 **제품 정의** 기준이고, 실제 구성은 내부에서 **item + revision**으로 따라간다.

### 구조 요약

```text
사용자: MARKOS 선택
↓
시스템: MARKOS 군수형 v1.0 결정
↓
DB: product_definition_id 저장
↓
구성: item_revision 기준으로 자동 확장
↓
업체: 생산 가능한 파트 선택
```

---

## 10. 도입 전략

### 단계적 적용

1. `product_definition` 도입  
2. `order_items.product_definition_id` 추가  
3. **신규 발주**부터 적용  
4. 기존 item 구조 유지  
5. 점진 전환  

### 한 줄 요약

```text
구조 변경 ❌
구조 확장 ✅
```

---

## 최종 요약

### 시스템 핵심 구조

```text
제품 = 단순
정의 = 발주 기준
품목 = 구성
리비전 = 설계
```

### 가장 중요한 개념

```text
item은 더 이상 발주 대상이 아니다
product_definition이 발주 대상이다
```

---

## 다음 단계(선택)

- NestJS 엔티티 구조 (TypeORM)  
- API 설계 (DTO / Service 로직)  
- 프론트 상태 관리 구조  
