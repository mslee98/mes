import type { ReactNode } from "react";
import SegmentedControl from "../../components/common/SegmentedControl";
import {
  UI_PLAYGROUND_TAB_OPTIONS,
  type UiPlaygroundTab,
} from "./types";

type UiPlaygroundTabNavProps = {
  activeTab: UiPlaygroundTab;
  onTabChange: (tab: UiPlaygroundTab) => void;
  children: ReactNode;
};

export function UiPlaygroundTabNav({
  activeTab,
  onTabChange,
  children,
}: UiPlaygroundTabNavProps) {
  return (
    <div className="space-y-6">
      <SegmentedControl
        ariaLabel="UI Playground 섹션"
        value={activeTab}
        onChange={onTabChange}
        options={UI_PLAYGROUND_TAB_OPTIONS}
      />
      <div role="tabpanel" aria-label={activeTab}>
        {children}
      </div>
    </div>
  );
}
