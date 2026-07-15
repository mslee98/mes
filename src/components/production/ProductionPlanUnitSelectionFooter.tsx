import { createPortal } from "react-dom";
import Button from "../ui/button/Button";

type ProductionPlanUnitSelectionFooterProps = {
  visible: boolean;
  selectedCount: number;
  canCreateDelivery: boolean;
  onCreatePlan: () => void;
  onClear: () => void;
};

export function ProductionPlanUnitSelectionFooter({
  visible,
  selectedCount,
  canCreateDelivery,
  onCreatePlan,
  onClear,
}: ProductionPlanUnitSelectionFooterProps) {
  if (!canCreateDelivery) return null;

  return createPortal(
    <div
      className={`fixed inset-x-0 bottom-0 z-99998 border-t border-gray-200 bg-white/95 shadow-theme-lg backdrop-blur-sm transition-transform duration-300 ease-out dark:border-gray-800 dark:bg-gray-900/95 ${
        visible ? "translate-y-0" : "pointer-events-none translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <div className="mx-auto flex max-w-(--breakpoint-2xl) flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-6">
        <p className="text-sm text-gray-700 dark:text-gray-200">
          <span className="font-semibold tabular-nums text-gray-900 dark:text-white">
            {selectedCount}
          </span>
          건 선택됨
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onClear}>
            선택 해제
          </Button>
          <Button type="button" size="sm" onClick={onCreatePlan}>
            납품 계획 만들기
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
