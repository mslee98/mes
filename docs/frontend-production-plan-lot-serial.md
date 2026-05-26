# 생산 계획 · LOT · 제품 시리얼 (프론트)

백엔드 핸드오프: [`backend-handoff-production-plan-lot.md`](./backend-handoff-production-plan-lot.md)

## 권장 흐름

1. **수량·인수일 입력** → `GET /api/purchase-orders/:orderId/lot/preview?quantity=&issuedDate=`
   - `previews[].unitCode`만 표시 (DB 예약 없음)
   - 테이블에서 LOT 수정 가능(표시용; 확정 시 서버 채번 `{}` 기준)
2. **`POST .../production-plans`** — `items`만, units 없음
3. **`POST .../issue-lot-units`** — `{}` (LOT 확정)
4. 공정 PASS/FAIL
5. **`POST .../assign-product-serials`** — 제품 시리얼 **전체 문자열**(접두사+끝 4자리). UI는 접두사 읽기 전용 + 4자리 입력 (`src/lib/productSerialAssign.ts`)

## LOT_YEAR_CODE

- `GET /api/common-codes/groups/LOT_YEAR_CODE/codes` — 팝오버·설명용
- 채번 정본: 서버 `lot/preview` / `issue-lot-units`

## 구현

- `OrderDetail.tsx` — 생산 계획 모달
- `lotUnitCodeFormat.ts` — 패턴·공통코드 기반 예시
- `ProductionPlanAssignProductSerialsCard.tsx` — 제품 시리얼 확정
