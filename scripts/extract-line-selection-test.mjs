import fs from "node:fs";

const line = fs
  .readFileSync(
    "C:/Users/user/.cursor/projects/c-Users-user-Desktop-ojt/agent-transcripts/17dae6c1-0d69-411e-9f9e-d3e7f249f9fe/17dae6c1-0d69-411e-9f9e-d3e7f249f9fe.jsonl",
    "utf8"
  )
  .split("\n")[65];
const j = JSON.parse(line);
for (const c of j.message.content) {
  if (
    c.input?.path?.includes("productionPlanLineSelection.test") &&
    c.input?.contents
  ) {
    let t = c.input.contents
      .replace(
        'from "../api/purchaseOrder"',
        'from "../../../api/purchaseOrder"'
      )
      .replace('from "./dateFormat"', 'from "../../../lib/format/dateFormat"')
      .replace(
        'from "./productionPlanLineSelection"',
        'from "./lineSelection"'
      );
    fs.writeFileSync(
      "src/domains/production-plan/helpers/lineSelection.test.ts",
      t,
      "utf8"
    );
    console.log("wrote test", t.length);
  }
}
