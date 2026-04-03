import { Fragment, useMemo, useState } from "react";
import { Link } from "react-router";
import ComponentCard from "../common/ComponentCard";
import Label from "../form/Label";
import TextArea from "../form/input/TextArea";
import Badge from "../ui/badge/Badge";
import Button from "../ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

export type LineStep = {
  order: number;
  role: string;
  name: string;
  dept: string;
  status: "기안" | "승인" | "대기" | "예정" | "반려" | "참조";
  actedAt: string;
  opinion: string;
};

export type ApprovalDocumentMock = {
  documentNo: string;
  title: string;
  docType: string;
  drafter: string;
  department: string;
  draftAt: string;
  bodySummary: string[];
  lines: LineStep[];
  headerBadge: {
    label: string;
    color: "warning" | "success" | "error" | "primary" | "info";
  };
};

export const APPROVAL_MOCK_BY_ID: Record<string, ApprovalDocumentMock> = {
  "1": {
    headerBadge: { label: "결재중", color: "warning" },
    documentNo: "AD-2025-0318",
    title: "○○ 프로젝트 발주 승인 요청",
    docType: "발주 승인",
    drafter: "김기안",
    department: "구매1팀",
    draftAt: "2025-03-18 09:12",
    bodySummary: [
      "공급사: (주)샘플테크",
      "총 공급가액(부가세별도): ₩125,400,000",
      "납기: 2025-04-30",
      "특이사항: 계약서 2.3조 납기 연장 옵션 포함",
    ],
    lines: [
      {
        order: 0,
        role: "기안",
        name: "김기안",
        dept: "구매1팀",
        status: "기안",
        actedAt: "03-18 09:12",
        opinion: "상신합니다.",
      },
      {
        order: 1,
        role: "검토",
        name: "박팀장",
        dept: "구매1팀",
        status: "승인",
        actedAt: "03-18 11:20",
        opinion: "검토 완료.",
      },
      {
        order: 2,
        role: "결재",
        name: "이결재",
        dept: "경영지원본부",
        status: "대기",
        actedAt: "—",
        opinion: "—",
      },
      {
        order: 3,
        role: "전결",
        name: "정임원",
        dept: "임원",
        status: "예정",
        actedAt: "—",
        opinion: "—",
      },
    ],
  },
  "2": {
    headerBadge: { label: "결재중", color: "warning" },
    documentNo: "AD-2025-0312",
    title: "IT 장비 추가 구매 품의",
    docType: "구매",
    drafter: "이요청",
    department: "정보전략팀",
    draftAt: "2025-03-15 08:45",
    bodySummary: [
      "노트북 12대, 모니터 12대",
      "예산 과목: IT운영비",
      "긴급 사유: 신규 프로젝트 투입",
    ],
    lines: [
      {
        order: 0,
        role: "기안",
        name: "이요청",
        dept: "정보전략팀",
        status: "기안",
        actedAt: "03-15 08:45",
        opinion: "긴건 상신",
      },
      {
        order: 1,
        role: "검토",
        name: "최팀장",
        dept: "정보전략팀",
        status: "승인",
        actedAt: "03-15 10:02",
        opinion: "타당",
      },
      {
        order: 2,
        role: "결재",
        name: "한이사",
        dept: "DX추진실",
        status: "대기",
        actedAt: "—",
        opinion: "—",
      },
    ],
  },
  "3": {
    headerBadge: { label: "완료", color: "success" },
    documentNo: "AD-2025-0288",
    title: "협력사 계약 갱신 검토",
    docType: "계약",
    drafter: "박법무",
    department: "법무팀",
    draftAt: "2025-03-10 13:20",
    bodySummary: ["갱신 기간: 2년", "주요 변경: SLA 항목", "법무 검토 완료"],
    lines: [
      {
        order: 0,
        role: "기안",
        name: "박법무",
        dept: "법무팀",
        status: "기안",
        actedAt: "03-10 13:20",
        opinion: "검토 요청",
      },
      {
        order: 1,
        role: "결재",
        name: "오본부장",
        dept: "경영지원",
        status: "승인",
        actedAt: "03-11 09:00",
        opinion: "승인",
      },
    ],
  },
  "4": {
    headerBadge: { label: "반려", color: "error" },
    documentNo: "AD-2025-0291",
    title: "분기 예산 집행 내역 보고",
    docType: "보고",
    drafter: "최기획",
    department: "기획팀",
    draftAt: "2025-03-12 10:00",
    bodySummary: ["집행률 87%", "다음 분기 조정안 첨부"],
    lines: [
      {
        order: 0,
        role: "기안",
        name: "최기획",
        dept: "기획팀",
        status: "기안",
        actedAt: "03-12 10:00",
        opinion: "보고",
      },
      {
        order: 1,
        role: "결재",
        name: "강임원",
        dept: "임원",
        status: "반려",
        actedAt: "03-13 15:10",
        opinion: "근거 자료 보완 후 재상신",
      },
    ],
  },
  "5": {
    headerBadge: { label: "참조", color: "info" },
    documentNo: "AD-2025-0301",
    title: "신규 입점 업체 평가 결과",
    docType: "평가",
    drafter: "정영업",
    department: "영업2팀",
    draftAt: "2025-03-14 11:30",
    bodySummary: ["평가 점수표·현장실사 사진 첨부"],
    lines: [
      {
        order: 0,
        role: "기안",
        name: "정영업",
        dept: "영업2팀",
        status: "기안",
        actedAt: "03-14 11:30",
        opinion: "참조",
      },
      {
        order: 1,
        role: "참조",
        name: "김참조",
        dept: "MD팀",
        status: "참조",
        actedAt: "03-14 14:00",
        opinion: "확인",
      },
    ],
  },
};

