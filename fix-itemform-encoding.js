const fs = require("fs");
const path = "src/pages/ItemForm.tsx";
let s = fs.readFileSync(path, "utf8");

// Option labels
s = s.replace(
  /\{ value: "", label: "\?\? \?\?" \},\n    \];\n    flattenCategories/,
  '{ value: "", label: "분류 선택" },\n    ];\n    flattenCategories'
);
s = s.replace(
  /\{ value: "", label: "\?\? \?\?" \},\n    \];\n    itemTypes\.forEach/,
  '{ value: "", label: "유형 선택" },\n    ];\n    itemTypes.forEach'
);
s = s.replace(
  /\{ value: "", label: "\?\? \?\?" \},\n    \];\n    unitCodes\.forEach/,
  '{ value: "", label: "단위 선택" },\n    ];\n    unitCodes.forEach'
);
s = s.replace(/label: "\?".repeat\(level\)/, 'label: "\u3000".repeat(level)');
s = s.replace(/\( \?\?\? \)\)/, "(기존값)");
s = s.replace(/label: "\? \(KRW\)", symbol: "\?"/, 'label: "원 (KRW)", symbol: "원"');

// Comment
s = s.replace(
  /\/\*\* \?\? \? \?\?\? \?\?\? \(\? \?\? \?\? \?\?\?\) \*\*\//,
  "/** 수정 시 비교용 초기값 (폼 로드 시점 스냅샷) */"
);

