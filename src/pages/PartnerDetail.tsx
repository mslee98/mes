import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingLottie from "../components/common/LoadingLottie";
import ActiveStatusBadge from "../components/common/ActiveStatusBadge";
import { ReactComponent as PageIcon } from "../icons/page.svg?react";
import { useAuth } from "../hooks/useAuth";
import {
  deletePartner,
  getPartner,
  type Partner,
} from "../api/purchaseOrder";
import {
  type CommonCodeItem,
  labelForCommonCode,
} from "../api/commonCode";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { partnerCountryFlagUrl } from "../domains/partner/helpers/partnerCountryOptions";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center border-b border-gray-100 py-3 dark:border-white/[0.05]">
      <dt className="w-32 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

function renderPartnerCountryValue(
  partner: Partner,
  countryCodes: CommonCodeItem[]
): React.ReactNode {
  const countryCode = String(partner.countryCode ?? "").trim().toUpperCase();
  const label = labelForCommonCode(countryCodes, partner.countryCode);
  const flagUrl = countryCode ? partnerCountryFlagUrl(countryCode) : undefined;
  return (
    <div className="flex items-center gap-2">
      {flagUrl ? (
        <img
          src={flagUrl}
          alt=""
          className="h-5 w-[1.375rem] shrink-0 rounded-sm object-cover"
          decoding="async"
        />
      ) : (
        <span
          className="inline-flex h-5 w-[1.375rem] shrink-0 items-center justify-center rounded-sm bg-gray-100 text-[10px] font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400"
          aria-hidden
        >
          ···
        </span>
      )}
      <span>{label}</span>
    </div>
  );
}

function PartnerEmailCopyValue({ email }: { email: string }): React.ReactNode {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1500);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const handleCopy = async () => {
    const text = email.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  if (!email.trim()) {
    return "—";
  }

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-0 truncate">{email}</span>
      <button
        type="button"
        onClick={() => {
          void handleCopy();
        }}
        className="inline-flex shrink-0 cursor-pointer items-center gap-1 border-l border-gray-200 py-1.5 pr-0 pl-2.5 text-sm font-medium text-gray-700 dark:border-gray-800 dark:text-gray-400"
      >
        <PageIcon className="h-5 w-5 fill-current" />
        <span>{copied ? "복사됨" : "복사"}</span>
      </button>
    </div>
  );
}

