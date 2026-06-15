import { useMemo, useState } from "react";
import type { CommonCodeItem } from "../../../api/commonCode";
import type {
  DeliveryPlanDetailResponse,
  DeliveryPlanUnitSummary,
} from "../../../api/purchaseOrder";
import SegmentedControl from "../../common/SegmentedControl";
import Input from "../../form/input/InputField";
import {
  DELIVERY_PLAN_UNIT_FILTER_OPTIONS,
  filterDeliveryPlanGroups,
  type DeliveryPlanUnitFilterTab,
} from "../../../domains/delivery/helpers/deliveryPlanDetailHelpers";
import { DeliveryPlanUnitGroupSection } from "./DeliveryPlanUnitGroupSection";

type DeliveryPlanDetailUnitsPanelProps = {
  plan: DeliveryPlanDetailResponse;
  processStatusCodes: CommonCodeItem[];
  processStepCodes: CommonCodeItem[];
  editable: boolean;
  onRemove: (unit: DeliveryPlanUnitSummary) => void;
};

export function DeliveryPlanDetailUnitsPanel({
  plan,
  processStatusCodes,
  processStepCodes,
  editable,
  onRemove,
}: DeliveryPlanDetailUnitsPanelProps) {
  const [filterTab, setFilterTab] = useState<DeliveryPlanUnitFilterTab>("ALL");
  const [keyword, setKeyword] = useState("");

  const filteredGroups = useMemo(
    () => filterDeliveryPlanGroups(plan, filterTab, keyword),
    [plan, filterTab, keyword]
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs dark:border-white/[0.06] dark:bg-white/[0.03]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-theme-sm font-semibold text-gray-900 dark:text-white">
          품목 목록
        </h2>
        <div className="w-full sm:w-auto sm:min-w-[16rem]">
          <Input
            type="search"
            placeholder="LOT, S/N, 품목, PP 번호 검색"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>
      </div>

      <div className="mt-4">
        <SegmentedControl<DeliveryPlanUnitFilterTab>
          value={filterTab}
          onChange={setFilterTab}
          options={[...DELIVERY_PLAN_UNIT_FILTER_OPTIONS]}
          ariaLabel="품목 상태 필터"
          equalWidth
          className="w-full sm:max-w-2xl"
        />
      </div>

      {filteredGroups.length === 0 ? (
        <p className="mt-4 py-8 text-center text-theme-sm text-gray-500 dark:text-gray-400">
          조건에 맞는 품목이 없습니다.
        </p>
      ) : (
        <div className="mt-4 max-w-full overflow-x-auto">
          <div className="min-w-0 space-y-4">
            {filteredGroups.map(({ group, units, groupKey }) => (
              <DeliveryPlanUnitGroupSection
                key={groupKey}
                group={group}
                units={units}
                groupKey={groupKey}
                processStatusCodes={processStatusCodes}
                processStepCodes={processStepCodes}
                editable={editable}
                onRemove={onRemove}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
