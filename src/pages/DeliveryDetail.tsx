import { useMemo } from "react";
import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import { getDeliveryById, type Delivery } from "../api/purchaseOrder";
import { DeliverySummaryStepper } from "../components/delivery/DeliverySummaryStepper";
import {
  buildDeliveryStepperDetailsFromCodes,
  computeDeliveryStatusCompletedCount,
} from "../components/delivery/deliveryStepperUtils";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_DELIVERY_STATUS,
  type CommonCodeItem,
} from "../api/commonCode";

function formatDateYmd(s: string | null | undefined): string {
  const raw = String(s ?? "").trim();
  if (!raw) return "-";
  const head = raw.match(/^(\d{4}-\d{2}-\d{2})/);
  if (head) return head[1];
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return raw;
}

function formatDate(s: string | null | undefined): string {
  return formatDateYmd(s);
}

function deliveryLines(d: Delivery) {
  return d.deliveryItems ?? d.items ?? [];
}

function getBadgeColor(statusName: string): "success" | "warning" | "error" | "primary" {
  const t = statusName?.toLowerCase() ?? "";
  if (t.includes("등록")) return "primary";
  if (t.includes("완료") || t.includes("확정")) return "success";
  if (t.includes("대기") || t.includes("진행")) return "warning";
  if (t.includes("반려") || t.includes("취소")) return "error";
  return "primary";
}

