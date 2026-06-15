import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = process.cwd();
const importMap = {
  "lib/productionPlanDetailHelpers": "domains/production-plan/helpers/detailHelpers",
  "lib/productionPlanLineSelection": "domains/production-plan/helpers/lineSelection",
  "lib/legacyProductSerialNumber": "domains/production-plan/serial/legacyProductSerialNumber",
  "lib/placeholderProductSerial": "domains/production-plan/serial/placeholderProductSerial",
  "lib/productionPlanUnitMappers": "domains/production-plan/mappers/unitMappers",
  "lib/productionPlanUnitListDates": "domains/production-plan/helpers/unitListDates",
  "lib/productionPlanUnitListPerspective": "domains/production-plan/helpers/unitListPerspective",
  "lib/productionPlanListMappers": "domains/production-plan/mappers/listMappers",
  "lib/productionPlanUnitDuplicateCheck": "domains/production-plan/helpers/unitDuplicateCheck",
  "lib/productionPlanUnitEditPolicy": "domains/production-plan/policy/unitEditPolicy",
  "lib/productionPlanProcessSequence": "domains/production-plan/helpers/processSequence",
  "lib/productionRegisterFromPlanUnit": "domains/production-plan/helpers/registerFromPlanUnit",
  "lib/distributeProductionPlanItems": "domains/production-plan/helpers/distributeItems",
  "lib/aggregateProductionRegisteredQty": "domains/production-plan/helpers/aggregateRegisteredQty",
  "lib/productionPlanSerialFromOrderLine": "domains/production-plan/helpers/serialFromOrderLine",
  "lib/unitLookupEligibility": "domains/production-plan/helpers/unitLookupEligibility",
  "lib/unitProcessRecordAttachments": "domains/production-plan/helpers/unitProcessRecordAttachments",
  "lib/invalidateProductionPlanUnitListQueries": "domains/production-plan/queries/invalidateUnitListQueries",
  "lib/productionPlanProcessLabels": "domains/production-plan/labels/processLabels",
  "lib/productionPlanStatusLabels": "domains/production-plan/labels/statusLabels",
  "lib/deliveryPlanStatusLabels": "domains/delivery/labels/statusLabels",
  "lib/deliveryUnitPageLabels": "domains/delivery/labels/pageLabels",
};

// UI 페이지(DeliveryUnits 등)는 git HEAD가 구버전일 수 있음 — transcript/수동 복구 사용
const SKIP_FROM_HEAD = new Set(["src/pages/DeliveryUnits.tsx"]);

const corrupted = [
  "src/components/delivery/ProcessGateContextPanel.tsx",
  "src/components/delivery/ProcessModalProductSummary.tsx",
  "src/components/delivery/ProcessPipelineStepper.tsx",
  "src/components/delivery/ProductionPlanDetailOverviewTab.tsx",
  "src/components/delivery/ProductionPlanUnitEditModal.tsx",
  "src/components/delivery/UnitProcessRecordsTimeline.tsx",
  "src/components/order/OrderDetailLinkUnitsModal.tsx",
  "src/components/order/ProductionPlanLineSelectionTable.tsx",
  "src/components/production/DeliveryUnitListRow.tsx",
  "src/components/production/ProductionPlanUnitsPanel.tsx",
  "src/components/unit/detail/UnitDetailHeaderCard.tsx",
  "src/components/unit/detail/UnitOverviewTab.tsx",
  "src/components/unit/detail/UnitProcessHistoryTab.tsx",
  "src/components/unit/SerialLotLookupModal.tsx",
  "src/pages/OrderDetail.tsx",
  "src/pages/ProductionPlanDetail.tsx",
  "src/pages/ui-playground/UiFormInputSection.tsx",
  "src/pages/UnitDetail.tsx",
];

function applyMap(content) {
  let c = content;
  for (const [from, to] of Object.entries(importMap)) {
    c = c.split(from).join(to);
  }
  return c;
}

for (const rel of corrupted) {
  if (SKIP_FROM_HEAD.has(rel)) {
    console.log("SKIP (manual restore)", rel);
    continue;
  }
  try {
    let content = execSync(`git show HEAD:${rel}`, {
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
    });
    content = applyMap(content);
    fs.writeFileSync(path.join(root, rel), content, "utf8");
    console.log("restored", rel);
  } catch (e) {
    console.log("SKIP (not in HEAD)", rel);
  }
}

console.log("done");
