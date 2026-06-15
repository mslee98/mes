/**
 * 생산·납품 현황(Unit 상세) 및 연관 컴포넌트 한글 복구.
 * PowerShell 치환 금지 — Node UTF-8 only.
 */
import fs from "fs";
import path from "path";

const root = process.cwd();

/** @type {Array<[string, string, Array<[string, string]>]>} */
const fileReplacements = [
  [
    "src/components/unit/detail/UnitDetailHeaderCard.tsx",
    "utf8",
    [
      [
        "/** Unit ?세 고정 ?더 ??발주 ?세 ?더? ?일 2?????·?션 / ?약 지?? */",
        "/** Unit 상세 고정 헤더 — 발주 상세 헤더와 동일 2행 구조(액션 / 요약 지표) */",
      ],
      ['aria-label="?품 ?약"', 'aria-label="품목 요약"'],
      ["?목 목록", "품목 목록"],
      ["?산 계획", "생산 계획"],
      ['title="LOT·?당·?리???정"', 'title="LOT·담당·시리얼 수정"'],
      ["?정", "수정"],
      ["?품 ?록", "납품 등록"],
      ["RMA ?수", "RMA 접수"],
      ['label="?품 S/N"', 'label="제품 S/N"'],
      ['label="?재 공정"', 'label="현재 공정"'],
      ['label="?품"', 'label="납품"'],
      ["?품 ?료", "납품 완료"],
      ["?품 ??              </Badge>", "납품 대기\n              </Badge>"],
      ["진행 ?              </Badge>", "진행 중\n              </Badge>"],
      ["미출??여", "미출고 잔여"],
      ['label="?산 ?정??"', 'label="생산 예정일"'],
    ],
  ],
  [
    "src/components/unit/detail/UnitProcessHistoryTab.tsx",
    "utf8",
    [
      ['title="공정 ?이?라??"', 'title="공정 파이프라인"'],
      [
        "desc={`?품?기? ${pipelineStepCount}?계 · ?치??재 공정 주???시`}",
        "desc={`제품군별 ${pipelineStepCount}단계 · 표시·현재 공정 주석 표시`}",
      ],
    ],
  ],
  [
    "src/pages/UnitDetail.tsx",
    "utf8",
    [
      [
        "/**\n * ?품 1?(Unit) ?세 ??공정·?품·RMA.\n *\n * 공정/?리???품? `flatRow`(발주 ?목 + `resolvePlanUnitDetectorFields`)???존?니??\n * Unit API(`processUnit`)만으로는 ?자·?장·productId가 비어 ?을 ???습?다.\n *\n * @see docs/process-handling-frontend-temp.md\n */",
        "/**\n * 제품 1대(Unit) 상세 — 공정·납품·RMA.\n *\n * 공정/시리얼·납품은 `flatRow`(발주 품목 + `resolvePlanUnitDetectorFields`)에 의존합니다.\n * Unit API(`processUnit`)만으로는 소자·파장·productId가 비어 있을 수 있습니다.\n *\n * @see docs/process-handling-frontend-temp.md\n */",
      ],
      [
        'toast.error("?리???성???요???보가 ?습?다.")',
        'toast.error("시리얼 생성에 필요한 정보가 없습니다.")',
      ],
      [
        'toast.error("거래?코드가 ?어 ?리?을 ?성?????습?다.")',
        'toast.error("거래처 코드가 없어 시리얼을 생성할 수 없습니다.")',
      ],
      [
        'toast.success("?리??번호?발급?습?다.")',
        'toast.success("시리얼 번호를 발급했습니다.")',
      ],
      [
        'return "공정 처리 첨???결???력 ?보?찾? 못했?니??";',
        'return "공정 처리 첨부를 연결할 이력 정보를 찾지 못했습니다.";',
      ],
      [
        'return e instanceof Error ? e.message : "첨? ?로?에 ?패?습?다.";',
        'return e instanceof Error ? e.message : "첨부 업로드에 실패했습니다.";',
      ],
      ['throw new Error("?품 ?보가 ?습?다.")', 'throw new Error("제품 정보가 없습니다.")'],
      [
        'throw new Error("?재 공정 ?보가 ?습?다.")',
        'throw new Error("현재 공정 정보가 없습니다.")',
      ],
      [
        'throw new Error("검출기 ?리???버??력?세??");',
        'throw new Error("검출기 시리얼 넘버를 입력하세요.");',
      ],
      [
        'throw new Error("검출기 ?자·?장 ?보가 ?어 ?품 ?리?을 ?정?????습?다.");',
        'throw new Error("검출기 소자·파장 정보가 없어 제품 시리얼을 확정할 수 없습니다.");',
      ],
      [
        'throw new Error("?산 계획 ?보가 ?습?다.");',
        'throw new Error("생산 계획 정보가 없습니다.");',
      ],
      ['toast.success("PASS 처리?었?니??");', 'toast.success("PASS 처리되었습니다.");'],
      [
        'toast.error(e.message || "PASS 처리???패?습?다.");',
        'toast.error(e.message || "PASS 처리에 실패했습니다.");',
      ],
      [
        'throw new Error("불합??유??력?세??");',
        'throw new Error("불합격 사유를 입력하세요.");',
      ],
      ['toast.success("FAIL 처리?었?니??");', 'toast.success("FAIL 처리되었습니다.");'],
      [
        'toast.error(e.message || "FAIL 처리???패?습?다.");',
        'toast.error(e.message || "FAIL 처리에 실패했습니다.");',
      ],
      [
        'invalidMessage={`${DELIVERY_UNIT_DETAIL_PAGE_LABEL} 조회 권한(delivery.read)???습?다.`}',
        'invalidMessage={`${DELIVERY_UNIT_DETAIL_PAGE_LABEL} 조회 권한(delivery.read)이 없습니다.`}',
      ],
      ['invalidMessage="?못???별?입?다."', 'invalidMessage="잘못된 Unit ID입니다."'],
      [
        'message="?보?불러?는 중입?다."',
        'message="Unit 정보를 불러오는 중입니다."',
      ],
      [
        ': "?보?불러?? 못했?니??"',
        ': "Unit 정보를 불러오지 못했습니다."',
      ],
      ["?품 ?록", "납품 등록"],
      ['label="?품 ?품??"', 'label="제품 납품일"'],
      ['placeholder="??????"', 'placeholder="년-월-일"'],
      ["비고 (?택)", "비고 (선택)"],
      [
        "?재 공정?서 PASS·FAIL???택?면 바로 반영?니??",
        "현재 공정에서 PASS·FAIL을 선택하면 바로 반영됩니다.",
      ],
      ["?기", "닫기"],
      ['toast.success("첨???로?했?니??");', 'toast.success("첨부를 업로드했습니다.");'],
      [
        'toast.error(e instanceof Error ? e.message : "첨? ?로?에 ?패?습?다.");',
        'toast.error(e instanceof Error ? e.message : "첨부 업로드에 실패했습니다.");',
      ],
    ],
  ],
  [
    "src/components/delivery/ProductionPlanUnitEditModal.tsx",
    "utf8",
    [
      ['"LOT 중복 조회???패?습?다."', '"LOT 중복 조회에 실패했습니다."'],
      ['"검출기 S/N 중복 조회???패?습?다."', '"검출기 S/N 중복 조회에 실패했습니다."'],
      ['duplicateCheckMessage("?품 S/N"', 'duplicateCheckMessage("제품 S/N"'],
      ['availableCheckHint("?품 S/N")', 'availableCheckHint("제품 S/N")'],
      ['": "?품 S/N 중복 조회???패?습?다."', '": "제품 S/N 중복 조회에 실패했습니다."'],
      ['label: "?당???음"', 'label: "담당자 없음"'],
      ['throw new Error("?목 ?보가 ?습?다.")', 'throw new Error("품목 정보가 없습니다.")'],
      ['toast.success("?목 ?보가 ??되?습?다.")', 'toast.success("품목 정보가 저장되었습니다.")'],
      [
        'toast.error(e.message || "?목 ?보???하지 못했?니??")',
        'toast.error(e.message || "품목 정보를 저장하지 못했습니다.")',
      ],
      [
        'toast.error("?록??검출기 S/N? 비울 ???습?다.")',
        'toast.error("등록된 검출기 S/N은 비울 수 없습니다.")',
      ],
      [
        'toast.error("?록???품 S/N? 비울 ???습?다.")',
        'toast.error("등록된 제품 S/N은 비울 수 없습니다.")',
      ],
      ['toast.error("변경된 ?????습?다.")', 'toast.error("변경된 항목이 없습니다.")'],
      [
        'toast.error("중복??값이 ?어 ??할 ???습?다.")',
        'toast.error("중복된 값이 있어 저장할 수 없습니다.")',
      ],
      [
        'toast.error("중복 ?인???난 ????해 주세??")',
        'toast.error("중복 확인이 끝난 뒤 저장해 주세요.")',
      ],
      ['|| "?목"', '|| "품목"'],
      ["?목 ?보 ?정", "품목 정보 수정"],
      [
        `?품 ?료 ??LOT·?당??정?????습?다. ?록??검출기·?품
                  S/N? 계속 ?정?????습?다.`,
        `납품 완료 — LOT·담당은 수정할 수 없습니다. 등록된 검출기·제품
                  S/N은 계속 수정할 수 있습니다.`,
      ],
      [
        `?정 가?한 ?????습?다. 검출기·?품 S/N? 각각 값이 ?록??              경우?만 ???면?서 ?정?????습?다.`,
        "수정 가능한 항목이 없습니다. 검출기·제품 S/N은 각각 값이 등록된 경우에만 화면에서 수정할 수 있습니다.",
      ],
      ['"?품 ?료 ?에??정?????습?다."', '"납품 완료 이전에만 수정할 수 있습니다."'],
      ['placeholder="LT-yyyyMMdd-??"', 'placeholder="LT-yyyyMMdd-…"'],
      ['label="?산 ?당??"', 'label="생산 담당자"'],
      ['placeholder="?산 ?당???택"', 'placeholder="생산 담당자 선택"'],
      ['noOptionsMessage="?시???당?? ?습?다."', 'noOptionsMessage="표시할 담당자가 없습니다."'],
      [
        '"검출기 S/N???록??경우?만 ?정?????습?다."',
        '"검출기 S/N이 등록된 경우에만 수정할 수 있습니다."',
      ],
      ['placeholder="검출기 ?리??"', 'placeholder="검출기 시리얼"'],
      ['label="?품 S/N"', 'label="제품 S/N"'],
      [
        '"?품 S/N???록??경우?만 ?정?????습?다."',
        '"제품 S/N이 등록된 경우에만 수정할 수 있습니다."',
      ],
      ['placeholder="?두????4?리 ?자"', 'placeholder="접두사+끝 4자리 숫자"'],
    ],
  ],
  [
    "src/components/production/ProductionPlanUnitsPanel.tsx",
    "utf8",
    [
      [
        'message="?닛 목록??불러?는 중입?다."',
        'message="유닛 목록을 불러오는 중입니다."',
      ],
      [
        ': "?닛 목록??불러?? 못했?니??"',
        ': "유닛 목록을 불러오지 못했습니다."',
      ],
      [
        "?산 계획 ?세 조회 권한???어 ?닛???시?????습?다.",
        "생산 계획 상세 조회 권한이 없어 유닛을 표시할 수 없습니다.",
      ],
      ["?닛 ?음", "유닛 없음"],
      ["?닛 {resolvedVisibleCount}", "유닛 {resolvedVisibleCount}"],
      ["?리??              </TableCell>", "시리얼\n              </TableCell>"],
      [">?목</TableCell>", ">품목</TableCell>"],
      ["?산 ?당", "생산 담당"],
      ["?재 공정", "현재 공정"],
      [">?태</TableCell>", ">상태</TableCell>"],
      ["최종 ?기", "최종 납기"],
      ["?시", "표시"],
      ["{limit}?            </button>", "{limit}건\n            </button>"],
      ["?체 {totalUnits}?            </button>", "전체 {totalUnits}건\n            </button>"],
    ],
  ],
  [
    "src/components/order/ProductionPlanLineSelectionTable.tsx",
    "utf8",
    [
      ["?록??발주 ?목???습?다.", "등록된 발주 품목이 없습니다."],
      ["} ?택`", "} 선택`"],
      ["} ?번 ?산?량`", "} 이번 생산수량`"],
    ],
  ],
  [
    "src/components/unit/detail/UnitOverviewTab.tsx",
    "utf8",
    [
      [
        "/** 개요 ????발주·계획·?품 ?결, ?품·검출기 ?펙, 최근 공정 */",
        "/** 개요 탭 — 발주·계획·납품 연결, 제품·검출기 스펙, 최근 공정 */",
      ],
    ],
  ],
];

