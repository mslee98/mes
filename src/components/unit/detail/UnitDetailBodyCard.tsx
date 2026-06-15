import type { ReactNode } from "react";
import SegmentedControl from "../../common/SegmentedControl";
import { DELIVERY_UNIT_DETAIL_PAGE_LABEL } from "../../../domains/delivery/labels/pageLabels";
import type { UnitDetailTab } from "../unitDetailTabTypes";
import { unitDetailCardClassName } from "./unitDetailCardShell";

export type UnitDetailBodyCardProps = {
  activeTab: UnitDetailTab;
  onTabChange: (tab: UnitDetailTab) => void;
  tabOptions: { value: UnitDetailTab; label: string }[];
  children: ReactNode;
};

/** Unit 상세 바디 카드 — 탭 + 탭별 콘텐츠 */
export function UnitDetailBodyCard({
  activeTab,
  onTabChange,
  tabOptions,
  children,
}: UnitDetailBodyCardProps) {
  return (
    <section className={unitDetailCardClassName} aria-label="제품 상세 내용">
      <div className="border-b border-gray-200 px-4 py-4 sm:px-6 dark:border-gray-800">
        <SegmentedControl<UnitDetailTab>
          value={activeTab}
          onChange={onTabChange}
          options={tabOptions}
          ariaLabel={`${DELIVERY_UNIT_DETAIL_PAGE_LABEL} 탭`}
          equalWidth
          className="w-full"
        />
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </section>
  );
}