const DEFAULT_MOCK = APPROVAL_MOCK_BY_ID["1"]!;

function stepRingClass(status: LineStep["status"]) {
  switch (status) {
    case "승인":
    case "기안":
      return "border-emerald-500 bg-emerald-50 text-emerald-800 dark:border-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-200";
    case "참조":
      return "border-sky-500 bg-sky-50 text-sky-900 dark:border-sky-500 dark:bg-sky-500/15 dark:text-sky-100";
    case "대기":
      return "border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-500 dark:bg-amber-500/15 dark:text-amber-100";
    case "반려":
      return "border-red-500 bg-red-50 text-red-800 dark:border-red-600 dark:bg-red-500/15 dark:text-red-200";
    default:
      return "border-gray-200 bg-gray-50 text-gray-500 dark:border-gray-700 dark:bg-white/[0.04] dark:text-gray-400";
  }
}

/** `Button` outline sm 과 동일 계열 — `Link`는 버튼 중첩 불가이므로 클래스만 공유 */
const OUTLINE_SM_CONTROL_CLASS =
  "inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition bg-white text-gray-700 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:ring-gray-700 dark:hover:bg-white/[0.03] dark:hover:text-gray-300";

function connectorClass(left: LineStep["status"], right: LineStep["status"]) {
  const leftDone =
    left === "승인" || left === "기안" || left === "참조";
  const nextActive = right === "대기";
  if (leftDone && (right === "승인" || right === "기안" || right === "참조"))
    return "bg-emerald-400 dark:bg-emerald-600";
  if (right === "반려") return "bg-red-300 dark:bg-red-700";
  if (leftDone && nextActive)
    return "bg-gradient-to-r from-emerald-400 to-amber-400 dark:from-emerald-600 dark:to-amber-600";
  if (leftDone) return "bg-emerald-300/80 dark:bg-emerald-700/80";
  return "bg-gray-200 dark:bg-gray-700";
}

const APPROVAL_LINE_TH =
  "px-3 py-2.5 text-left text-theme-xs font-semibold text-gray-600 dark:text-gray-400 sm:px-4 sm:py-3";
const APPROVAL_LINE_TD =
  "px-3 py-2.5 align-top text-theme-sm text-gray-900 dark:text-gray-100 sm:px-4 sm:py-3";

