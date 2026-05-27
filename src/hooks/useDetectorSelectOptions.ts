import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { getDetectors } from "../api/detectors";
import type { SearchableSelectOption } from "../components/form/SearchableSelectWithCreate";

/** 발주·납품 등 검출기 마스터 드롭다운 옵션 */
export function useDetectorSelectOptions(
  accessToken: string | null | undefined,
  enabled: boolean
) {
  const { data: detectorList = [], isLoading } = useQuery({
    queryKey: ["detectors", "forSelect", "active"],
    queryFn: () =>
      getDetectors(accessToken as string, { isActive: true, forSelect: true }),
    enabled: !!accessToken && enabled,
  });

  const options: SearchableSelectOption[] = useMemo(
    () =>
      detectorList
        .filter((item) => item.isActive !== false)
        .map((item) => {
          const displayLabel = String(item.displayLabel ?? "").trim();
          if (displayLabel) {
            return { value: String(item.id), label: displayLabel };
          }
          const detectorType = String(item.detectorType ?? "").trim();
          const arrayWidth = Number(item.arrayWidth);
          const arrayHeight = Number(item.arrayHeight);
          const pitch = String(item.pitch ?? "").trim();
          const roicType = String(item.roicType ?? "").trim();
          const resolution =
            Number.isFinite(arrayWidth) && Number.isFinite(arrayHeight)
              ? `${arrayWidth}*${arrayHeight}`
              : "-";
          const pitchLabel = pitch ? `${pitch}` : "-";
          const roicLabel = roicType || "-";
          const label = `${detectorType} | ${resolution} | ${pitchLabel} | ${roicLabel}`;
          return { value: String(item.id), label };
        })
        .filter((item) => item.value.length > 0),
    [detectorList]
  );

  const labelById = useMemo(() => {
    const m = new Map<string, string>();
    options.forEach((o) => m.set(o.value, o.label));
    return m;
  }, [options]);

  return { options, labelById, isLoading, detectorList };
}
