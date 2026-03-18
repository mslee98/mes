# 공통 코드 관리 가이드

프론트 드롭다운, 라디오 버튼, 필터 조건처럼 화면에서 반복적으로 사용하는 선택값을 공통 코드로 관리하기 위한 문서입니다.

---

## 1. 목적

공통 코드는 아래 같은 값을 한 곳에서 관리하기 위해 도입합니다.

- 화면 드롭다운 선택값
- 운영자가 비활성화할 수 있는 분류값
- 여러 화면에서 재사용되는 상태/유형 코드

예:

- 파일 유형
- 조직 유형
- 사용자 상태
- 결재 상태
- 발주 상태

---

## 2. 테이블 구조

### `code_groups`

코드 묶음의 메타 정보를 저장합니다.

- `code`: 그룹 식별자
- `name`: 그룹명
- `description`: 설명
- `sort_order`: 정렬 순서
- `is_active`: 사용 여부

예:

- `FILE_TYPE`
- `ORG_TYPE`
- `USER_STATUS`
- `APPROVAL_STATUS`
- `PURCHASE_ORDER_STATUS`

### `codes`

각 그룹에 속한 실제 선택값을 저장합니다.

- `group_code`: 소속 그룹 코드 (`code_groups.code` 참조)
- `code`: 코드 값
- `name`: 코드명
- `description`: 설명
- `sort_order`: 정렬 순서
- `is_active`: 사용 여부

중복 기준은 전역 `code`가 아니라 `group_code + code`입니다.
즉 서로 다른 그룹에서 같은 코드 값(`ACTIVE`, `INACTIVE` 등)을 사용할 수 있습니다.

---

## 3. 조회 API

### `GET /common-codes/groups`

활성 상태인 공통 코드 그룹 목록을 반환합니다.

### `GET /common-codes/groups/:groupCode/codes`

특정 그룹의 활성 코드 목록을 반환합니다.

응답 예시:

```json
[
  {
    "id": 1,
    "groupCode": "FILE_TYPE",
    "code": "IMAGE",
    "name": "이미지",
    "description": "jpg, png 등 이미지 파일",
    "sortOrder": 0,
    "isActive": true
  }
]
```

---

## 4. 관리 원칙

- 공통 코드는 `프론트 선택값 관리`를 위한 마스터입니다.
- `code_groups.code`는 외부 참조에 사용하므로 식별자 성격의 불변값으로 취급합니다.
- 실제 화면 표시는 `name`을 사용하고, 저장/연동 기준은 `code`를 사용합니다.
- 정렬은 `sortOrder ASC`, 그다음 `id ASC` 기준입니다.
- 프론트에는 기본적으로 `isActive = true`인 항목만 노출합니다.

---

## 5. 공통 코드에서 제외하는 대상

아래 데이터는 비슷해 보여도 공통 코드로 합치지 않습니다.

### `roles`, `permissions`

이 값들은 단순 드롭다운 항목이 아니라 로그인 후 권한 계산과 API 접근 제어에 직접 사용되는 보안 정책 데이터입니다.

### `menus`

메뉴는 단순 코드셋이 아니라 역할별 노출 정책과 트리 구조를 가지는 UI 정책 데이터입니다.

### `organization_units`

조직은 부모-자식 관계와 트리 조회가 핵심인 조직 마스터입니다.

### `job_categories`, `positions`

현재 구조에서는 사용자 소속과 직접 연결되는 별도 도메인 마스터이며, 특히 `positions`는 `job_category_id`, `level` 같은 도메인 속성을 가집니다.

즉 공통 코드는 `보안`, `조직`, `관계형 정책 데이터`를 대체하지 않고, 단순 선택값과 운영성 분류값만 담당합니다.

---

## 6. 현재 기본 시드

`npm run seed` 실행 시 아래 샘플 그룹이 함께 삽입됩니다.

### 시스템 / 공통

- `FILE_TYPE`: 파일 유형

### 조직 / 사용자

- `ORG_TYPE`: 조직 유형
- `USER_STATUS`: 사용자 상태

`ORG_TYPE`는 프론트 드롭다운/필터용 공통 코드이며, 실제 조직 계층의 원천 데이터는 여전히 `organization_units`입니다.

### 거래처 / 기본 정보

- `PARTNER_TYPE`: 거래처 유형

### 품목 / 자재

- `ITEM_TYPE`: 품목 유형
- `UNIT`: 단위

### 구매 / 발주

- `PURCHASE_ORDER_STATUS`: 발주 상태

### 납품 / 입고

- `DELIVERY_STATUS`: 납품 상태

### 재고

- `INVENTORY_TXN_TYPE`: 재고 이동 유형

### 승인 / 결재

- `APPROVAL_STATUS`: 결재 상태

현재 시드는 초기 화면 개발용 샘플 기준이며, 이후 실제 업무 흐름이 구체화되면 그룹과 코드 값을 점진적으로 확장하면 됩니다.

---

## 7. 프론트 구현 메모

현재 프론트의 공통 코드 관리 페이지는 아래 기준으로 동작합니다.

- 경로: `/common-code`
- 그룹 목록 API: `GET /common-codes/groups`
- 그룹별 코드 목록 API: `GET /common-codes/groups/:groupCode/codes`
- 활성 그룹과 활성 코드만 조회하는 읽기 중심 화면

관련 파일:

- `src/api/commonCode.ts`
- `src/pages/CommonCode.tsx`
