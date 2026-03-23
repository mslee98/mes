# 발주 1차 결재(상신·승인) — 백엔드 연동 체크리스트

프론트는 **로그인 사용자 `users.id`**와 발주의 **`firstApproverUserId`**를 맞추어 팀장(왕희집 등)에게 **승인 버튼**을 보여 줍니다. 아래가 맞아야 동작이 끊기지 않습니다.

## 1. 로그인·세션 응답에 `users.id` 포함

- `POST /auth/login`, `POST /auth/refresh` 응답의 `user` 객체에 **`id`(숫자, `users` 테이블 PK)** 를 넣는 것을 권장합니다.
- 없으면 프론트는 `GET /users` 목록에서 **`employeeNo`로만** 본인 행을 찾아 `id`를 씁니다. 목록에 본인이 없거나 필드가 다르면 승인 버튼이 안 뜰 수 있습니다.

## 2. 상신 후 상세에 1차 결재자 ID가 내려와야 함

- `POST /purchase-orders/:id/approval/submit` 성공 후 `GET /purchase-orders/:id` 에 **`firstApproverUserId`**(또는 snake_case 매핑)와 가능하면 **`firstApprover`** 관계 객체가 포함되어야 합니다.
- 상신 시 본문의 `firstApproverUserId`가 DB에 그대로 저장되는지 확인하세요.

## 3. 승인 API 권한(서버 검증)

- 문서대로 **`firstApproverUserId` = 현재 JWT 사용자 id** 이거나, 역할이 **`ADMIN` / `SYSTEM_MANAGER` / `PURCHASE_MANAGER` / `EXECUTIVE`** 인 경우만 승인 허용.
- 프론트는 `GET /auth/users/:userId/roles` 로 같은 역할 코드를 조회해 **승인 버튼을 보조적으로** 열어 줍니다. 이 API가 403이면 역할 기반 노출은 생략되고, **1차 결재자 id 매칭만**으로 버튼이 결정됩니다.

## 4. 등록자만 상신(선택·문서 정합)

- 스펙상 **등록자만 상신** 가능(일부 역할 예외). 프론트는 `createdBy.id`와 로그인 `id`가 같을 때만 **상신** 버튼을 노출합니다.
- **`GET /purchase-orders/:id`의 `createdBy`에 `id`가 반드시 포함**되어야 위 분기가 정확합니다. 없으면 상신 버튼이 넓게 열려 서버가 막는 형태가 됩니다.

## 5. 열람 범위

- 팀장이 상세 URL로 들어왔을 때 **404가 아니라 상세가 보여야** 승인 UI까지 도달합니다. 문서의 `created_by`·같은 팀 소속 스코프 규칙이 팀장 계정에 맞게 동작하는지 확인하세요.

---

문서 버전: 프론트 `OrderDetail` 팀장 승인 UX 반영 기준.
