import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageNotice from "../components/common/PageNotice";
import SegmentedControl from "../components/common/SegmentedControl";
import ApprovalDetailContent from "../components/approval/ApprovalDetailContent";
import { DataListSearchInput } from "../components/list";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import { Modal } from "../components/ui/modal";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";

type InboxTab = "pending" | "completed" | "reference" | "draft";

type MockRow = {
  id: string;
  documentNo: string;
  title: string;
  docType: string;
  drafter: string;
  department: string;
  draftDate: string;
  approvalStatus: string;
  urgent: boolean;
  tab: InboxTab;
};

const MOCK_ROWS: MockRow[] = [
  {
    id: "1",
    documentNo: "AD-2025-0318",
    title: "○○ 프로젝트 발주 승인 요청",
    docType: "발주",
    drafter: "김기안",
    department: "구매1팀",
    draftDate: "2025-03-18",
    approvalStatus: "결재중",
    urgent: false,
    tab: "pending",
  },
  {
    id: "2",
    documentNo: "AD-2025-0312",
    title: "IT 장비 추가 구매 품의",
    docType: "구매",
    drafter: "이요청",
    department: "정보전략팀",
    draftDate: "2025-03-15",
    approvalStatus: "결재중",
    urgent: true,
    tab: "pending",
  },
  {
    id: "3",
    documentNo: "AD-2025-0288",
    title: "협력사 계약 갱신 검토",
    docType: "계약",
    drafter: "박법무",
    department: "법무팀",
    draftDate: "2025-03-10",
    approvalStatus: "완료",
    urgent: false,
    tab: "completed",
  },
  {
    id: "4",
    documentNo: "AD-2025-0291",
    title: "분기 예산 집행 내역 보고",
    docType: "보고",
    drafter: "최기획",
    department: "기획팀",
    draftDate: "2025-03-12",
    approvalStatus: "반려",
    urgent: false,
    tab: "completed",
  },
  {
    id: "5",
    documentNo: "AD-2025-0301",
    title: "신규 입점 업체 평가 결과",
    docType: "평가",
    drafter: "정영업",
    department: "영업2팀",
    draftDate: "2025-03-14",
    approvalStatus: "결재중",
    urgent: false,
    tab: "reference",
  },
  {
    id: "6",
    documentNo: "—",
    title: "(작성 중) 출장비 정산 초안",
    docType: "경비",
    drafter: "나작성",
    department: "총무팀",
    draftDate: "2025-03-19",
    approvalStatus: "임시저장",
    urgent: false,
    tab: "draft",
  },
];

const TAB_LABELS: Record<InboxTab, string> = {
  pending: "미결함",
  completed: "기결함",
  reference: "참조함",
  draft: "임시저장",
};

const INBOX_SEGMENT_OPTIONS = (Object.keys(TAB_LABELS) as InboxTab[]).map(
  (key) => ({
    value: key,
    label: TAB_LABELS[key],
  })
);

function statusBadgeColor(
  status: string
): "warning" | "success" | "error" | "primary" {
  if (status.includes("결재중") || status.includes("임시")) return "warning";
  if (status.includes("완료") || status.includes("승인")) return "success";
  if (status.includes("반려")) return "error";
  return "primary";
}

