import { Link } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import PageNotice from "../components/common/PageNotice";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";

/** 화면용 목업 — 실제 연동 시 `approval_document` API 응답으로 교체 */
const MOCK_COMMON = {
  documentId: "adoc-10042",
  documentNo: "AD-2025-0318",
  title: "○○ 프로젝트 발주 승인 요청",
  documentType: "PURCHASE_ORDER_APPROVAL",
  documentTypeLabel: "발주 승인",
  formCode: "PO-APR-V1",
  version: 2,
  parentDocumentId: "—",
  sourceDocumentId: "PO-88421",

  drafterName: "김기안",
  drafterUserId: "usr-1024",
  departmentName: "구매1팀",
  departmentId: "dept-07",
  positionTitle: "대리",
  draftAt: "2025-03-18 09:12",
  lastModifiedAt: "2025-03-18 14:05",

  documentStatus: "SUBMITTED",
  documentStatusLabel: "상신",
  approvalStatus: "IN_PROGRESS",
  approvalStatusLabel: "결재중",
  currentApprovalOrder: 2,
  currentApproverName: "이결재",
  currentApproverUserId: "usr-2001",
  submittedAt: "2025-03-18 10:00",
  approvedAt: "—",
  rejectedAt: "—",
  canceledAt: "—",
  completedAt: "—",

  approvalLineId: "aln-5001",
  approvalPolicyId: "pol-STD-01",
  isUrgent: false,
  securityLevel: "INTERNAL",
  securityLevelLabel: "대내용",
  referenceUsers: "박참조, 최참조",
  visibilityScope: "부서 단위",
  delegationApplied: false,
  actingApprovalApplied: false,

  attachmentCount: 3,
  hasPrimaryAttachment: true,
  relatedDocumentIds: "DOC-9912, DOC-9910",
  externalRefNo: "EXT-ERP-7788",
  remark: "전자결재 공통 헤더만 구성한 UI 샘플입니다.",

  createdAt: "2025-03-17 16:40",
  updatedAt: "2025-03-18 14:05",
  deleted: false,
  lastStatusChangedAt: "2025-03-18 10:00",
  lastActorName: "시스템",
  lastCommentSummary: "상신 접수",
} as const;

const MOCK_APPROVAL_LINE = [
  { order: 1, name: "박팀장", type: "검토", status: "승인", actedAt: "2025-03-18 11:20", comment: "검토 완료" },
  { order: 2, name: "이결재", type: "결재", status: "대기", actedAt: "—", comment: "—" },
  { order: 3, name: "정임원", type: "전결", status: "예정", actedAt: "—", comment: "—" },
] as const;

const MOCK_ATTACHMENTS = [
  { name: "견적서_최종.pdf", uploadedBy: "김기안", uploadedAt: "2025-03-18 09:30" },
  { name: "내부품의.pdf", uploadedBy: "김기안", uploadedAt: "2025-03-18 09:31" },
  { name: "발주초안.xlsx", uploadedBy: "김기안", uploadedAt: "2025-03-18 09:32" },
] as const;

const MOCK_HISTORY = [
  { at: "2025-03-18 10:00", actor: "김기안", action: "상신", note: "결재 요청" },
  { at: "2025-03-18 11:20", actor: "박팀장", action: "승인", note: "검토 완료" },
] as const;

const th =
  "w-[11%] min-w-[5.5rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
const td = "px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100";

function YesNo(v: boolean) {
  return v ? "예" : "아니오";
}

