import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

/** @type {Array<{from: string, to: string}>} */
const MOVES = [
  // delivery
  ["src/lib/deliveryPlanDetailHelpers.ts", "src/domains/delivery/helpers/deliveryPlanDetailHelpers.ts"],
  ["src/lib/deliveryDetailHelpers.ts", "src/domains/delivery/helpers/deliveryDetailHelpers.ts"],
  ["src/lib/deliveryDetailFormat.ts", "src/domains/delivery/helpers/deliveryDetailFormat.ts"],
  ["src/lib/deliveryUnitListDisplay.ts", "src/domains/delivery/display/deliveryUnitListDisplay.ts"],
  ["src/lib/deliveryPlanUnitSelection.ts", "src/domains/delivery/helpers/deliveryPlanUnitSelection.ts"],
  ["src/lib/unitDetailDeliveryPolicy.ts", "src/domains/delivery/policy/unitDetailDeliveryPolicy.ts"],
  ["src/lib/deliveryUnitDataTableLayout.ts", "src/domains/delivery/layout/deliveryUnitDataTableLayout.ts"],
  ["src/lib/invalidateDeliveryPlanListQueries.ts", "src/domains/delivery/queries/invalidateDeliveryPlanListQueries.ts"],
  // order
  ["src/lib/orderLineDisplay.ts", "src/domains/order/display/orderLineDisplay.ts"],
  ["src/lib/orderLineDetectorFields.ts", "src/domains/order/helpers/orderLineDetectorFields.ts"],
  ["src/lib/orderDetailLinesTableLayout.ts", "src/domains/order/layout/orderDetailLinesTableLayout.ts"],
  ["src/lib/orderLineAmountSummary.tsx", "src/domains/order/helpers/orderLineAmountSummary.tsx"],
  ["src/lib/orderLineItemRow.ts", "src/domains/order/helpers/orderLineItemRow.ts"],
  ["src/lib/orderRequesterSelect.ts", "src/domains/order/helpers/orderRequesterSelect.ts"],
  ["src/lib/orderReturnNavigation.ts", "src/domains/order/helpers/orderReturnNavigation.ts"],
  // partner
  ["src/lib/partnerDisplay.ts", "src/domains/partner/display/partnerDisplay.ts"],
  ["src/lib/partnerPredicates.ts", "src/domains/partner/helpers/partnerPredicates.ts"],
  ["src/lib/partnerSelectOptions.ts", "src/domains/partner/helpers/partnerSelectOptions.ts"],
  ["src/lib/partnerCountryOptions.ts", "src/domains/partner/helpers/partnerCountryOptions.ts"],
  // production-plan leftovers in lib
  ["src/lib/productionPlanDetailHelpers.ts", "src/domains/production-plan/helpers/detailHelpers.ts"],
  ["src/lib/productionPlanLineSelection.ts", "src/domains/production-plan/helpers/lineSelection.ts"],
  ["src/lib/productionPlanLineSelection.test.ts", "src/domains/production-plan/helpers/lineSelection.test.ts"],
  ["src/lib/legacyProductSerialNumber.ts", "src/domains/production-plan/serial/legacyProductSerialNumber.ts"],
  ["src/lib/placeholderProductSerial.ts", "src/domains/production-plan/serial/placeholderProductSerial.ts"],
  ["src/lib/productionPlanUnitMappers.ts", "src/domains/production-plan/mappers/unitMappers.ts"],
  ["src/lib/productionPlanUnitListDates.ts", "src/domains/production-plan/helpers/unitListDates.ts"],
  ["src/lib/productionPlanUnitListPerspective.ts", "src/domains/production-plan/helpers/unitListPerspective.ts"],
  ["src/lib/productionPlanListMappers.ts", "src/domains/production-plan/mappers/listMappers.ts"],
  ["src/lib/productionPlanUnitDuplicateCheck.ts", "src/domains/production-plan/helpers/unitDuplicateCheck.ts"],
  ["src/lib/productionPlanUnitEditPolicy.ts", "src/domains/production-plan/policy/unitEditPolicy.ts"],
  ["src/lib/productionPlanProcessSequence.ts", "src/domains/production-plan/helpers/processSequence.ts"],
  ["src/lib/productionRegisterFromPlanUnit.ts", "src/domains/production-plan/helpers/registerFromPlanUnit.ts"],
  ["src/lib/distributeProductionPlanItems.ts", "src/domains/production-plan/helpers/distributeItems.ts"],
  ["src/lib/aggregateProductionRegisteredQty.ts", "src/domains/production-plan/helpers/aggregateRegisteredQty.ts"],
  ["src/lib/productionPlanSerialFromOrderLine.ts", "src/domains/production-plan/helpers/serialFromOrderLine.ts"],
  ["src/lib/unitLookupEligibility.ts", "src/domains/production-plan/helpers/unitLookupEligibility.ts"],
  ["src/lib/unitProcessRecordAttachments.ts", "src/domains/production-plan/helpers/unitProcessRecordAttachments.ts"],
  ["src/lib/invalidateProductionPlanUnitListQueries.ts", "src/domains/production-plan/queries/invalidateUnitListQueries.ts"],
  ["src/lib/productionPlanProcessLabels.ts", "src/domains/production-plan/labels/processLabels.ts"],
  ["src/lib/productionPlanStatusLabels.ts", "src/domains/production-plan/labels/statusLabels.ts"],
  ["src/lib/deliveryPlanStatusLabels.ts", "src/domains/delivery/labels/statusLabels.ts"],
  ["src/lib/deliveryUnitPageLabels.ts", "src/domains/delivery/labels/pageLabels.ts"],
  ["src/lib/deliveryStatusLabels.ts", "src/domains/production-plan/labels/processLabels.ts"],
  // phase 5 common lib
  ["src/lib/apiError.ts", "src/lib/api/apiError.ts"],
  ["src/lib/keycloakClient.ts", "src/lib/auth/keycloakClient.ts"],
  ["src/lib/authAccessStore.ts", "src/lib/auth/authAccessStore.ts"],
  ["src/lib/authRefreshCoordinator.ts", "src/lib/auth/authRefreshCoordinator.ts"],
  ["src/lib/mapKeycloakTokenToAuthUser.ts", "src/lib/auth/mapKeycloakTokenToAuthUser.ts"],
  ["src/lib/dateFormat.ts", "src/lib/format/dateFormat.ts"],
  ["src/lib/formatCurrency.ts", "src/lib/format/formatCurrency.ts"],
  ["src/lib/dueDateDisplay.ts", "src/lib/format/dueDateDisplay.ts"],
  ["src/lib/numberInput.ts", "src/lib/format/numberInput.ts"],
  ["src/lib/priceInput.ts", "src/lib/format/priceInput.ts"],
  ["src/lib/time12h24h.ts", "src/lib/format/time12h24h.ts"],
  ["src/lib/ltSerialFormat.ts", "src/lib/format/ltSerialFormat.ts"],
  ["src/lib/lotUnitCodeFormat.ts", "src/lib/format/lotUnitCodeFormat.ts"],
  ["src/lib/monthRangeInput.ts", "src/lib/format/monthRangeInput.ts"],
  ["src/lib/buttonStyles.ts", "src/lib/ui/buttonStyles.ts"],
  ["src/lib/checkboxInputStyles.ts", "src/lib/ui/checkboxInputStyles.ts"],
  ["src/lib/radioInputStyles.ts", "src/lib/ui/radioInputStyles.ts"],
  ["src/lib/badgeStatusColor.ts", "src/lib/ui/badgeStatusColor.ts"],
  ["src/lib/fileTypeIcon.ts", "src/lib/ui/fileTypeIcon.ts"],
  ["src/lib/copyToClipboard.ts", "src/lib/ui/copyToClipboard.ts"],
];

