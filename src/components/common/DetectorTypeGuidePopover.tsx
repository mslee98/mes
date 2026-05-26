import { IDDCA_TYPE_PATH } from "../../lib/appRoutes";
import InfoActionPopover from "./InfoActionPopover";

const DEFAULT_DESCRIPTION =
  "검출기 타입·해상도·피치를 비교하려면 양산 현황 표를 확인하세요.";

type Props = {
  ariaLabel?: string;
  description?: string;
  disabled?: boolean;
};

/** 발주 제품 라인·생산 등록 등 — 검출기 타입(IDDCA) 표로 이동 */
export function DetectorTypeGuidePopover({
  ariaLabel = "검출기 타입 표 안내",
  description = DEFAULT_DESCRIPTION,
  disabled = false,
}: Props) {
  return (
    <InfoActionPopover
      ariaLabel={ariaLabel}
      description={description}
      actionLabel="타입 표 확인"
      disabled={disabled}
      onAction={() => window.open(IDDCA_TYPE_PATH, "_blank", "noopener,noreferrer")}
    />
  );
}