export default function ApprovalList() {
  const [tab, setTab] = useState<InboxTab>("pending");
  const [keyword, setKeyword] = useState("");
  const [modalDocumentId, setModalDocumentId] = useState<string | null>(null);

  const closeDetailModal = useCallback(() => setModalDocumentId(null), []);

  const rows = useMemo(() => {
    const k = keyword.trim().toLowerCase();
    return MOCK_ROWS.filter((r) => {
      if (r.tab !== tab) return false;
      if (!k) return true;
      return (
        r.title.toLowerCase().includes(k) ||
        r.documentNo.toLowerCase().includes(k) ||
        r.drafter.toLowerCase().includes(k)
      );
    });
  }, [tab, keyword]);

  return (
    <>
      <PageMeta title="전자결재" description="미결·기결·참조·임시저장 함 (퍼블리싱)" />
      <PageBreadcrumb pageTitle="전자결재" />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageNotice variant="brand" className="flex-1">
          <span className="text-gray-700 dark:text-gray-200">
            UI 퍼블리싱 단계입니다. 행을 선택하면 결재 상세가{" "}
            <strong className="font-medium">모달</strong>로 열립니다. (직접 URL은{" "}
            <code className="rounded bg-white/80 px-1 dark:bg-black/20">/approval/문서ID</code> 유지)
          </span>
        </PageNotice>
        <Link
          to="/approval-document/sample"
          className="shrink-0 text-theme-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          결재문서 공통 메타 샘플 →
        </Link>
      </div>

      <ComponentCard
        title="결재 문서함"
        desc="더존 IAM 등에서 흔히 보는 함 구분을 참고한 탭·목록 레이아웃입니다."
        headerEnd={
          <Button variant="outline" size="sm" className="!py-2" disabled>
            새 기안 (연동 예정)
          </Button>
        }
      >
        <div>
          <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            문서함
          </p>
          <SegmentedControl<InboxTab>
            ariaLabel="결재 문서함"
            value={tab}
            onChange={setTab}
            options={INBOX_SEGMENT_OPTIONS}
            equalWidth
            className="w-full sm:max-w-2xl"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-1">
            <DataListSearchInput
              id="approval-search"
              value={keyword}
              onChange={setKeyword}
              placeholder="제목·문서번호·기안자"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/5">
              <TableRow className="hover:bg-transparent">
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  긴급
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  문서번호
                </TableCell>
                <TableCell isHeader className="text-theme-xs min-w-[12rem]">
                  제목
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  유형
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  기안자
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  부서
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  기안일
                </TableCell>
                <TableCell isHeader className="text-theme-xs whitespace-nowrap">
                  결재상태
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-12 text-center text-theme-sm text-gray-500">
                    표시할 문서가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((row) => {
                  const openRow =
                    row.tab !== "draft"
                      ? () => setModalDocumentId(row.id)
                      : undefined;
                  return (
                  <TableRow
                    key={row.id}
                    onClick={openRow}
                    className={
                      openRow
                        ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-white/[0.04]"
                        : undefined
                    }
                  >
                    <TableCell className="text-theme-sm">
                      {row.urgent ? (
                        <Badge size="sm" color="error">
                          긴급
                        </Badge>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-theme-xs whitespace-nowrap">
                      {row.tab === "draft" ? (
                        row.documentNo
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalDocumentId(row.id);
                          }}
                          className="text-left text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {row.documentNo}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-theme-sm text-gray-900 dark:text-gray-100">
                      {row.tab === "draft" ? (
                        row.title
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setModalDocumentId(row.id);
                          }}
                          className="w-full text-left hover:text-brand-600 dark:hover:text-brand-400"
                        >
                          {row.title}
                        </button>
                      )}
                    </TableCell>
                    <TableCell className="text-theme-xs text-gray-600 dark:text-gray-400">
                      {row.docType}
                    </TableCell>
                    <TableCell className="text-theme-sm">{row.drafter}</TableCell>
                    <TableCell className="text-theme-xs text-gray-600 dark:text-gray-400">
                      {row.department}
                    </TableCell>
                    <TableCell className="tabular-nums text-theme-xs text-gray-600 dark:text-gray-400">
                      {row.draftDate}
                    </TableCell>
                    <TableCell>
                      <Badge size="sm" color={statusBadgeColor(row.approvalStatus)}>
                        {row.approvalStatus}
                      </Badge>
                    </TableCell>
                  </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </ComponentCard>

      <Modal
        isOpen={modalDocumentId != null}
        onClose={closeDetailModal}
        className="flex max-h-[92vh] w-[calc(100%-1.5rem)] max-w-6xl flex-col overflow-hidden shadow-theme-lg sm:m-4"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-12 sm:pt-14">
          {modalDocumentId != null ? (
            <ApprovalDetailContent
              documentId={modalDocumentId}
              variant="modal"
              onClose={closeDetailModal}
            />
          ) : null}
        </div>
      </Modal>
    </>
  );
}
