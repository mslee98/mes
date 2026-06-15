import fs from "node:fs";
import path from "node:path";

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

let fixed = 0;
for (const file of walk("src").concat(walk("docs"))) {
  const before = fs.readFileSync(file, "utf8");
  const after = before.replace(
    /from (\.\.[^"';\s][^;\n]*)/g,
    'from "$1"'
  );
  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    fixed += 1;
  }
}
console.log(`fixed ${fixed} files`);