export default function DeliveryDetail() {
  const { deliveryId } = useParams();
  const id = Number(deliveryId);
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const idOk = Number.isFinite(id) && id > 0;

  const {
    data: delivery,
    isLoading: deliveryLoading,
    error: deliveryError,
    isError: isDeliveryError,
  } = useQuery({
    queryKey: ["delivery", id],
    queryFn: () => getDeliveryById(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && idOk,
  });

  const purchaseOrderId = useMemo(() => {
    if (!delivery) return undefined;
    const a = delivery.purchaseOrderId;
    const b = delivery.order?.id;
    if (typeof a === "number" && Number.isFinite(a)) return a;
    if (typeof b === "number" && Number.isFinite(b)) return b;
    return undefined;
  }, [delivery]);

  const {
    data: deliveryStatusCodes = [],
    isLoading: deliveryStatusCodesLoading,
  } = useQuery<CommonCodeItem[]>({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_DELIVERY_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(COMMON_CODE_GROUP_DELIVERY_STATUS, accessToken!),
    enabled: !!accessToken && !isAuthLoading,
  });

  const statusName = (code: string | undefined) => {
    const c = code?.trim();
    if (!c) return "미지정";
    return deliveryStatusCodes.find((x) => x.code === c)?.name ?? c;
  };

  const stepLabels = useMemo(
    () => deliveryStatusCodes.map((c) => (c.name?.trim() ? c.name : c.code)),
    [deliveryStatusCodes]
  );
  const stepperCompleted = computeDeliveryStatusCompletedCount(
    delivery?.status,
    deliveryStatusCodes
  );
  const stepperDetails = buildDeliveryStepperDetailsFromCodes(
    deliveryStatusCodes,
    delivery?.status,
    delivery ? formatDateYmd(delivery.deliveryDate) : ""
  );

  const lines = delivery ? deliveryLines(delivery) : [];
  const loading = isAuthLoading || (idOk && deliveryLoading);

  if (!idOk) {
    return (
      <>
        <PageMeta title="납품 상세" description="납품을 찾을 수 없습니다." />
        <PageBreadcrumb pageTitle="납품 상세" />
        <p className="text-theme-sm text-gray-600 dark:text-gray-400">잘못된 납품 ID입니다.</p>
      </>
    );
  }

  if (!isAuthLoading && !accessToken) {
    return null;
  }

  if (loading && !delivery) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <LoadingLottie />
      </div>
    );
  }

  if (isDeliveryError || (!deliveryLoading && !delivery)) {
    return (
      <>
        <PageMeta title="납품 상세" description="납품을 불러올 수 없습니다." />
        <PageBreadcrumb pageTitle="납품 상세" />
        <p className="text-theme-sm text-red-600 dark:text-red-400">
          {deliveryError instanceof Error
            ? deliveryError.message
            : "납품 정보를 불러오지 못했습니다."}
        </p>
    </>
    );
  }

  const d = delivery!;
  const title = d.deliveryNo?.trim() || `#${d.id}`;

  return (
    <>
      <PageMeta title={`납품 ${title}`} description={`납품 ${title} 상세`} />
      <PageBreadcrumb pageTitle={`납품 상세 · ${title}`} />

      <div className="space-y-6">
        <ComponentCard title="납품 요약">
          <div className="min-w-0 overflow-x-auto pb-1">
            <div className="min-w-[640px] sm:min-w-0">
              {deliveryStatusCodesLoading ? (
                <div className="flex min-h-[120px] items-center justify-center py-4">
                  <LoadingLottie />
                </div>
              ) : deliveryStatusCodes.length === 0 ? (
                <p className="text-theme-sm text-gray-500 dark:text-gray-400">
                  납품 상태 공통 코드를 불러올 수 없어 단계를 표시하지 못했습니다.
                </p>
              ) : (
                <DeliverySummaryStepper
                  stepLabels={stepLabels}
                  completedCount={stepperCompleted}
                  stepDetails={stepperDetails}
                />
              )}
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="납품 정보">
          <div className="flex flex-wrap gap-2 border-b border-gray-100 pb-4 dark:border-white/[0.05]">
            <Link
              to="/delivery"
              className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
            >
              납품 목록
            </Link>
            {purchaseOrderId != null ? (
              <Link
                to={`/order/${purchaseOrderId}`}
                className="inline-flex rounded-lg border border-brand-500 bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-600 dark:border-brand-600 dark:bg-brand-600"
              >
                연결 발주 보기
              </Link>
            ) : null}
          </div>

          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품 번호</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {d.deliveryNo?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">제목</dt>
              <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
                {d.title?.trim() || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {formatDate(d.deliveryDate)}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">예정일</dt>
              <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
                {d.plannedDeliveryDate?.trim() ? formatDate(d.plannedDeliveryDate) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">상태</dt>
              <dd className="mt-0.5">
                <Badge size="sm" color={getBadgeColor(statusName(d.status))}>
                  {statusName(d.status)}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-theme-xs text-gray-500 dark:text-gray-400">발주</dt>
              <dd className="mt-0.5">
                {purchaseOrderId != null && d.order?.orderNo ? (
                  <Link
                    to={`/order/${purchaseOrderId}`}
                    className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {d.order.orderNo}
                  </Link>
                ) : (
                  <span className="text-gray-800 dark:text-gray-100">
                    {d.order?.orderNo ?? "—"}
                  </span>
                )}
              </dd>
            </div>
          </dl>

          {d.remark?.trim() ? (
            <p className="mt-4 rounded-lg border border-gray-100 bg-gray-50/80 px-3 py-2 text-theme-sm text-gray-700 dark:border-white/10 dark:bg-white/[0.04] dark:text-gray-200">
              {d.remark}
            </p>
          ) : null}
        </ComponentCard>

        <ComponentCard title="납품 품목">
          {lines.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">등록된 품목이 없습니다.</p>
          ) : (
            <div className="max-w-full overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {lines.map((line, idx) => {
                    const qty = line.quantity ?? line.deliveryQty;
                    const name =
                      line.itemName?.trim() ||
                      (line.orderItemId != null
                        ? `품목 #${line.orderItemId}`
                        : line.purchaseOrderItemId != null
                          ? `발주 품목 #${line.purchaseOrderItemId}`
                          : `행 ${idx + 1}`);
                    return (
                      <TableRow key={`${line.orderItemId ?? idx}-${idx}`}>
                        <TableCell className="px-4 py-3 text-theme-sm text-gray-800 dark:text-gray-200">
                          {name}
                        </TableCell>
                        <TableCell className="px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                          {qty != null && Number.isFinite(Number(qty)) ? String(qty) : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
