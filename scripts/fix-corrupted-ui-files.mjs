import fs from "node:fs";

// SerialLotLookupModal restore
let serial = fs.readFileSync("scripts/_extracted_SerialLotLookupModal.tsx", "utf8");
serial = serial.replace(
  'from "../../lib/unitLookupEligibility"',
  'from "../../domains/production-plan/helpers/unitLookupEligibility"'
);
fs.writeFileSync("src/components/unit/SerialLotLookupModal.tsx", serial, "utf8");

// UiFormInputSection restore with terminology card
let ui = fs.readFileSync("scripts/_extracted_UiFormInputSection.tsx", "utf8");
const patch = fs.readFileSync("scripts/_extracted_UiFormInputSection_patch.txt", "utf8");
ui = ui.replace(
  /  return \(\n    <>\n      <ComponentCard\n        title="FormField \+ Input \(권장\)"/,
  patch.trim()
);
ui = ui.replace(
  'from "../../lib/productionPlanUnitDuplicateCheck"',
  'from "../../domains/production-plan/helpers/unitDuplicateCheck"'
);
ui = ui.replace(
  'helpText="납품 준비 이후 또는 계획 완료 상태에서만 수정할 수 있습니다."',
  'helpText="제품 S/N이 등록된 경우에만 수정할 수 있습니다."'
);
fs.writeFileSync("src/pages/ui-playground/UiFormInputSection.tsx", ui, "utf8");

// UnitDetail deliver button label fix
let unit = fs.readFileSync("src/pages/UnitDetail.tsx", "utf8");
unit = unit.replace(
  '{deliverMutation.isPending ? "?록 중? : "?품 ?록"}"',
  '{deliverMutation.isPending ? "등록 중…" : "납품 등록"}'
);
fs.writeFileSync("src/pages/UnitDetail.tsx", unit, "utf8");

console.log("restored corrupted UI files");