function ApprovalLinesTable({ lines }: { lines: LineStep[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full min-w-[18rem] table-fixed border-collapse">
        <colgroup>
          <col className="w-14" />
          <col className="w-[22%]" />
          <col className="w-[26%]" />
          <col />
        </colgroup>
        <TableHeader className="border-b border-gray-200 bg-gray-50 dark:border-white/10 dark:bg-gray-900/50">
          <TableRow className="hover:bg-transparent">
            <TableCell isHeader className={`${APPROVAL_LINE_TH} tabular-nums`}>
              순번
            </TableCell>
            <TableCell isHeader className={APPROVAL_LINE_TH}>
              구분
            </TableCell>
            <TableCell isHeader className={APPROVAL_LINE_TH}>
              처리자
            </TableCell>
            <TableCell isHeader className={APPROVAL_LINE_TH}>
              의견
            </TableCell>
          </TableRow>
        </TableHeader>
        <TableBody className="divide-y divide-gray-100 dark:divide-white/10">
          {lines.map((line) => (
            <TableRow
              key={line.order}
              className="hover:bg-gray-50/90 dark:hover:bg-white/[0.04]"
            >
              <TableCell className={`${APPROVAL_LINE_TD} tabular-nums`}>
                {line.order}
              </TableCell>
              <TableCell className={`${APPROVAL_LINE_TD} text-theme-xs`}>
                {line.role}
              </TableCell>
              <TableCell className={`${APPROVAL_LINE_TD} font-medium`}>
                {line.name}
              </TableCell>
              <TableCell
                className={`${APPROVAL_LINE_TD} min-w-0 whitespace-normal break-words text-theme-xs text-gray-600 dark:text-gray-400`}
              >
                {line.opinion}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type ApprovalEmbedMode = "default" | "purchaseOrder";

export interface ApprovalDetailContentProps {
  documentId: string;
  variant: "page" | "modal";
  onClose?: () => void;
  /** 있으면 목업 대신 이 문서 데이터로 렌더 (발주 상신 미리보기 등) */
  documentOverride?: ApprovalDocumentMock | null;
  /** false면 결재 의견 카드 숨김 — 부모(발주 상세)에서 의견 입력 */
  showInternalOpinion?: boolean;
  /** 발주 상신 등 내장 시 안내 문구·힌트 카드 조정 */
  embedMode?: ApprovalEmbedMode;
}

export default function ApprovalDetailContent({
  documentId,
  variant,
  onClose,
  documentOverride = null,
  showInternalOpinion = true,
  embedMode = "default",
}: ApprovalDetailContentProps) {
  const data = useMemo(() => {
    if (documentOverride) return documentOverride;
    if (documentId && APPROVAL_MOCK_BY_ID[documentId])
      return APPROVAL_MOCK_BY_ID[documentId];
    return DEFAULT_MOCK;
  }, [documentId, documentOverride]);

  const [opinion, setOpinion] = useState("");
  const opinionFieldId = `approval-opinion-${documentId}`;
  const isPoEmbed = embedMode === "purchaseOrder";
  const isPoSubmitModal = isPoEmbed && variant === "modal";

  const documentSummaryDl = (
    <dl className="grid gap-4 sm:grid-cols-2 sm:gap-x-8 sm:gap-y-4">
      <div>
        <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
          제목
        </dt>
        <dd className="mt-1 text-theme-sm text-gray-900 dark:text-gray-100">{data.title}</dd>
      </div>
      <div>
        <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">
          문서유형
        </dt>
        <dd className="mt-1 text-theme-sm text-gray-900 dark:text-gray-100">{data.docType}</dd>
      </div>
      <div>
        <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">기안자</dt>
        <dd className="mt-1 text-theme-sm text-gray-900 dark:text-gray-100">
          {data.drafter} · {data.department}
        </dd>
      </div>
      <div>
        <dt className="text-theme-xs font-medium text-gray-500 dark:text-gray-400">기안일시</dt>
        <dd className="mt-1 font-mono text-theme-sm text-gray-700 dark:text-gray-300">
          {data.draftAt}
        </dd>
      </div>
    </dl>
  );

  const backControl =
    variant === "page" ? (
      <Link to="/approval" className={OUTLINE_SM_CONTROL_CLASS}>
        ← 목록
      </Link>
    ) : isPoSubmitModal ? null : (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="!px-3 !py-2"
        onClick={onClose}
      >
        닫기
      </Button>
    );

  const modalHeaderBarClass =
    "shrink-0 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)] sm:px-6";

  const pageStickyBarClass =
    "sticky top-0 z-30 -mx-4 mb-6 border-b border-gray-200 bg-white px-4 py-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-[0_1px_0_0_rgba(255,255,255,0.06)] sm:-mx-6 sm:px-6";

  const headerToolbar = (
    <div
      className={
        isPoSubmitModal
          ? "flex flex-wrap items-center gap-2 gap-y-2"
          : "flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"
      }
    >
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {backControl}
        <Badge size="sm" color={data.headerBadge.color}>
          {data.headerBadge.label}
        </Badge>
        <span className="min-w-0 truncate font-mono text-theme-xs text-gray-500">
          {data.documentNo}
        </span>
      </div>

      {!isPoSubmitModal ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="!py-2.5" disabled>
            인쇄
          </Button>
          <Button variant="outline" size="sm" className="!py-2.5" disabled>
            보류
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="!py-2.5 text-red-600 ring-red-200 hover:bg-red-50 dark:text-red-400 dark:ring-red-900 dark:hover:bg-red-500/10"
            disabled
          >
            반려
          </Button>
          <Button size="sm" className="!py-2.5" disabled>
            결재
          </Button>
        </div>
      ) : null}
    </div>
  );

  const headerSection = (
    <div
      className={variant === "modal" ? modalHeaderBarClass : pageStickyBarClass}
      role="banner"
      aria-label="결재 문서 헤더"
    >
      {headerToolbar}
    </div>
  );

  const scrollableBody = (
    <>
      {!isPoSubmitModal ? (
        <p className="mb-4 text-theme-xs text-gray-500 dark:text-gray-400">
          버튼은 퍼블리싱용으로 비활성화되어 있습니다. 의견 입력 후 결재·반려 API 연동 시 활성화합니다.
        </p>
      ) : null}

      <div
        className={
          isPoSubmitModal
            ? "mb-5 overflow-x-auto rounded-xl border border-gray-200 bg-gray-50/80 px-3 py-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-4 sm:py-5"
            : "mb-6 overflow-x-auto rounded-2xl border border-gray-200 bg-gradient-to-b from-slate-50/80 to-white px-4 py-6 dark:border-gray-800 dark:from-white/[0.03] dark:to-transparent"
        }
      >
        <div className="flex min-w-[32rem] items-center">
          {data.lines.map((step, i) => (
            <Fragment key={step.order}>
              {i > 0 ? (
                <div
                  className={`mx-2 h-1 min-w-[2rem] flex-1 rounded-full ${connectorClass(
                    data.lines[i - 1]!.status,
                    step.status
                  )}`}
                  aria-hidden
                />
              ) : null}
              <div className="flex w-[6.5rem] shrink-0 flex-col items-center text-center sm:w-28">
                <div
                  className={`flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 text-theme-xs font-semibold shadow-sm ${stepRingClass(
                    step.status
                  )}`}
                >
                  <span className="text-[10px] font-normal opacity-80">{step.role}</span>
                  <span className="mt-0.5 text-theme-sm">{step.status}</span>
                </div>
                <p className="mt-2 text-theme-sm font-medium text-gray-900 dark:text-white">
                  {step.name}
                </p>
                {/* <p className="text-theme-xs text-gray-500 dark:text-gray-400">{step.dept}</p> */}
                {/* <p className="mt-1 font-mono text-[11px] text-gray-400">{step.actedAt}</p> */}
              </div>
            </Fragment>
          ))}
        </div>
      </div>

      {isPoEmbed ? (
        <div className="flex flex-col gap-6">
          {showInternalOpinion ? (
            <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12 xl:gap-6">
              <div className="min-w-0 xl:col-span-8">
                <ComponentCard
                  title={isPoSubmitModal ? "요약" : "문서 요약"}
                  contentClassName="!space-y-0"
                >
                  {documentSummaryDl}
                </ComponentCard>
              </div>
              <div className="min-w-0 xl:col-span-4">
                <ComponentCard title="결재 의견" contentClassName="!space-y-0">
                  <Label htmlFor={opinionFieldId}>
                    의견 (연동 시 필수/선택은 정책에 따름)
                  </Label>
                  <TextArea
                    id={opinionFieldId}
                    rows={4}
                    value={opinion}
                    onChange={(v) => setOpinion(v)}
                    placeholder="결재·반려 시 의견을 입력합니다."
                    className="mt-2"
                  />
                </ComponentCard>
              </div>
            </div>
          ) : (
            <ComponentCard
              title={isPoSubmitModal ? "요약" : "문서 요약"}
              contentClassName="!space-y-0"
            >
              {documentSummaryDl}
            </ComponentCard>
          )}

          <ComponentCard title="발주 요약" contentClassName="!space-y-0">
            <ul className="w-full space-y-3 text-theme-sm leading-relaxed text-gray-800 dark:text-gray-200">
              {data.bodySummary.map((line) => (
                <li key={line} className="flex gap-3">
                  <span className="mt-0.5 shrink-0 text-gray-400" aria-hidden>
                    •
                  </span>
                  <span className="min-w-0 flex-1">{line}</span>
                </li>
              ))}
            </ul>
          </ComponentCard>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12 xl:gap-8">
          <div className="space-y-6 xl:col-span-8">
            <ComponentCard title="문서 요약">{documentSummaryDl}</ComponentCard>

            <ComponentCard title="문서 본문 (업무 전용 영역 · 목업)">
              <ul className="space-y-2 rounded-lg border border-dashed border-gray-200 bg-gray-50/50 px-4 py-4 text-theme-sm dark:border-gray-700 dark:bg-white/[0.02]">
                {data.bodySummary.map((line) => (
                  <li key={line} className="flex gap-2 text-gray-800 dark:text-gray-200">
                    <span className="text-gray-400">•</span>
                    {line}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-theme-xs text-gray-500 dark:text-gray-400">
                실제 서비스에서는 발주·경비 등 유형별 폼 컴포넌트가 이 영역에 마운트됩니다.
              </p>
            </ComponentCard>
          </div>

          <div className="space-y-6 xl:col-span-4">
            {showInternalOpinion ? (
              <ComponentCard title="결재 의견">
                <Label htmlFor={opinionFieldId}>
                  의견 (연동 시 필수/선택은 정책에 따름)
                </Label>
                <TextArea
                  id={opinionFieldId}
                  rows={4}
                  value={opinion}
                  onChange={(v) => setOpinion(v)}
                  placeholder="결재·반려 시 의견을 입력합니다."
                  className="mt-1"
                />
              </ComponentCard>
            ) : null}

            <ComponentCard title="결재선 목록" contentClassName="!space-y-0">
              <ApprovalLinesTable lines={data.lines} />
            </ComponentCard>

            <ComponentCard title="다음 단계 (개발)">
              <ol className="list-decimal space-y-2 pl-5 text-theme-sm text-gray-600 dark:text-gray-400">
                <li>
                  본 화면 기준으로 ERD·상태 전이(임시저장 → 상신 → 결재중 → 완료/반려) 정의
                </li>
                <li>결재선 템플릿·직무대리·전결 규칙은 별도 마스터로 분리 검토</li>
                <li>
                  공통 헤더 필드는{" "}
                  <Link
                    to="/approval-document/sample"
                    className="text-brand-600 dark:text-brand-400"
                  >
                    샘플 페이지
                  </Link>
                  와 맞춤
                </li>
              </ol>
            </ComponentCard>
          </div>
        </div>
      )}
    </>
  );

  return (
    <>
      {headerSection}
      {variant === "modal" ? (
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pb-6 sm:px-6">
          {scrollableBody}
        </div>
      ) : (
        scrollableBody
      )}
    </>
  );
}