/** old basename (no ext) -> new import suffix from src/ */
const IMPORT_MAP = new Map(
  MOVES.map(([from, to]) => {
    const base = path.basename(from).replace(/\.(tsx?)$/, "");
    const rel = to.replace(/^src\//, "").replace(/\.(tsx?)$/, "");
    return [base, rel];
  })
);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === "dist") continue;
      walk(p, out);
    } else if (/\.(tsx?|md)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function depthPrefix(file) {
  const rel = path.relative(root, file).replace(/\\/g, "/");
  const depth = rel.split("/").length - 2;
  return depth > 0 ? "../".repeat(depth) : "./";
}

function rewriteImports(content, file) {
  let next = content;
  const prefix = depthPrefix(file);

  for (const [base, targetRel] of IMPORT_MAP) {
    const patterns = [
      new RegExp(`from (["'])\\.\\./lib/${base}\\1`, "g"),
      new RegExp(`from (["'])\\.\\./\\.\\./lib/${base}\\1`, "g"),
      new RegExp(`from (["'])\\.\\./\\.\\./\\.\\./lib/${base}\\1`, "g"),
      new RegExp(`from (["'])\\.\\./\\.\\./\\.\\./\\.\\./lib/${base}\\1`, "g"),
      new RegExp(`from (["'])@/lib/${base}\\1`, "g"),
      new RegExp(`from (["'])lib/${base}\\1`, "g"),
    ];
    for (const re of patterns) {
      next = next.replace(re, `from ${prefix}${targetRel}$1`);
    }
  }

  // generic ../lib/foo -> ../lib/<subdir>/foo for phase5 only (if still ../lib/)
  const phase5 = [
    "apiError",
    "keycloakClient",
    "authAccessStore",
    "authRefreshCoordinator",
    "mapKeycloakTokenToAuthUser",
    "dateFormat",
    "formatCurrency",
    "dueDateDisplay",
    "numberInput",
    "priceInput",
    "time12h24h",
    "ltSerialFormat",
    "lotUnitCodeFormat",
    "monthRangeInput",
    "buttonStyles",
    "checkboxInputStyles",
    "radioInputStyles",
    "badgeStatusColor",
    "fileTypeIcon",
    "copyToClipboard",
  ];
  for (const base of phase5) {
    const mapped = IMPORT_MAP.get(base);
    if (!mapped) continue;
    const re = new RegExp(`from (["'])(?:\\.\\./)+lib/${base}\\1`, "g");
    next = next.replace(re, `from $1${prefix}${mapped}$1`);
  }

  return next;
}

function fixMovedFileImports(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, "utf8");
  const dir = path.dirname(filePath);
  const relToSrc = path.relative(path.join(root, "src"), dir).replace(/\\/g, "/");
  const up = relToSrc.split("/").filter(Boolean).length;
  const prefix = up > 0 ? "../".repeat(up) : "./";

  content = content
    .replace(/from "\.\.\/api\//g, `from "${prefix}api/`)
    .replace(/from "\.\.\/\.\.\/api\//g, `from "${prefix}api/`)
    .replace(/from "\.\.\/lib\//g, `from "${prefix}lib/`)
    .replace(/from "\.\.\/\.\.\/lib\//g, `from "${prefix}lib/`)
    .replace(/from "\.\.\/domains\//g, `from "${prefix}domains/`)
    .replace(/from "\.\.\/\.\.\/domains\//g, `from "${prefix}domains/`)
    .replace(/from "\.\.\/\.\.\/\.\.\/domains\//g, `from "${prefix}domains/`);

  fs.writeFileSync(filePath, content, "utf8");
}

// execute moves (skip if target exists and source missing)
for (const [from, to] of MOVES) {
  const fromPath = path.join(root, from);
  const toPath = path.join(root, to);
  if (!fs.existsSync(fromPath)) continue;
  fs.mkdirSync(path.dirname(toPath), { recursive: true });
  if (fs.existsSync(toPath)) {
    fs.unlinkSync(fromPath);
    console.log("removed duplicate", from);
  } else {
    fs.renameSync(fromPath, toPath);
    console.log("moved", from, "->", to);
  }
  fixMovedFileImports(toPath);
}

// rewrite all source imports
const files = walk(path.join(root, "src")).concat(walk(path.join(root, "docs")));
for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  const after = rewriteImports(before, file);
  if (after !== before) fs.writeFileSync(file, after, "utf8");
}

console.log("migration complete");