// Toasts
s = s.replace(/toast\.success\(" \?\?\? \?\?\?\?\?\?\?\?\?\.\"\);/g, (m) => {
  const idx = s.indexOf(m);
  const before = s.substring(0, idx);
  const createCount = (before.match(/createMutation/g) || []).length;
  const updateCount = (before.match(/updateMutation/g) || []).length;
  if (updateCount > createCount) return 'toast.success("품목이 수정되었습니다.");';
  return 'toast.success("품목이 등록되었습니다.");';
});
s = s.replace(/onError: \(e: Error\) => toast\.error\(e\.message \|\| " \?\?\? \?\?\?\?\?\?\.\"\),\s*\n\s*\}\);\s*\n\s*const updateMutation/, 'onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),\n  });\n\n  const updateMutation');
s = s.replace(/onError: \(e: Error\) => toast\.error\(e\.message \|\| " \?\?\? \?\?\?\?\?\?\.\"\),\s*\n\  \}\);\s*\n\s*const handleSubmit/, 'onError: (e: Error) => toast.error(e.message || "수정에 실패했습니다."),\n  });\n\n  const handleSubmit');

s = s.replace(/toast\.error\(" \?\? \?\?\? \?\?\?\?\?\?\.\"\);\s*\n\s*return;\s*\n\s*\}\s*\n\s*if \(!name\.trim\(\)\)/s, 'toast.error("품목 코드를 입력하세요.");\n      return;\n    }\n    if (!name.trim())');
s = s.replace(/toast\.error\(" \?\?\?\? \?\?\?\?\?\?\.\"\);/g, 'toast.error("품목명을 입력하세요.");');
s = s.replace(/toast\.error\(" \?\? \?\?\? \?\?\?\?\?\?\.\"\);\s*return;\s*\}\s*if \(!typeId\)/s, 'toast.error("품목 분류를 선택하세요.");\n      return;\n    }\n    if (!typeId)');
s = s.replace(/toast\.error\(" \?\? \?\?\? \?\?\?\?\?\?\.\"\);\s*return;/g, (m) => {
  if (s.indexOf(m) !== s.lastIndexOf(m)) {
    return 'toast.error("품목 유형을 선택하세요.");\n      return;';
  }
  return 'toast.error("품목 분류를 선택하세요.");\n      return;';
});

// PageMeta, etc - do simple replace all for known patterns
s = s.replace(/title=" \?\? \?\?" description=" \?\? \?\?" \/>\s*\n\s*<PageBreadcrumb pageTitle=" \?\? \?\?" \/>\s*\n\s*<div className="flex min-h-\[320px\]/g, 'title="품목 수정" description="품목 수정" />\n        <PageBreadcrumb pageTitle="품목 수정" />\n        <div className="flex min-h-[320px]');
s = s.replace(/message=" \?\? \?\?\? \?\?\?\? \?\.\.\.\" \/>/g, 'message="품목 정보를 불러오는 중..." />');
s = s.replace(/title=\{isNew \? " \?\? \?\?" : " \?\? \?\?"\}/g, 'title={isNew ? "품목 등록" : "품목 수정"}');
s = s.replace(/description=\{isNew \? " \?\? \?\?" : " \?\? \?\?"\}/g, 'description={isNew ? "품목 등록" : "품목 수정"}');
s = s.replace(/pageTitle=\{isNew \? " \?\? \?\?" : " \?\? \?\?"\} \/>/g, 'pageTitle={isNew ? "품목 등록" : "품목 수정"} />');
s = s.replace(/desc=" \?\? \?\?\? \?\?\? \?\?\? \? \?\?, \?\?\?, \?\? \?\? \?\?\?\?\?\?\?\?\.\"/g, 'desc="품목 분류와 유형을 선택한 뒤 코드, 품목명, 단가 등을 입력하세요."');
s = s.replace(/htmlFor="item-code"> \?\? \?\? \*<\/Label>/g, 'htmlFor="item-code">품목 코드 *</Label>');
s = s.replace(/placeholder=" \?\? \?\?"\s*\n\s*className="mt-1"\s*\n\s*disabled=\{!isNew\}/g, 'placeholder="품목 코드"\n                  className="mt-1"\n                  disabled={!isNew}');
s = s.replace(/htmlFor="item-name"> \?\?\? \*<\/Label>/g, 'htmlFor="item-name">품목명 *</Label>');
s = s.replace(/placeholder=" \?\?\?"\s*\n\s*className="mt-1"\s*\n\s*\/>\s*\n\s*<\/div>\s*\n\s*<div>\s*\n\s*<Label htmlFor="item-category">/g, 'placeholder="품목명"\n                  className="mt-1"\n                />\n              </div>\n              <div>\n                <Label htmlFor="item-category">');
s = s.replace(/htmlFor="item-category"> \?\? \?\? \*<\/Label>/g, 'htmlFor="item-category">품목 분류 *</Label>');
s = s.replace(/htmlFor="item-type"> \?\? \?\? \*<\/Label>/g, 'htmlFor="item-type">품목 유형 *</Label>');
s = s.replace(/htmlFor="item-unit"> \?\?<\/Label>/g, 'htmlFor="item-unit">단위</Label>');
s = s.replace(/htmlFor="item-unitPrice"> \?\?<\/Label>/g, 'htmlFor="item-unitPrice">단가</Label>');
s = s.replace(/selectPlaceholder=" \?\? \?\?"/g, 'selectPlaceholder="통화 선택"');
s = s.replace(/htmlFor="item-spec"> \?\?<\/Label>/g, 'htmlFor="item-spec">규격</Label>');
s = s.replace(/placeholder=" \?\?"\s*\n\s*className="mt-1"\s*\n\s*\/>\s*\n\s*<\/div>\s*\n\s*<div className="sm:col-span-2">\s*\n\s*<Label htmlFor="item-productDiv">/g, 'placeholder="규격"\n                  className="mt-1"\n                />\n              </div>\n              <div className="sm:col-span-2">\n                <Label htmlFor="item-productDiv">');
s = s.replace(/htmlFor="item-productDiv"> \?\? \?\?<\/Label>/g, 'htmlFor="item-productDiv">제품 구분</Label>');
s = s.replace(/placeholder=" \?\? \?\?"\s*\n\s*className="mt-1"\s*\n\s*\/>\s*\n\s*<\/div>\s*\n\s*<div className="flex items-center gap-2 sm:col-span-2">/g, 'placeholder="제품 구분"\n                  className="mt-1"\n                />\n              </div>\n              <div className="flex items-center gap-2 sm:col-span-2">');
s = s.replace(/htmlFor="item-active"> \?\?<\/Label>/g, 'htmlFor="item-active">활성</Label>');
s = s.replace(/\{isPending \? " \?\? \?\.\.\." : isNew \? " \?\?" : " \?\?"\}/g, '{isPending ? "저장 중..." : isNew ? "등록" : "수정"}');
s = s.replace(/>\s*\n\s* \?\?\s*\n\s*<\/button>\s*\n\s*<\/div>\s*\n\s*<\/form>/g, '>\n                취소\n              </button>\n            </div>\n          </form>');

fs.writeFileSync(path, s);
console.log("Done");
