import type { ReactNode } from "react";
import { Link } from "react-router";
import ComponentCard from "../../../components/common/ComponentCard";
import { buttonClassName } from "../../../lib/ui/buttonStyles";
import { formatCurrency } from "../../../lib/format/formatCurrency";
import { fileTypeIconSrc } from "../../../lib/ui/fileTypeIcon";
import { formatDateYmd } from "../../../lib/format/dateFormat";
import {
  dueDateDdayBadgeClassName,
  getDueDateRelative,
} from "../../../lib/format/dueDateDisplay";
import { buildApiFileUrl, downloadFileWithAuth } from "../../../lib/fileDownload";
import { API_BASE } from "../../../api/apiBase";
import { notify } from "../../../lib/notify";
import { ReactComponent as ArrowDownTrayIcon } from "../../../icons/arrow-down-tray.svg?react";
import {
  ListIcon,
  PencilIcon,
  PlusIcon,
  CalenderIcon,
  DollarLineIcon,
  CogIcon,
} from "../../../icons";
import type {
  PurchaseOrderDetail,
  PurchaseOrderFile,
} from "../../../api/purchaseOrder";

function OrderDetailInfoRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-start border-b border-gray-100 py-3 last:border-b-0 dark:border-white/[0.05]">
      <dt className="w-28 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400 sm:w-32">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-800 dark:text-white/90">
        {value}
      </dd>
    </div>
  );
}

function OrderDetailTextAreaRow({
  label,
  text,
}: {
  label: string;
  text: string | null | undefined;
}) {
  const trimmed = text?.trim() ?? "";
  return (
    <div className="border-b border-gray-100 py-3 last:border-b-0 dark:border-white/[0.05]">
      <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      <div
        className="mt-2 min-h-[5.5rem] w-full rounded-lg border border-gray-300 bg-gray-50 p-3.5 text-sm text-gray-800 shadow-theme-xs dark:border-gray-600 dark:bg-gray-900 dark:text-white/90"
        role="textbox"
        aria-readonly="true"
        aria-label={label}
      >
        {trimmed ? (
          <p className="whitespace-pre-wrap">{trimmed}</p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">—</p>
        )}
      </div>
    </div>
  );
}

