export type UnitDetailTab = "overview" | "process" | "rma";

export const UNIT_DETAIL_TAB_OPTIONS: {
  value: UnitDetailTab;
  label: string;
}[] = [
  { value: "overview", label: "개요" },
  { value: "process", label: "공정 이력" },
  { value: "rma", label: "RMA" },
];

export function buildUnitDetailTabOptions(params: {
  processRecordCount?: number;
  rmaCount?: number;
}): { value: UnitDetailTab; label: string }[] {
  const processCount = Number(params.processRecordCount) || 0;
  const rmaCount = Number(params.rmaCount) || 0;
  return [
    { value: "overview", label: "개요" },
    {
      value: "process",
      label: processCount > 0 ? `공정 이력 (${processCount})` : "공정 이력",
    },
    {
      value: "rma",
      label: rmaCount > 0 ? `RMA (${rmaCount})` : "RMA",
    },
  ];
}

const VALID_TABS = new Set<UnitDetailTab>(["overview", "process", "rma"]);

export function parseUnitDetailTab(raw: string | null): UnitDetailTab {
  const t = String(raw ?? "").trim();
  if (t === "documents") return "overview";
  if (VALID_TABS.has(t as UnitDetailTab)) return t as UnitDetailTab;
  return "overview";
}
