import { useState, useMemo } from "react";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseOrder,
  getPurchaseOrderFiles,
  getDeliveries,
  createDelivery,
  uploadPurchaseOrderFile,
  type PurchaseOrderDetail,
  type PurchaseOrderFile,
  type Delivery,
  type DeliveryItemPayload,
  type DeliveryCreatePayload,
  type Partner,
  type PurchaseOrderItem,
} from "../api/purchaseOrder";
import {
  getCommonCodesByGroup,
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
} from "../api/commonCode";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import Input from "../components/form/input/InputField";
import FileInput from "../components/form/input/FileInput";
import Label from "../components/form/Label";
import { formatCurrency } from "../lib/formatCurrency";
import {
  lineItemsToAmountSummaries,
  OrderLineAmountSummary,
} from "../lib/orderLineAmountSummary";

function formatDate(s: string | null | undefined): string {
  return s ?? "-";
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [deliveryModalOpen, setDeliveryModalOpen] = useState(false);
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryRemark, setDeliveryRemark] = useState("");
  const [deliveryItems, setDeliveryItems] = useState<Record<number, { deliveryQty: number; lotNo: string; remark: string }>>({});
  const [fileInputKey, setFileInputKey] = useState(0);

  const { data: order, isLoading: orderLoading, error: orderError } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !!accessToken && !isAuthLoading && Number.isFinite(id),
  });

  const { data: files = [] } = useQuery({
    queryKey: ["purchaseOrderFiles", id],
    queryFn: () => getPurchaseOrderFiles(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
  });

  const { data: deliveries = [] } = useQuery({
    queryKey: ["purchaseOrderDeliveries", id],
    queryFn: () => getDeliveries(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
  });

  const { data: purchaseOrderTypeCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
        accessToken!
      ),
    enabled: !!accessToken && !isAuthLoading,
  });

  const { data: purchaseOrderStatusCodes = [] } = useQuery({
    queryKey: ["commonCodes", COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS],
    queryFn: () =>
      getCommonCodesByGroup(
        COMMON_CODE_GROUP_PURCHASE_ORDER_STATUS,
        accessToken!
      ),
    enabled: !!accessToken && !isAuthLoading,
  });

  const orderTypeDisplayName = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const code = String(d.orderType ?? "").trim();
    const hit = purchaseOrderTypeCodes.find((c) => c.code === code);
    return hit?.name || code || "-";
  }, [order, purchaseOrderTypeCodes]);

  const orderStatusDisplayName = useMemo(() => {
    if (!order) return "-";
    const d = order as PurchaseOrderDetail;
    const code = String(d.status ?? d.orderStatus ?? "").trim();
    const hit = purchaseOrderStatusCodes.find((c) => c.code === code);
    return hit?.name || code || "-";
  }, [order, purchaseOrderStatusCodes]);

  const fileUploadMutation = useMutation({
    mutationFn: (file: File) => uploadPurchaseOrderFile(id, file, accessToken!),
    onSuccess: () => {
      toast.success("파일이 업로드되었습니다.");
      setFileInputKey((k) => k + 1);
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderFiles", id] });
    },
    onError: (e: Error) => toast.error(e.message || "업로드에 실패했습니다."),
  });

  const deliveryMutation = useMutation({
    mutationFn: (payload: DeliveryCreatePayload) =>
      createDelivery(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("납품이 등록되었습니다.");
      setDeliveryModalOpen(false);
      setDeliveryDate("");
      setDeliveryRemark("");
      setDeliveryItems({});
      queryClient.invalidateQueries({ queryKey: ["purchaseOrderDeliveries", id] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    },
    onError: (e: Error) => toast.error(e.message || "납품 등록에 실패했습니다."),
  });

  const orderLineSummaries = useMemo(() => {
    if (!order) return [];
    const d = order as PurchaseOrderDetail;
    return lineItemsToAmountSummaries(
      d.orderItems ?? d.items ?? [],
      d.currencyCode ?? "KRW"
    );
  }, [order]);

  if (orderLoading || !order) {
    return (
      <>
        <PageMeta title="발주 상세" description="발주 상세" />
        <PageBreadcrumb pageTitle="발주 상세" />
        <div className="flex min-h-[320px] items-center justify-center">
          {orderLoading && <LoadingLottie />}
          {!orderLoading && orderError && (
            <p className="text-sm text-red-600 dark:text-red-400">발주를 불러오지 못했습니다.</p>
          )}
        </div>
      </>
    );
  }

  const po = order as PurchaseOrderDetail;
  /** GET 상세의 orderItems(매퍼가 items와 동일 배열로 정규화) */
  const orderLines = po.orderItems ?? po.items ?? [];
  const partnerName = (po.partner as Partner)?.name ?? (po.partner as Partner)?.code ?? "-";
  const headerCurrency = po.currencyCode ?? "KRW";
  const orderSummaryTh =
    "w-[11%] min-w-[5.5rem] whitespace-nowrap bg-gray-50 px-3 py-2.5 text-left text-theme-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-400";
  const orderSummaryTd = "px-3 py-2.5 text-sm text-gray-900 dark:text-gray-100";

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-6">
        <ComponentCard title="발주 정보">
          <div className="overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col gap-3 border-b border-gray-100 bg-gray-50/90 px-4 py-3 dark:border-white/10 dark:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between">
              <dl className="flex min-w-0 flex-wrap gap-x-5 gap-y-2 text-theme-xs">
                <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">발주 상태</dt>
                  <dd className="font-semibold text-gray-900 dark:text-white">
                    {orderStatusDisplayName}
                  </dd>
                </div>
                <div className="flex min-w-0 max-w-full items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">부서</dt>
                  <dd className="max-w-md break-words font-medium text-gray-900 dark:text-gray-100">
                    {po.requesterDepartment?.trim() || "-"}
                  </dd>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <dt className="shrink-0 text-gray-500 dark:text-gray-400">담당</dt>
                  <dd className="font-medium text-gray-900 dark:text-gray-100">
                    {po.requesterName?.trim() || "-"}
                  </dd>
                </div>
                {po.createdBy?.name ? (
                  <div className="flex items-baseline gap-1.5">
                    <dt className="shrink-0 text-gray-500 dark:text-gray-400">등록</dt>
                    <dd className="font-medium text-gray-900 dark:text-gray-100">
                      {po.createdBy.name}
                    </dd>
                  </div>
                ) : null}
              </dl>
              <div className="flex flex-wrap gap-2 sm:shrink-0 sm:justify-end">
                <Link
                  to={`/order/${id}/edit`}
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  수정
                </Link>
                <Link
                  to="/order"
                  className="inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                >
                  목록
                </Link>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[36rem] border-collapse text-sm">
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    발주번호
                  </th>
                  <td className={orderSummaryTd}>{po.orderNo}</td>
                  <th scope="row" className={orderSummaryTh}>
                    제목
                  </th>
                  <td className={orderSummaryTd}>{po.title?.trim() || "-"}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    거래처
                  </th>
                  <td className={orderSummaryTd}>{partnerName}</td>
                  <th scope="row" className={orderSummaryTh}>
                    발주일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.orderDate)}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    발주 유형
                  </th>
                  <td className={orderSummaryTd}>{orderTypeDisplayName}</td>
                  <th scope="row" className={orderSummaryTh}>
                    우선순위
                  </th>
                  <td className={orderSummaryTd}>{po.priority ?? "-"}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    요청 납기
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.dueDate)}</td>
                  <th scope="row" className={orderSummaryTh}>
                    납품 요청일
                  </th>
                  <td className={orderSummaryTd}>{formatDate(po.requestDeliveryDate)}</td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    업체 발주번호
                  </th>
                  <td className={orderSummaryTd} colSpan={3}>
                    {po.vendorOrderNo?.trim() || "—"}
                  </td>
                </tr>
                {po.vendorRequest ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      업체 요청사항
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{po.vendorRequest}</span>
                    </td>
                  </tr>
                ) : null}
                {po.specialNote ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      특이사항
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{po.specialNote}</span>
                    </td>
                  </tr>
                ) : null}
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    공급가액
                  </th>
                  <td
                    className={`${orderSummaryTd} font-medium tabular-nums`}
                    colSpan={3}
                  >
                    {po.supplyAmount != null ? (
                      <>
                        {formatCurrency(po.supplyAmount, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                <tr>
                  <th scope="row" className={orderSummaryTh}>
                    합계
                  </th>
                  <td
                    className={`${orderSummaryTd} font-medium tabular-nums`}
                    colSpan={3}
                  >
                    {po.totalAmountVatIncluded != null ? (
                      <>
                        {formatCurrency(po.totalAmountVatIncluded, headerCurrency)}
                        <span className="ml-1.5 text-theme-xs font-normal text-gray-500 dark:text-gray-400">
                          ({headerCurrency})
                        </span>
                      </>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
                {po.memo != null && String(po.memo).trim() !== "" ? (
                  <tr>
                    <th
                      scope="row"
                      className={`${orderSummaryTh} align-top`}
                    >
                      메모
                    </th>
                    <td className={orderSummaryTd} colSpan={3}>
                      <span className="whitespace-pre-wrap">{String(po.memo)}</span>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="발주 제품">
          <div className="space-y-4 dark:border-gray-700">
            <div className="relative overflow-x-auto border-b dark:border-gray-800">
              <Table className="w-full text-left text-sm text-gray-900 dark:text-white md:table-fixed">
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow className="hover:bg-transparent">
                    <TableCell
                      isHeader
                      className="whitespace-nowrap py-3 font-medium text-gray-600 dark:text-gray-400 md:w-[18%]"
                    >
                      제품
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[12%]"
                    >
                      규격
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[14%]"
                    >
                      단위 · 수량
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[16%]"
                    >
                      통화 · 단가
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 text-end font-medium text-gray-600 dark:text-gray-400 md:w-[12%]"
                    >
                      금액
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[12%]"
                    >
                      납품 요청일
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 font-medium text-gray-600 dark:text-gray-400 md:w-[10%]"
                    >
                      비고
                    </TableCell>
                    <TableCell
                      isHeader
                      className="whitespace-nowrap p-3 text-end font-medium text-gray-600 dark:text-gray-400 md:w-[6%]"
                    >
                      납품
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-200 dark:divide-gray-800">
                  {orderLines.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400"
                      >
                        등록된 제품이 없습니다.
                      </TableCell>
                    </TableRow>
                  ) : (
                    orderLines.map((item) => {
                      const lineCc =
                        item.currencyCode ?? po.currencyCode ?? "KRW";
                      return (
                        <TableRow
                          key={item.id}
                          className="align-middle hover:bg-transparent"
                        >
                          <TableCell className="whitespace-nowrap py-3 align-middle font-medium text-gray-900 dark:text-white">
                            {item.itemName ?? item.item?.name ?? "-"}
                          </TableCell>
                          <TableCell className="p-3 align-middle text-gray-600 dark:text-gray-400">
                            {item.spec ?? "-"}
                          </TableCell>
                          <TableCell className="p-3 align-middle tabular-nums text-gray-800 dark:text-gray-200">
                            <span>{item.unit ?? "-"}</span>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            <span>{item.qty}</span>
                          </TableCell>
                          <TableCell className="p-3 align-middle tabular-nums text-gray-800 dark:text-gray-200">
                            <span className="text-gray-500 dark:text-gray-400">
                              {lineCc}
                            </span>
                            <span className="mx-1 text-gray-300 dark:text-gray-600">
                              ·
                            </span>
                            <span>
                              {item.unitPrice != null
                                ? formatCurrency(item.unitPrice, lineCc)
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell className="p-3 align-middle text-end font-medium tabular-nums text-gray-900 dark:text-white">
                            {item.amount != null
                              ? formatCurrency(item.amount, lineCc)
                              : "-"}
                          </TableCell>
                          <TableCell className="p-3 align-middle text-gray-600 dark:text-gray-400">
                            {item.requestDeliveryDate ?? "-"}
                          </TableCell>
                          <TableCell className="p-3 align-middle text-gray-600 dark:text-gray-400">
                            {item.remark ?? "-"}
                          </TableCell>
                          <TableCell className="p-3 align-middle text-end tabular-nums text-gray-800 dark:text-gray-200">
                            {item.deliveredQty ?? 0}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="mt-4 space-y-6">
              <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
                주문 요약
              </h3>
              <OrderLineAmountSummary
                summaries={
                  orderLineSummaries.length > 0
                    ? orderLineSummaries
                    : [
                        {
                          currencyCode: po.currencyCode || "KRW",
                          subtotal: 0,
                          vat: 0,
                          total: 0,
                        },
                      ]
                }
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="첨부파일">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <FileInput
                key={fileInputKey}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) fileUploadMutation.mutate(f);
                }}
              />
              {fileUploadMutation.isPending && (
                <span className="text-theme-xs text-gray-500">업로드 중...</span>
              )}
            </div>
            <ul className="divide-y divide-gray-100 dark:divide-white/5 text-theme-sm">
              {(files as PurchaseOrderFile[]).length === 0 ? (
                <li className="py-2 text-gray-500">첨부파일이 없습니다.</li>
              ) : (
                (files as PurchaseOrderFile[]).map((f) => (
                  <li key={f.id} className="flex items-center justify-between py-2">
                    <span className="text-gray-800 dark:text-gray-200">{f.fileName}</span>
                    <span className="text-gray-500">{f.uploadedAt ?? ""}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </ComponentCard>

        <ComponentCard title="납품 목록">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex-1" />
            <button
              type="button"
              onClick={() => {
                setDeliveryDate(new Date().toISOString().slice(0, 10));
                setDeliveryRemark("");
                const init: Record<number, { deliveryQty: number; lotNo: string; remark: string }> = {};
                orderLines.forEach((item) => {
                  init[item.id] = { deliveryQty: 0, lotNo: "", remark: "" };
                });
                setDeliveryItems(init);
                setDeliveryModalOpen(true);
              }}
              className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400"
            >
              납품 등록
            </button>
          </div>
          {(deliveries as Delivery[]).length === 0 ? (
            <p className="text-theme-sm text-gray-500">납품 이력이 없습니다.</p>
          ) : (
            <ul className="space-y-3">
              {(deliveries as Delivery[]).map((d) => (
                <li
                  key={d.id}
                  className="rounded-lg border border-gray-100 p-3 dark:border-white/5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{d.deliveryNo ?? d.id}</span>
                    <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                      {formatDate(d.deliveryDate)}
                    </span>
                    {d.status && (
                      <Badge size="sm" color="primary">
                        {d.status}
                      </Badge>
                    )}
                  </div>
                  {d.remark && (
                    <p className="mt-1 text-theme-xs text-gray-500">{d.remark}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ComponentCard>
      </div>

      {/* 납품 등록 모달 */}
      <Modal
        isOpen={deliveryModalOpen}
        onClose={() => setDeliveryModalOpen(false)}
        className="mx-4 max-w-2xl max-h-[90vh] overflow-y-auto p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">납품 등록</h3>
        <div className="mt-4 space-y-4">
          <div>
            <Label htmlFor="delivery-date">납품일</Label>
            <input
              id="delivery-date"
              type="date"
              value={deliveryDate}
              onChange={(e) => setDeliveryDate(e.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-theme-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <Label htmlFor="delivery-remark">비고</Label>
            <Input
              id="delivery-remark"
              value={deliveryRemark}
              onChange={(e) => setDeliveryRemark(e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">제품별 납품 수량</span>
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">제품</TableCell>
                    <TableCell isHeader className="text-theme-xs text-end">납품 수량</TableCell>
                    <TableCell isHeader className="text-theme-xs">LOT번호</TableCell>
                    <TableCell isHeader className="text-theme-xs">비고</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                  {(po?.items ?? []).map((item: PurchaseOrderItem) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-theme-sm">{item.itemName ?? item.item?.name ?? "-"}</TableCell>
                      <TableCell className="text-end">
                        <input
                          type="number"
                          min={0}
                          value={deliveryItems[item.id]?.deliveryQty ?? 0}
                          onChange={(e) =>
                            setDeliveryItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                deliveryQty: Number(e.target.value) || 0,
                                lotNo: prev[item.id]?.lotNo ?? "",
                                remark: prev[item.id]?.remark ?? "",
                              },
                            }))
                          }
                          className="h-9 w-20 rounded border border-gray-300 bg-white px-2 text-right text-theme-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={deliveryItems[item.id]?.lotNo ?? ""}
                          onChange={(e) =>
                            setDeliveryItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                deliveryQty: prev[item.id]?.deliveryQty ?? 0,
                                lotNo: e.target.value,
                                remark: prev[item.id]?.remark ?? "",
                              },
                            }))
                          }
                          placeholder="LOT"
                          className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-theme-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </TableCell>
                      <TableCell>
                        <input
                          type="text"
                          value={deliveryItems[item.id]?.remark ?? ""}
                          onChange={(e) =>
                            setDeliveryItems((prev) => ({
                              ...prev,
                              [item.id]: {
                                ...prev[item.id],
                                deliveryQty: prev[item.id]?.deliveryQty ?? 0,
                                lotNo: prev[item.id]?.lotNo ?? "",
                                remark: e.target.value,
                              },
                            }))
                          }
                          placeholder="비고"
                          className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-theme-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeliveryModalOpen(false)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              const items: DeliveryItemPayload[] = orderLines
                .filter((item: PurchaseOrderItem) => (deliveryItems[item.id]?.deliveryQty ?? 0) > 0)
                .map((item: PurchaseOrderItem) => ({
                  purchaseOrderItemId: item.id,
                  itemId: item.itemId,
                  deliveryQty: deliveryItems[item.id]?.deliveryQty ?? 0,
                  lotNo: deliveryItems[item.id]?.lotNo || null,
                  remark: deliveryItems[item.id]?.remark || null,
                }));
              if (!deliveryDate.trim()) {
                toast.error("납품일을 입력하세요.");
                return;
              }
              if (items.length === 0) {
                toast.error("납품 수량을 1건 이상 입력하세요.");
                return;
              }
              const payload: DeliveryCreatePayload = {
                deliveryDate: deliveryDate.trim(),
                remark: deliveryRemark.trim() || null,
                items,
              };
              deliveryMutation.mutate(payload);
            }}
            disabled={deliveryMutation.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {deliveryMutation.isPending ? "등록 중..." : "납품 등록"}
          </button>
        </div>
      </Modal>
    </>
  );
}
