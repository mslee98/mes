import Label from "../form/Label";

type ProductionQuantityInputSectionProps = {
  qtyInput: string;
  onQtyInputChange: (next: string) => void;
  orderTotalQty: number;
  /** 발주 대비 이미 반영된 수량 — 계획: 생산 등록, 실적: 납품(실생산) */
  orderConsumedQty: number;
  thisProductionQty: number;
  orderRemainingQty: number;
  displayedRemainingQty: number;
  exceedsRemaining: boolean;
  purpose: "plan" | "actual";
};

function QtyStatCell({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "brand" | "warning";
}) {
  const valueClass =
    tone === "brand"
      ? "text-brand-600 dark:text-brand-400"
      : tone === "warning"
        ? "text-error-600 dark:text-error-400"
        : "text-gray-800 dark:text-white/90";

  return (
    <div className="flex h-11 items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 dark:border-gray-700 dark:bg-gray-900/40">
      <span className="shrink-0 text-theme-xs text-gray-500 dark:text-gray-400">
        {label}
      </span>
      <span className={`text-sm font-semibold tabular-nums ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

export function ProductionQuantityInputSection({
  qtyInput,
  onQtyInputChange,
  orderTotalQty,
  orderConsumedQty,
  thisProductionQty,
  orderRemainingQty,
  displayedRemainingQty,
  exceedsRemaining,
  purpose,
}: ProductionQuantityInputSectionProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="delivery-serial-qty" required>
        이번 생산 수량
      </Label>

      <div className="grid gap-3 sm:grid-cols-[minmax(10rem,14rem)_1fr] sm:items-center">
        <div className="flex h-11 rounded-lg shadow-theme-xs">
          <input
            id="delivery-serial-qty"
            type="text"
            inputMode="numeric"
            value={qtyInput}
            onChange={(e) =>
              onQtyInputChange(e.target.value.replace(/\D/g, ""))
            }
            placeholder="0"
            className="h-11 min-w-0 flex-1 rounded-l-lg rounded-r-none border border-gray-300 bg-white px-3 text-sm tabular-nums text-gray-900 shadow-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          />
          <span className="inline-flex h-11 shrink-0 items-center rounded-r-lg border border-l-0 border-gray-300 px-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300">
            EA
          </span>
        </div>

        <div className="grid h-11 grid-cols-3 gap-2">
          <QtyStatCell label="발주" value={orderTotalQty} />
          <QtyStatCell
            label={purpose === "plan" ? "생산 등록" : "기납"}
            value={orderConsumedQty}
          />
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
      </div>

      {exceedsRemaining ? (
        <p className="text-theme-xs text-amber-700 dark:text-amber-400">
          잔여 수량({orderRemainingQty})을 초과했습니다.
          {purpose === "plan"
            ? " 미리보기는 잔여 수량까지만 표시됩니다."
            : " 미리보기는 잔여 수량까지만 생성됩니다."}
        </p>
      ) : null}
    </div>
  );
}
