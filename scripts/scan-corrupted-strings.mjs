import fs from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "src");
const hits = [];

/** 연속 ?? 또는 한글+? 혼합 — 인코딩 손상 의심 */
const PATTERNS = [
  /"(?:[^"\\]|\\.)*\?\?(?:[^"\\]|\\.)*"/g,
  /"(?:[^"\\]|\\.)*[가-힣]\?(?:[^"\\]|\\.)*"/g,
  /"(?:[^"\\]|\\.)*\?[가-힣](?:[^"\\]|\\.)*"/g,
];

/** 허용: 의도적 placeholder (API/코드) */
function isAllowed(snippet) {
  if (snippet.includes("??")) {
    // nullish coalescing inside strings is rare; keep ?? patterns
  }
  if (/"\?\?"/.test(snippet)) return true;
  if (/"\?\."/.test(snippet)) return true;
  return false;
}

function walk(dir) {
  for (const name of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, name.name);
    if (name.isDirectory()) {
      if (name.name === "node_modules" || name.name === "deprecated-inactive") continue;
      walk(full);
      continue;
    }
    if (!/\.(ts|tsx)$/.test(name.name)) continue;
    const text = fs.readFileSync(full, "utf8");
    const rel = path.relative(process.cwd(), full).replace(/\\/g, "/");
    for (const re of PATTERNS) {
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(text)) !== null) {
        const snippet = m[0];
        if (isAllowed(snippet)) continue;
        const line = text.slice(0, m.index).split("\n").length;
        hits.push({ file: rel, line, snippet: snippet.slice(0, 100) });
      }
    }
  }
}

walk(root);

const unique = [...new Map(hits.map((h) => [`${h.file}:${h.line}`, h])).values()];

if (unique.length === 0) {
  console.log("No corrupted string patterns found.");
  process.exit(0);
}

console.log(`Found ${unique.length} suspicious string(s):`);
for (const h of unique.slice(0, 50)) {
  console.log(`${h.file}:${h.line}  ${h.snippet}`);
}
if (unique.length > 50) {
  console.log(`... and ${unique.length - 50} more`);
}
process.exit(1);
