import { QtyStatCell } from "./ProductionQuantityInputSection";

type ProductionPlanOrderQtyStatsProps = {
  orderTotalQty: number;
  orderConsumedQty: number;
  thisProductionQty: number;
  orderRemainingQty: number;
};

/** 생산 계획 모달 — 품목별 수량 입력 합계 기준 발주·등록·잔여 (기존 단일 입력 통계와 동일) */
export function ProductionPlanOrderQtyStats({
  orderTotalQty,
  orderConsumedQty,
  thisProductionQty,
  orderRemainingQty,
}: ProductionPlanOrderQtyStatsProps) {
  const displayedRemainingQty =
    orderTotalQty - orderConsumedQty - thisProductionQty;
  const exceedsRemaining = thisProductionQty > orderRemainingQty;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        <QtyStatCell label="발주" value={orderTotalQty} />
        <QtyStatCell label="생산 등록" value={orderConsumedQty} />
        <QtyStatCell
          label="잔여"
          value={displayedRemainingQty}
          tone={
            displayedRemainingQty < 0
              ? "warning"
              : thisProductionQty > 0
                ? "brand"
                : "default"
          }
        />
      </div>
      {exceedsRemaining ? (
        <p className="text-theme-xs text-amber-700 dark:text-amber-400">
          잔여 수량({orderRemainingQty})을 초과했습니다. 미리보기는 잔여 수량까지만
          표시됩니다.
        </p>
      ) : null}
    </div>
  );
}