function OrderSummaryMetric({
  icon,
  label,
  children,
  badge,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 p-4 sm:px-5 sm:py-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-600 dark:bg-white/[0.08] dark:text-gray-300 sm:size-12">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        {badge ? (
          <div className="mt-0.5 flex flex-wrap items-end gap-2">
            <span className="text-sm font-semibold tabular-nums leading-snug text-gray-900 dark:text-white">
              {children}
            </span>
            {badge}
          </div>
        ) : (
          <div className="mt-0.5 text-sm font-semibold leading-snug text-gray-900 dark:text-white">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

type OrderDetailHeaderSectionProps = {
  orderId: string;
  po: PurchaseOrderDetail;
  partnerNameWithFlag: ReactNode;
  files: PurchaseOrderFile[];
  accessToken: string;
  canShowReceiveButton: boolean;
  canEditOrder: boolean;
  canRegisterDelivery: boolean;
  orderTotalQty: number;
  orderRegisteredQty: number;
  planCount: number;
  onReceiveClick: () => void;
  onOpenPlanModal: () => void;
};

export function OrderDetailHeaderSection({
  orderId,
  po,
  partnerNameWithFlag,
  files,
  accessToken,
  canShowReceiveButton,
  canEditOrder,
  canRegisterDelivery,
  orderTotalQty,
  orderRegisteredQty,
  planCount,
  onReceiveClick,
  onOpenPlanModal,
}: OrderDetailHeaderSectionProps) {
  const headerCurrency = po.currencyCode ?? "KRW";
  const supplyAmountValue =
    po.supplyAmount != null && Number.isFinite(Number(po.supplyAmount))
      ? Number(po.supplyAmount)
      : null;
  const subtotalForVat =
    supplyAmountValue ??
    (po.totalAmount != null && Number.isFinite(Number(po.totalAmount))
      ? Number(po.totalAmount)
      : null);
  const totalAmountWithVat =
    subtotalForVat != null ? subtotalForVat * 1.1 : null;
  const deliveryOverviewText =
    orderTotalQty > 0
      ? `${orderRegisteredQty} / ${orderTotalQty} EA`
      : planCount === 0
        ? "생산 등록 없음"
        : `생산계획 ${planCount}건`;
  const dueDateDday = getDueDateRelative(po.dueDate);
  const totalAmountMainDisplay =
    totalAmountWithVat != null
      ? formatCurrency(totalAmountWithVat, headerCurrency)
      : "—";

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-4 py-4 dark:border-gray-800 sm:px-6 sm:py-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl">
              {po.title?.trim() || po.orderNo}
            </h1>
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {partnerNameWithFlag}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Link
              to="/order"
              className={buttonClassName({ actionRole: "navigate", size: "compact" })}
            >
              <ListIcon className="size-4 shrink-0" aria-hidden />
              목록
            </Link>
            {canShowReceiveButton ? (
              <button
                type="button"
                onClick={onReceiveClick}
                className={buttonClassName({ actionRole: "positive", size: "compact" })}
              >
                접수
              </button>
            ) : null}
            {canEditOrder ? (
              <Link
                to={`/order/${orderId}/edit`}
                className={buttonClassName({ actionRole: "edit", size: "compact" })}
              >
                <PencilIcon className="size-4 shrink-0" aria-hidden />
                발주 수정
              </Link>
            ) : null}
            <button
              type="button"
              disabled={!canRegisterDelivery}
              title={
                canRegisterDelivery
                  ? undefined
                  : "발주가 종결(PO_CLOSED)된 뒤에만 등록할 수 있습니다."
              }
              onClick={onOpenPlanModal}
              className={buttonClassName({
                actionRole: "primary",
                size: "compact",
                disabled: !canRegisterDelivery,
              })}
            >
              <PlusIcon className="size-4 shrink-0" aria-hidden />
              생산계획 등록
            </button>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 xl:grid-cols-4 xl:divide-x xl:divide-gray-100 dark:xl:divide-white/[0.06]">
          <OrderSummaryMetric
            icon={<CalenderIcon className="size-6" aria-hidden />}
            label="발주일"
          >
            {formatDateYmd(po.orderDate, { emptyFallback: "—" })}
          </OrderSummaryMetric>
          <OrderSummaryMetric
            icon={<CalenderIcon className="size-6" aria-hidden />}
            label="고객 요청 납기"
            badge={
              dueDateDday ? (
                <span
                  className={dueDateDdayBadgeClassName(dueDateDday.diff)}
                  title={dueDateDday.koLabel}
                >
                  {dueDateDday.ddayLabel}
                </span>
              ) : null
            }
          >
            {formatDateYmd(po.dueDate, { emptyFallback: "—" })}
          </OrderSummaryMetric>
          <OrderSummaryMetric
            icon={<DollarLineIcon className="size-6" aria-hidden />}
            label="합계금액"
          >
            <span className="tabular-nums">{totalAmountMainDisplay}</span>
            {totalAmountWithVat != null ? (
              <p className="mt-0.5 text-xs font-normal text-gray-500 dark:text-gray-400">
                부가세 포함
              </p>
            ) : null}
          </OrderSummaryMetric>
          <OrderSummaryMetric
            icon={<CogIcon className="size-6" aria-hidden />}
            label="생산 진행"
          >
            {deliveryOverviewText}
          </OrderSummaryMetric>
        </div>
      </div>

      <ComponentCard
        title="발주 정보"
        desc="발주 요약 정보입니다."
        collapsible={false}
        className="[&>div:first-child]:px-4 [&>div:first-child]:py-3.5"
        bodyClassName="!p-3 sm:!p-4"
        contentClassName="!space-y-3"
      >
        {!canRegisterDelivery ? (
          <p className="mb-2 text-theme-xs text-amber-700 dark:text-amber-400/90">
            발주가 종결된 뒤에만 생산 계획을 등록할 수 있습니다.
          </p>
        ) : null}
        <div className="grid gap-x-8 md:grid-cols-2">
          <div>
            <OrderDetailInfoRow label="고객사" value={partnerNameWithFlag} />
            <OrderDetailInfoRow
              label="발주일"
              value={formatDateYmd(po.orderDate, { emptyFallback: "—" })}
            />
            <OrderDetailInfoRow
              label="고객 발주번호"
              value={po.vendorOrderNo?.trim() || "—"}
            />
            <OrderDetailInfoRow
              label="담당자"
              value={
                po.requesterName?.trim() ||
                po.createdBy?.name?.trim() ||
                "—"
              }
            />
            <OrderDetailInfoRow
              label="첨부파일"
              value={
                files.length === 0 ? (
                  <span className="text-gray-500">첨부파일이 없습니다.</span>
                ) : (
                  <ul className="space-y-2">
                    {files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2">
                        <img
                          src={fileTypeIconSrc(String(f.fileName ?? ""))}
                          alt=""
                          className="h-5 w-5 shrink-0"
                          decoding="async"
                        />
                        <span className="min-w-0 flex-1 truncate">
                          {f.fileName}
                        </span>
                        <button
                          type="button"
                          onClick={async () => {
                            try {
                              await downloadFileWithAuth({
                                fileUrl: buildApiFileUrl(
                                  f.filePath ?? "",
                                  API_BASE
                                ),
                                fileName: f.fileName ?? "attachment",
                                accessToken,
                              });
                            } catch (error) {
                              const message =
                                error instanceof Error
                                  ? error.message
                                  : "첨부파일 다운로드에 실패했습니다.";
                              notify.error(message);
                            }
                          }}
                          title="첨부파일 다운로드"
                          aria-label="첨부파일 다운로드"
                          className="inline-flex size-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:hover:bg-brand-500/10 dark:hover:text-brand-400"
                        >
                          <ArrowDownTrayIcon className="size-4" aria-hidden />
                        </button>
                      </li>
                    ))}
                  </ul>
                )
              }
            />
          </div>
          <div>
            <OrderDetailInfoRow
              label="제목"
              value={po.title?.trim() || "—"}
            />
            <OrderDetailInfoRow
              label="고객 요청 납기"
              value={formatDateYmd(po.dueDate, { emptyFallback: "—" })}
            />
          </div>
        </div>
        <OrderDetailTextAreaRow label="요청사항" text={po.vendorRequest} />
        <OrderDetailTextAreaRow label="특이사항" text={po.specialNote} />
      </ComponentCard>
    </>
  );
}
