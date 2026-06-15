import fs from "fs";
import path from "path";

const root = process.cwd();

const files = [
  "src/pages/UnitDetail.tsx",
  "src/components/delivery/ProductionPlanUnitEditModal.tsx",
  "src/components/order/ProductionPlanLineSelectionTable.tsx",
  "src/components/production/DeliveryUnitListRow.tsx",
  "src/components/production/ProductionPlanUnitsPanel.tsx",
  "src/components/unit/detail/UnitDetailHeaderCard.tsx",
  "src/components/unit/detail/UnitOverviewTab.tsx",
  "src/components/unit/detail/UnitProcessHistoryTab.tsx",
  "src/components/unit/SerialLotLookupModal.tsx",
  "src/pages/ui-playground/UiFormInputSection.tsx",
];

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
  "lib/invalidateProductionPlanUnitListQueries":
    "domains/production-plan/queries/invalidateUnitListQueries",
  "lib/productionPlanProcessLabels": "domains/production-plan/labels/processLabels",
};

function fixContent(raw) {
  let c = raw.replace(/\uFFFD/g, "");
  for (const [from, to] of Object.entries(importMap)) {
    c = c.split(from).join(to);
  }

  const lines = c.split("\n");
  const fixed = lines.map((line) => {
    const trimmed = line.trimEnd();
    const quoteCount = (trimmed.match(/"/g) || []).length;
    if (quoteCount % 2 === 1) {
      return trimmed + '"';
    }
    // fix broken ternary in JSX like: {x ? "a : "b"}
    if (trimmed.includes('? "') && trimmed.includes(': "') && quoteCount >= 2) {
      return trimmed.replace(/\? "([^"]*) : "([^"]*)"/g, '? "$1" : "$2"');
    }
    return line;
  });

  return fixed.join("\n");
}

for (const rel of files) {
  const p = path.join(root, rel);
  if (!fs.existsSync(p)) continue;
  const raw = fs.readFileSync(p, "utf8");
  fs.writeFileSync(p, fixContent(raw), "utf8");
  console.log("fixed", rel);
}

console.log("done");
