import fs from "fs";

const f = "src/components/unit/detail/UnitOverviewTab.tsx";
let c = fs.readFileSync(f, "utf8");

c = c.split('"??;"').join('"—";');
c = c.split('{ emptyFallback: "??,').join('{ emptyFallback: "—",');
c = c.split('{ emptyFallback: "?? });').join('{ emptyFallback: "—" });');
c = c.split("</SummaryRow>\"").join("</SummaryRow>");

const pairs = [
  ['<SummaryRow label="?목">', '<SummaryRow label="건명">'],
  ['<SummaryRow label="거래?>{partnerName}', '<SummaryRow label="거래처">{partnerName}'],
  ['<SummaryRow label="발주??>{orderDate}', '<SummaryRow label="발주일">{orderDate}'],
  ['<SummaryRow label="발주 ?태">', '<SummaryRow label="발주 상태">'],
  ['<SummaryRow label="최종 ?기">', '<SummaryRow label="최종 납기">'],
  ['<SummaryRow label="계획 ?번">', '<SummaryRow label="계획 차번">'],
  ['<SummaryRow label="계획 ?태">', '<SummaryRow label="계획 상태">'],
  ['<SummaryRow label="?산 ?정??>{productionScheduleYmd}', '<SummaryRow label="생산 예정일">{productionScheduleYmd}'],
  ['<SummaryRow label="?산 ?료??>{productionCompletedLabel}', '<SummaryRow label="생산 완료일">{productionCompletedLabel}'],
  ['<SummaryRow label="?산 지??>"', '<SummaryRow label="생산 지연">'],
  ['<SummaryRow label="?품 계획">', '<SummaryRow label="납품 계획">'],
  ['<SummaryRow label="?품번호">', '<SummaryRow label="납품번호">'],
  ['<SummaryRow label="?품 ?정??>{deliveryScheduleYmd}', '<SummaryRow label="납품 예정일">{deliveryScheduleYmd}'],
  ['<SummaryRow label="?품??>{hasDelivery ? deliveryDateYmd : "??}', '<SummaryRow label="납품일">{hasDelivery ? deliveryDateYmd : "—"}'],
  ['<SummaryRow label="?품 ?료">', '<SummaryRow label="납품 완료">'],
  ['<SummaryRow label="?품">', '<SummaryRow label="납품">'],
  ['<BentoTile title="발주 ?보"', '<BentoTile title="발주 정보"'],
];

for (const [from, to] of pairs) {
  c = c.split(from).join(to);
}

fs.writeFileSync(f, c, "utf8");
console.log("fixed UnitOverviewTab");
