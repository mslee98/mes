import { useMemo } from "react";
import { useParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ApprovalDetailContent, {
  APPROVAL_MOCK_BY_ID,
} from "../components/approval/ApprovalDetailContent";

export default function ApprovalDetailPublish() {
  const { documentId } = useParams();
  const resolvedId = useMemo(
    () =>
      documentId && APPROVAL_MOCK_BY_ID[documentId] ? documentId : "1",
    [documentId]
  );
  const docNo = APPROVAL_MOCK_BY_ID[resolvedId]?.documentNo ?? "";

  return (
    <>
      <PageMeta
        title={docNo ? `결재 문서 ${docNo}` : "결재 문서"}
        description="전자결재 상세 (퍼블리싱)"
      />
      <PageBreadcrumb pageTitle="결재 상세" />

      <ApprovalDetailContent documentId={resolvedId} variant="page" />
    </>
  );
}
