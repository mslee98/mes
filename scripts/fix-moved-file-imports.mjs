import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const SPECIAL = {
  "src/domains/delivery/display/deliveryUnitListDisplay.ts": {
    "./partnerCountryOptions": "../../partner/helpers/partnerCountryOptions",
  },
  "src/domains/delivery/helpers/deliveryPlanDetailHelpers.ts": {
    "./apiError": "../../../lib/api/apiError",
  },
  "src/domains/delivery/layout/deliveryUnitDataTableLayout.ts": {
    "../components/list/DataTable/dataTableStyles":
      "../../../components/list/DataTable/dataTableStyles",
  },
  "src/domains/delivery/policy/unitDetailDeliveryPolicy.ts": {
    "./deliveryPlanDetailHelpers": "../helpers/deliveryPlanDetailHelpers",
  },
  "src/domains/order/helpers/orderLineAmountSummary.tsx": {
    "./formatCurrency": "../../../lib/format/formatCurrency",
  },
  "src/domains/order/helpers/orderLineDetectorFields.ts": {
    "../features/order-form/types": "../../../features/order-form/types",
  },
  "src/domains/order/helpers/orderLineItemRow.ts": {
    "../features/order-form/types": "../../../features/order-form/types",
  },
  "src/domains/order/helpers/orderRequesterSelect.ts": {
    "./legacySelectValue": "../../../lib/legacySelectValue",
  },
  "src/domains/partner/helpers/partnerSelectOptions.ts": {
    "../components/form/SearchableSelectWithCreate":
      "../../../components/form/SearchableSelectWithCreate",
    "./partnerDisplay": "../display/partnerDisplay",
  },
  "src/lib/auth/authRefreshCoordinator.ts": {
    "../config/keycloakEnv": "../../config/keycloakEnv",
  },
  "src/lib/auth/keycloakClient.ts": {
    "../config/keycloakEnv": "../../config/keycloakEnv",
  },
  "src/lib/auth/mapKeycloakTokenToAuthUser.ts": {
    "../types/authUser": "../../types/authUser",
  },
  "src/lib/notify.ts": {
    "./apiError": "./api/apiError",
  },
  "src/lib/queryClient.ts": {
    "./apiError": "./api/apiError",
  },
};

for (const [rel, replacements] of Object.entries(SPECIAL)) {
  const filePath = path.join(root, rel);
  if (!fs.existsSync(filePath)) continue;
  let content = fs.readFileSync(filePath, "utf8");
  for (const [from, to] of Object.entries(replacements)) {
    content = content.replaceAll(`from "${from}"`, `from "${to}"`);
  }
  fs.writeFileSync(filePath, content, "utf8");
  console.log("patched", rel);
}

console.log("import patches applied");
