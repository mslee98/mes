/**
 * 내부망 이동용: dist 내 모든 파일에 .txt 붙이기 / 제거
 * - 프로젝트에서: node scripts/toggle-txt-extension.js add   → dist에 스크립트 복사 후 .txt 붙임
 * - 프로젝트에서: node scripts/toggle-txt-extension.js remove → dist 내 .txt 제거
 * - dist 안에서:  node toggle-txt-extension.js remove         → 내부망에서 복원 시 (같은 폴더 기준)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT_NAME = "toggle-txt-extension.js";

// 스크립트가 dist 안에 있으면 현재 폴더가 dist, 아니면 프로젝트/scripts 기준 ../dist
const DIST_DIR =
  path.basename(__dirname) === "dist"
    ? __dirname
    : path.resolve(__dirname, "..", "dist");

function getAllFiles(dir, list = []) {
  if (!fs.existsSync(dir)) {
    console.error(`오류: dist 폴더가 없습니다. (${dir})`);
    process.exit(1);
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      getAllFiles(full, list);
    } else {
      list.push(full);
    }
  }
  return list;
}

function addTxt() {
  // 프로젝트에서 실행한 경우에만 dist에 스크립트 복사 (내부망에서 복원용)
  if (path.basename(__dirname) !== "dist") {
    const scriptPath = path.join(__dirname, SCRIPT_NAME);
    const destPath = path.join(DIST_DIR, SCRIPT_NAME);
    fs.copyFileSync(scriptPath, destPath);
    console.log(`dist에 ${SCRIPT_NAME} 복사됨 (내부망에서 복원 시 사용)\n`);
  }

  const files = getAllFiles(DIST_DIR);
  let count = 0;
  for (const filePath of files) {
    if (path.basename(filePath) === SCRIPT_NAME) continue; // 스크립트는 .txt 붙이지 않음
    if (filePath.endsWith(".txt")) continue; // 이미 .txt인 파일은 스킵
    const newPath = filePath + ".txt";
    fs.renameSync(filePath, newPath);
    console.log(`${path.relative(DIST_DIR, filePath)} → ${path.relative(DIST_DIR, newPath)}`);
    count += 1;
  }
  console.log(`\n완료: ${count}개 파일에 .txt를 붙였습니다.`);
}

function removeTxt() {
  const files = getAllFiles(DIST_DIR);
  const toRename = files.filter((f) => f.endsWith(".txt"));
  for (const filePath of toRename) {
    const newPath = filePath.slice(0, -4); // 끝의 '.txt' 제거
    fs.renameSync(filePath, newPath);
    console.log(`${path.relative(DIST_DIR, filePath)} → ${path.relative(DIST_DIR, newPath)}`);
  }
  console.log(`\n완료: ${toRename.length}개 파일에서 .txt를 제거했습니다.`);
}

const mode = process.argv[2];
if (mode === "add") {
  addTxt();
} else if (mode === "remove") {
  removeTxt();
} else {
  console.log(`
사용법:
  (외부망, 옮기기 전)
    npm run dist:add-txt   또는  node scripts/toggle-txt-extension.js add
    → dist에 이 스크립트를 복사한 뒤, 나머지 파일에 .txt 붙임

  (내부망, 복원할 때) dist 폴더 안에서:
    node toggle-txt-extension.js remove
    → *.txt 파일에서 .txt 제거
`);
  process.exit(1);
}