// UnitDetail.tsx — deliver mutation strings (distinct from product info)
const unitDetailPath = path.join(root, "src/pages/UnitDetail.tsx");
let unitDetail = fs.readFileSync(unitDetailPath, "utf8");
const deliverReplacements = [
  [
    /throw new Error\("제품 정보가 없습니다\."\);\s*\}\s*const poItemId/s,
    'throw new Error("납품 정보가 없습니다.");\n      }\n      const poItemId',
  ],
];
// Only fix deliver-specific errors if still corrupted
const deliverFixes = [
  [
    'throw new Error("발주 ?목 ?보가 ?어 ?품???록?????습?다.")',
    'throw new Error("발주 품목 정보가 없어 납품을 등록할 수 없습니다.")',
  ],
  [
    'throw new Error("?품 ?목 ?인??찾? 못했?니??")',
    'throw new Error("납품 품목 라인을 찾지 못했습니다.")',
  ],
  ['toast.success("?품???록?었?니??");', 'toast.success("납품이 등록되었습니다.");'],
  [
    'toast.error(e.message || "?품 ?록???패?습?다.")',
    'toast.error(e.message || "납품 등록에 실패했습니다.")',
  ],
];
for (const [from, to] of deliverFixes) {
  if (unitDetail.includes(from)) {
    unitDetail = unitDetail.split(from).join(to);
  }
}
// deliver mutation uses "제품 정보" for process but "납품 정보" for deliver - fix if pass/fail already fixed
unitDetail = unitDetail.replace(
  /mutationFn: async \(\) => \{\s*if \(!processUnit \|\| !accessToken \|\| !orderId\) \{\s*throw new Error\("제품 정보가 없습니다\."\);/,
  `mutationFn: async () => {
      if (!processUnit || !accessToken || !orderId) {
        throw new Error("납품 정보가 없습니다.");`
);

let changed = 0;
for (const [relPath, , replacements] of fileReplacements) {
  const abs = path.join(root, relPath);
  let content = relPath === "src/pages/UnitDetail.tsx" ? unitDetail : fs.readFileSync(abs, "utf8");
  let fileChanged = false;
  for (const [from, to] of replacements) {
    if (!content.includes(from)) continue;
    content = content.split(from).join(to);
    fileChanged = true;
  }
  if (fileChanged || relPath === "src/pages/UnitDetail.tsx") {
    fs.writeFileSync(abs, content, "utf8");
    changed += 1;
    console.log(`restored: ${relPath}`);
  }
}

console.log(`done (${changed} files)`);