export default function ApprovalDocumentSample() {
  const m = MOCK_COMMON;

  return (
    <>
      <PageMeta title="결재문서 공통 헤더(샘플)" description="approval_document 공통 메타 UI" />
      <PageBreadcrumb pageTitle="결재문서 공통 헤더 (샘플)" />

      <PageNotice variant="brand" className="mb-4">
        문서별 업무 필드(거래처·품목·금액 등)는 공통 헤더에 넣지 않고, 아래{" "}
        <strong>문서 본문</strong> 영역에만 둔다는 가정의 레이아웃 예시입니다.{" "}
        <Link
          to="/approval"
          className="font-medium underline underline-offset-2 hover:no-underline"
        >
          전자결재 함·상세 퍼블리싱
        </Link>
        과 함께 보면 흐름 파악에 도움이 됩니다.
      </PageNotice>

      <div className="space-y-6">
        <ComponentCard title="1. 문서 식별">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>문서 ID</th>
                  <td className={td}>{m.documentId}</td>
                  <th scope="row" className={th}>문서번호</th>
                  <td className={td}>{m.documentNo}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>제목</th>
                  <td className={td} colSpan={3}>{m.title}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>문서유형</th>
                  <td className={td}>{m.documentTypeLabel}</td>
                  <th scope="row" className={th}>코드</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.documentType}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>문서양식코드</th>
                  <td className={td}>{m.formCode}</td>
                  <th scope="row" className={th}>버전</th>
                  <td className={td}>{m.version}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>상위문서 ID</th>
                  <td className={td}>{m.parentDocumentId}</td>
                  <th scope="row" className={th}>원본문서 ID</th>
                  <td className={td}>{m.sourceDocumentId}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard title="2. 작성자 · 소속">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>작성자</th>
                  <td className={td}>{m.drafterName}</td>
                  <th scope="row" className={th}>작성자 ID</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.drafterUserId}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>작성부서</th>
                  <td className={td}>{m.departmentName}</td>
                  <th scope="row" className={th}>부서 ID</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.departmentId}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>직위·직책</th>
                  <td className={td}>{m.positionTitle}</td>
                  <th scope="row" className={th}>기안일시</th>
                  <td className={td}>{m.draftAt}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>최종수정일시</th>
                  <td className={td} colSpan={3}>{m.lastModifiedAt}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard title="3. 상태">
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge size="sm" color="warning">{m.documentStatusLabel}</Badge>
            <Badge size="sm" color="primary">{m.approvalStatusLabel}</Badge>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>문서상태</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.documentStatus}</td>
                  <th scope="row" className={th}>결재상태</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.approvalStatus}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>현재 결재순번</th>
                  <td className={td}>{m.currentApprovalOrder}</td>
                  <th scope="row" className={th}>현재 결재자</th>
                  <td className={td}>{m.currentApproverName} ({m.currentApproverUserId})</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>상신일시</th>
                  <td className={td}>{m.submittedAt}</td>
                  <th scope="row" className={th}>최종결재일시</th>
                  <td className={td}>{m.approvedAt}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>반려일시</th>
                  <td className={td}>{m.rejectedAt}</td>
                  <th scope="row" className={th}>취소일시</th>
                  <td className={td}>{m.canceledAt}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>완료일시</th>
                  <td className={td} colSpan={3}>{m.completedAt}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard title="4. 결재 공통">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>결재선 ID</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.approvalLineId}</td>
                  <th scope="row" className={th}>결재정책 ID</th>
                  <td className={`${td} font-mono text-theme-xs`}>{m.approvalPolicyId}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>긴급</th>
                  <td className={td}>{YesNo(m.isUrgent)}</td>
                  <th scope="row" className={th}>보안등급</th>
                  <td className={td}>{m.securityLevelLabel} ({m.securityLevel})</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>참조자</th>
                  <td className={td} colSpan={3}>{m.referenceUsers}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>열람 범위</th>
                  <td className={td}>{m.visibilityScope}</td>
                  <th scope="row" className={th}>위임 / 대결</th>
                  <td className={td}>
                    위임 {YesNo(m.delegationApplied)} · 대결 {YesNo(m.actingApprovalApplied)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard title="5. 첨부 · 연관">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>첨부 개수</th>
                  <td className={td}>{m.attachmentCount}</td>
                  <th scope="row" className={th}>대표 첨부</th>
                  <td className={td}>{YesNo(m.hasPrimaryAttachment)}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>관련문서 ID</th>
                  <td className={td} colSpan={3}>{m.relatedDocumentIds}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>외부참조번호</th>
                  <td className={td} colSpan={3}>{m.externalRefNo}</td>
                </tr>
                <tr>
                  <th scope="row" className={`${th} align-top`}>비고</th>
                  <td className={td} colSpan={3}>
                    <span className="whitespace-pre-wrap">{m.remark}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <ComponentCard title="6. 감사 · 이력 요약">
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={th}>생성일시</th>
                  <td className={td}>{m.createdAt}</td>
                  <th scope="row" className={th}>수정일시</th>
                  <td className={td}>{m.updatedAt}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>삭제 여부</th>
                  <td className={td}>{YesNo(m.deleted)}</td>
                  <th scope="row" className={th}>마지막 상태변경</th>
                  <td className={td}>{m.lastStatusChangedAt}</td>
                </tr>
                <tr>
                  <th scope="row" className={th}>마지막 처리자</th>
                  <td className={td}>{m.lastActorName}</td>
                  <th scope="row" className={th}>마지막 의견 요약</th>
                  <td className={td}>{m.lastCommentSummary}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </ComponentCard>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <ComponentCard title="문서 본문 (문서유형별 전용)">
              <div className="rounded-lg border border-dashed border-gray-300 bg-gray-50/80 px-4 py-16 text-center text-theme-sm text-gray-500 dark:border-gray-600 dark:bg-white/[0.03] dark:text-gray-400">
                여기에는 발주·견적·휴가 등 <strong className="text-gray-700 dark:text-gray-200">업무 전용 필드</strong>만 배치합니다.
                <p className="mt-2 text-theme-xs">
                  공통 헤더와 UI 패널(결재선·첨부·이력)은 재사용하고, 본문만 라우트/컴포넌트를 갈아끼우는 형태가 됩니다.
                </p>
              </div>
            </ComponentCard>
          </div>

          <div className="space-y-6 lg:col-span-4">
            <ComponentCard title="결재선">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="border-b border-gray-100 dark:border-white/5">
                    <TableRow className="hover:bg-transparent">
                      <TableCell isHeader className="text-theme-xs">순번</TableCell>
                      <TableCell isHeader className="text-theme-xs">결재자</TableCell>
                      <TableCell isHeader className="text-theme-xs">유형</TableCell>
                      <TableCell isHeader className="text-theme-xs">상태</TableCell>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                    {MOCK_APPROVAL_LINE.map((row) => (
                      <TableRow key={row.order}>
                        <TableCell className="tabular-nums text-theme-sm">{row.order}</TableCell>
                        <TableCell className="text-theme-sm">{row.name}</TableCell>
                        <TableCell className="text-theme-xs text-gray-600 dark:text-gray-400">{row.type}</TableCell>
                        <TableCell className="text-theme-sm">{row.status}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </ComponentCard>

            <ComponentCard title="첨부파일">
              <ul className="space-y-2 text-theme-sm">
                {MOCK_ATTACHMENTS.map((f) => (
                  <li
                    key={f.name}
                    className="flex flex-col gap-0.5 rounded-md border border-gray-100 px-3 py-2 dark:border-white/10"
                  >
                    <span className="font-medium text-gray-900 dark:text-white">{f.name}</span>
                    <span className="text-theme-xs text-gray-500">
                      {f.uploadedBy} · {f.uploadedAt}
                    </span>
                  </li>
                ))}
              </ul>
            </ComponentCard>

            <ComponentCard title="결재 이력">
              <ul className="space-y-3 text-theme-sm">
                {MOCK_HISTORY.map((h) => (
                  <li
                    key={`${h.at}-${h.action}`}
                    className="border-l-2 border-brand-400 pl-3 dark:border-brand-500"
                  >
                    <div className="text-theme-xs text-gray-500">{h.at}</div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {h.actor} — {h.action}
                    </div>
                    <div className="text-theme-xs text-gray-600 dark:text-gray-400">{h.note}</div>
                  </li>
                ))}
              </ul>
            </ComponentCard>
          </div>
        </div>
      </div>
    </>
  );
}