export default function PartnerDetail() {
  const { partnerId } = useParams();
  const id = String(partnerId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const deleteMutation = useMutation({
    mutationFn: () => deletePartner(id, accessToken as string),
    onSuccess: () => {
      notify.success("거래처가 삭제되었습니다.");
      void queryClient.invalidateQueries({ queryKey: ["partners"] });
      void queryClient.removeQueries({ queryKey: ["partner", id] });
      setDeleteOpen(false);
      navigate("/partners");
    },
    onError: (e: unknown) => {
      const message =
        e instanceof Error ? e.message : "거래처를 삭제하지 못했습니다.";
      notify.error(message);
    },
  });

  const {
    data: partner,
    isLoading: isPartnerLoading,
    error,
  } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => getPartner(id, accessToken as string),
    enabled: !!accessToken && !isAuthLoading && id !== "",
  });
  const {
    countryCodes,
    partnerTypeCodes,
    supplierSegmentCodes,
  } = usePartnerCommonCodes(accessToken, !!accessToken && !isAuthLoading);

  const pageTitle = useMemo(() => {
    if (!partner) return "업체 상세";
    return `업체: ${partner.name || partner.code || partner.id}`;
  }, [partner]);

  if (!id) {
    return (
      <>
        <PageMeta title="업체 상세" description="거래처 정보" />
        <PageBreadcrumb pageTitle="업체 상세" />
        <p className="text-sm text-gray-500">잘못된 업체 ID입니다.</p>
      </>
    );
  }

  if (isAuthLoading || isPartnerLoading) {
    return (
      <>
        <PageMeta title="업체 상세" description="거래처 정보" />
        <PageBreadcrumb pageTitle="업체 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="업체 정보를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (error || !partner) {
    return (
      <>
        <PageMeta title="업체 상세" description="거래처 정보" />
        <PageBreadcrumb pageTitle="업체 상세" />
        <p className="text-sm text-red-600">
          {error instanceof Error
            ? error.message
            : "업체 정보를 불러오지 못했습니다."}
        </p>
      </>
    );
  }

  const p = partner as Partner;
  const supplierSegmentRaw = p.supplierSegment ?? null;
  const isSupplier =
    String(p.type ?? "").trim().toUpperCase() === "SUPPLIER";
  const coreClassification = isSupplier
    ? `${labelForCommonCode(partnerTypeCodes, p.type)} / ${labelForCommonCode(
        supplierSegmentCodes,
        supplierSegmentRaw
      )}`
    : `${labelForCommonCode(partnerTypeCodes, p.type)} / -`;
  const phoneDisplay =
    [p.contactPhone, p.contact].find(
      (v) => typeof v === "string" && v.trim() !== ""
    )?.trim() ?? "";

  return (
    <>
      <PageMeta title={pageTitle} description="거래처 정보" />
      <PageBreadcrumb pageTitle="업체 상세" />
      <ComponentCard
        title="업체 기본 정보"
        desc="발주/렌즈에서 참조하는 거래처 마스터 정보입니다."
      >
        <dl className="min-w-0 flex-1">
          <DetailRow label="ID" value={p.id} />
          <DetailRow label="코드" value={p.code || "-"} />
          <DetailRow label="업체명" value={p.name || "-"} />
          <DetailRow
            label="국가"
            value={renderPartnerCountryValue(p, countryCodes)}
          />
          <DetailRow label="업체 분류" value={coreClassification} />
          <DetailRow
            label="사업자등록번호"
            value={p.businessRegistrationNo?.trim() || "—"}
          />
          <DetailRow
            label="담당자명"
            value={p.contactPerson?.trim() || "—"}
          />
          <DetailRow
            label="담당자 연락처"
            value={phoneDisplay || "—"}
          />
          <DetailRow
            label="담당자 이메일"
            value={<PartnerEmailCopyValue email={p.contactEmail?.trim() || ""} />}
          />
          <DetailRow label="주소" value={p.address?.trim() || "—"} />
          <DetailRow label="메모" value={p.memo?.trim() || "—"} />
          <DetailRow
            label="상태"
            value={
              <ActiveStatusBadge active={p.isActive} />
            }
          />
          {p.createdAt ? (
            <DetailRow label="등록일시" value={p.createdAt} />
          ) : null}
          {p.updatedAt ? (
            <DetailRow label="수정일시" value={p.updatedAt} />
          ) : null}
        </dl>
        <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
          <Link
            to={`/partners/${id}/edit`}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            업체 수정
          </Link>
          <Link
            to="/partners"
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            목록으로
          </Link>
          <button
            type="button"
            onClick={() => setDeleteOpen(true)}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-900/40 dark:bg-gray-900 dark:text-red-400 dark:hover:bg-red-950/30"
          >
            삭제
          </button>
        </div>
      </ComponentCard>

      <ConfirmModal
        isOpen={deleteOpen}
        title="거래처 삭제"
        message={`「${p.name || p.code || id}」을(를) 삭제하면 복구할 수 없습니다. 연결된 파일도 서버에서 정리됩니다. 계속할까요?`}
        confirmText="삭제"
        confirmVariant="danger"
        illustration="trash"
        isConfirming={deleteMutation.isPending}
        onClose={() => {
          if (!deleteMutation.isPending) setDeleteOpen(false);
        }}
        onConfirm={() => deleteMutation.mutate()}
      />
    </>
  );
}
