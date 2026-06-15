import fs from "node:fs";

function fixImports(content, fromPrefix, toPrefix) {
  return content
    .replaceAll(`from "${fromPrefix}`, `from "${toPrefix}`)
    .replaceAll(`from '${fromPrefix}`, `from '${toPrefix}`);
}

// unitDuplicateCheck — correct API + fieldCheckToFormFieldProps
const fieldCheckFn = fs.readFileSync("scripts/_fieldCheckToFormFieldProps.txt", "utf8");
const duplicateCheck = `import type { ProductionPlanUnitDuplicateConflict } from "../../../api/purchaseOrder";

export type UnitFieldCheckStatus =
  | "idle"
  | "checking"
  | "available"
  | "duplicate"
  | "error";

export type UnitFieldCheckState = {
  status: UnitFieldCheckStatus;
  message?: string;
};

type FormFieldHelpTone = "default" | "error" | "success";

const SOURCE_LABEL: Record<string, string> = {
  production_plan_unit: "생산 유닛",
  product_serial: "제품 시리얼 마스터",
};

function conflictSummary(conflict: ProductionPlanUnitDuplicateConflict): string {
  const sourceKey = String(conflict.source ?? "").trim();
  const sourceLabel = (SOURCE_LABEL[sourceKey] ?? sourceKey) || "기타";
  const lot = String(conflict.unitCode ?? "").trim();
  if (lot) return \`\${sourceLabel} · \${lot}\`;
  return sourceLabel;
}

export function duplicateCheckMessage(
  fieldLabel: string,
  conflicts: ProductionPlanUnitDuplicateConflict[]
): string {
  if (conflicts.length === 0) {
    return \`\${fieldLabel}은(는) 이미 사용 중입니다.\`;
  }
  const summaries = conflicts.slice(0, 3).map(conflictSummary);
  const suffix =
    conflicts.length > 3 ? \` 외 \${conflicts.length - 3}건\` : "";
  return \`\${fieldLabel} 중복: \${summaries.join(", ")}\${suffix}\`;
}

export function availableCheckHint(fieldLabel: string): string {
  return \`\${fieldLabel} 사용 가능\`;
}

export function fieldCheckBlocksSave(state: UnitFieldCheckState): boolean {
  return state.status === "checking" || state.status === "duplicate";
}

${fieldCheckFn}
`;
fs.writeFileSync(
  "src/domains/production-plan/helpers/unitDuplicateCheck.ts",
  duplicateCheck,
  "utf8"
);

// unitLookupEligibility
let unitLookup = fs.readFileSync(
  "scripts/_extracted_unitLookupEligibility.ts",
  "utf8"
);
unitLookup = unitLookup.replace(
  'from "../api/rma"',
  'from "../../../api/rma"'
);
fs.writeFileSync(
  "src/domains/production-plan/helpers/unitLookupEligibility.ts",
  unitLookup,
  "utf8"
);

// unitListDates
let unitListDates = fs.readFileSync(
  "scripts/_extracted_productionPlanUnitListDates.ts",
  "utf8"
);
unitListDates = unitListDates
  .replace('from "../api/purchaseOrder"', 'from "../../../api/purchaseOrder"')
  .replace('from "./dateFormat"', 'from "../../../lib/dateFormat"');
fs.writeFileSync(
  "src/domains/production-plan/helpers/unitListDates.ts",
  unitListDates,
  "utf8"
);

// unitMappers
let unitMappers = fs.readFileSync(
  "scripts/_extracted_productionPlanUnitMappers.ts",
  "utf8"
);
unitMappers = unitMappers
  .replace('from "../api/purchaseOrder"', 'from "../../../api/purchaseOrder"')
  .replace(
    'from "./productionPlanDetailHelpers"',
    'from "../helpers/detailHelpers"'
  );
fs.writeFileSync(
  "src/domains/production-plan/mappers/unitMappers.ts",
  unitMappers,
  "utf8"
);

// listMappers productionManager fix
let listMappers = fs.readFileSync(
  "src/domains/production-plan/mappers/listMappers.ts",
  "utf8"
);
listMappers = listMappers.replace(
  `      productionManager: plan.productionManagerName
        ? {
            name: plan.productionManagerName,
            department: plan.productionManagerDepartment ?? null,
          }
        : null,`,
  `      productionManager: plan.productionManager?.name
        ? {
            name: plan.productionManager.name,
            department: plan.productionManagerDepartment ?? null,
          }
        : null,`
);
fs.writeFileSync(
  "src/domains/production-plan/mappers/listMappers.ts",
  listMappers,
  "utf8"
);

// deliveryPlanDetailHelpers import path
let deliveryPlanHelpers = fs.readFileSync(
  "src/lib/deliveryPlanDetailHelpers.ts",
  "utf8"
);
deliveryPlanHelpers = deliveryPlanHelpers.replace(
  'from "../../domains/delivery/labels/statusLabels"',
  'from "../domains/delivery/labels/statusLabels"'
);
fs.writeFileSync("src/lib/deliveryPlanDetailHelpers.ts", deliveryPlanHelpers, "utf8");

console.log("domain helper files restored");
