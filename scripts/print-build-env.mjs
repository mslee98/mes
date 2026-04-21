import fs from "node:fs";
import path from "node:path";

const mode = process.argv[2] || "production";
const envFilePath = path.resolve(process.cwd(), `.env.${mode}`);

function parseEnvFile(contents) {
  const result = {};
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex < 0) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

function firstDefined(...values) {
  for (const value of values) {
    if (typeof value === "string" && value.length > 0) return value;
  }
  return "";
}

const rawFile = fs.existsSync(envFilePath) ? fs.readFileSync(envFilePath, "utf8") : "";
const fileEnv = parseEnvFile(rawFile);

const checks = [
  "VITE_KEYCLOAK_ENABLED",
  "VITE_KEYCLOAK_URL",
  "VITE_KEYCLOAK_REALM",
  "VITE_KEYCLOAK_CLIENT_ID",
  "VITE_KEYCLOAK_LOGIN_REDIRECT_URI",
  "VITE_KEYCLOAK_POST_LOGOUT_REDIRECT_URI",
];

console.log("[build-env-check] --------------------------------");
console.log(`[build-env-check] mode: ${mode}`);
console.log(`[build-env-check] env file: ${envFilePath}`);
console.log(
  `[build-env-check] env file exists: ${fs.existsSync(envFilePath) ? "yes" : "no"}`
);
for (const key of checks) {
  const value = firstDefined(process.env[key], fileEnv[key]);
  const source =
    typeof process.env[key] === "string" && process.env[key].length > 0
      ? "process.env"
      : key in fileEnv
        ? `.env.${mode}`
        : "missing";
  const printable = value || "(empty)";
  console.log(`[build-env-check] ${key}: ${printable} (source: ${source})`);
}
console.log("[build-env-check] --------------------------------");
