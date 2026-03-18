import { useState } from "react";
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
  getPurchaseOrderApprovals,
  getPurchaseOrderHistories,
  getPurchaseOrderFiles,
  getDeliveries,
  createDelivery,
  submitPurchaseOrderApproval,
  approvePurchaseOrderApproval,
  rejectPurchaseOrderApproval,
  uploadPurchaseOrderFile,
  type PurchaseOrderDetail,
  type PurchaseOrderApproval,
  type PurchaseOrderFile,
  type PurchaseOrderHistory,
  type Delivery,
  type DeliveryItemPayload,
  type DeliveryCreatePayload,
  type Partner,
  type PurchaseOrderItem,
} from "../api/purchaseOrder";
import { getUsers as getApiUsers, type UserItem } from "../api/user";
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

function formatDate(s: string | null | undefined): string {
  return s ?? "-";
}

export default function OrderDetail() {
  const { orderId } = useParams();
  const id = Number(orderId);
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [submitApprovalOpen, setSubmitApprovalOpen] = useState(false);
  const [approverIds, setApproverIds] = useState<number[]>([]);
  const [rejectOpen, setRejectOpen] = useState<{ approvalId: number } | null>(null);
  const [rejectComment, setRejectComment] = useState("");
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

  const { data: approvals = [] } = useQuery({
    queryKey: ["purchaseOrderApprovals", id],
    queryFn: () => getPurchaseOrderApprovals(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
  });

  const { data: histories = [] } = useQuery({
    queryKey: ["purchaseOrderHistories", id],
    queryFn: () => getPurchaseOrderHistories(id, accessToken!),
    enabled: !!accessToken && Number.isFinite(id),
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

  const { data: usersData = [] } = useQuery({
    queryKey: ["users"],
    queryFn: () => getApiUsers(accessToken!),
    enabled: !!accessToken && submitApprovalOpen,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
    queryClient.invalidateQueries({ queryKey: ["purchaseOrderApprovals", id] });
    queryClient.invalidateQueries({ queryKey: ["purchaseOrderHistories", id] });
    queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
  };

  const submitApprovalMutation = useMutation({
    mutationFn: () => submitPurchaseOrderApproval(id, approverIds, accessToken!),
    onSuccess: () => {
      toast.success("상신되었습니다.");
      setSubmitApprovalOpen(false);
      setApproverIds([]);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "상신에 실패했습니다."),
  });

  const approveMutation = useMutation({
    mutationFn: ({ approvalId, comment }: { approvalId: number; comment: string | null }) =>
      approvePurchaseOrderApproval(approvalId, comment, accessToken!),
    onSuccess: () => {
      toast.success("승인했습니다.");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "승인 처리에 실패했습니다."),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ approvalId, comment }: { approvalId: number; comment: string }) =>
      rejectPurchaseOrderApproval(approvalId, comment, accessToken!),
    onSuccess: () => {
      toast.success("반려했습니다.");
      setRejectOpen(null);
      setRejectComment("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message || "반려 처리에 실패했습니다."),
  });

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

  const canSubmitApproval =
    order &&
    (order.approvalStatus === "NONE" || order.approvalStatus === "DRAFT" || !order.approvalStatus);

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
  const partnerName = (po.partner as Partner)?.name ?? (po.partner as Partner)?.code ?? "-";

  return (
    <>
      <PageMeta title={`발주 ${po.orderNo}`} description={`발주 ${po.orderNo} 상세`} />
      <PageBreadcrumb pageTitle={`발주 상세 · ${po.orderNo}`} />

      <div className="space-y-6">
        <ComponentCard title="발주 정보">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">발주번호</span>
                <p className="font-medium text-gray-900 dark:text-white">{po.orderNo}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">제목</span>
                <p className="font-medium text-gray-900 dark:text-white">{po.title ?? "-"}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">거래처</span>
                <p className="font-medium text-gray-900 dark:text-white">{partnerName}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">발주일</span>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(po.orderDate)}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">요청납기</span>
                <p className="font-medium text-gray-900 dark:text-white">{formatDate(po.dueDate)}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">발주 상태</span>
                <p className="font-medium text-gray-900 dark:text-white">{po.orderStatus ?? "-"}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">승인 상태</span>
                <p className="font-medium text-gray-900 dark:text-white">{po.approvalStatus ?? "-"}</p>
              </div>
              <div>
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">총 금액</span>
                <p className="font-medium text-gray-900 dark:text-white">
                  {formatCurrency(po.totalAmount, po.currencyCode ?? "KRW")}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {canSubmitApproval && (
                <button
                  type="button"
                  onClick={() => setSubmitApprovalOpen(true)}
                  className="rounded-lg border border-brand-500 bg-white px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400 dark:hover:bg-gray-700"
                >
                  상신
                </button>
              )}
              <Link
                to={`/order/${id}/edit`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                수정
              </Link>
              <Link
                to="/order"
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                목록
              </Link>
            </div>
          </div>
          {(po.vendorOrderNo || po.vendorRequest || po.specialNote) && (
            <div className="mt-4 grid gap-2 border-t border-gray-100 pt-4 dark:border-white/5 sm:grid-cols-1">
              {po.vendorOrderNo && (
                <div>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">업체 발주번호</span>
                  <p className="text-theme-sm text-gray-800 dark:text-gray-200">{po.vendorOrderNo}</p>
                </div>
              )}
              {po.vendorRequest && (
                <div>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">업체 요청사항</span>
                  <p className="text-theme-sm text-gray-800 dark:text-gray-200">{po.vendorRequest}</p>
                </div>
              )}
              {po.specialNote && (
                <div>
                  <span className="text-theme-xs text-gray-500 dark:text-gray-400">특이사항</span>
                  <p className="text-theme-sm text-gray-800 dark:text-gray-200">{po.specialNote}</p>
                </div>
              )}
            </div>
          )}
        </ComponentCard>

        <ComponentCard title="발주 품목">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/5">
                <TableRow>
                  <TableCell isHeader className="text-theme-xs">품목명</TableCell>
                  <TableCell isHeader className="text-theme-xs">규격</TableCell>
                  <TableCell isHeader className="text-theme-xs">단위</TableCell>
                  <TableCell isHeader className="text-theme-xs text-end">수량</TableCell>
                  <TableCell isHeader className="text-theme-xs text-end">단가</TableCell>
                  <TableCell isHeader className="text-theme-xs text-end">금액</TableCell>
                  <TableCell isHeader className="text-theme-xs text-end">납품수량</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                {(po.items ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-6 text-center text-theme-sm text-gray-500">
                      품목이 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  (po.items ?? []).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="text-theme-sm">{item.itemName ?? item.item?.name ?? "-"}</TableCell>
                      <TableCell className="text-theme-sm">{item.spec ?? "-"}</TableCell>
                      <TableCell className="text-theme-sm">{item.unit ?? "-"}</TableCell>
                      <TableCell className="text-end text-theme-sm">{item.qty}</TableCell>
                      <TableCell className="text-end text-theme-sm">{formatCurrency(item.unitPrice, item.currencyCode ?? po.currencyCode ?? "KRW")}</TableCell>
                      <TableCell className="text-end text-theme-sm">{formatCurrency(item.amount, item.currencyCode ?? po.currencyCode ?? "KRW")}</TableCell>
                      <TableCell className="text-end text-theme-sm">{item.deliveredQty ?? 0}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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

        <ComponentCard title="결재 라인">
          <div className="space-y-2">
            {(approvals as PurchaseOrderApproval[]).length === 0 ? (
              <p className="text-theme-sm text-gray-500">결재 라인이 없습니다.</p>
            ) : (
              (approvals as PurchaseOrderApproval[]).map((a) => (
                <div
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 bg-gray-50/50 p-3 dark:border-white/5 dark:bg-white/[0.03]"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-theme-sm font-medium">
                      {a.approvalStep != null ? `${a.approvalStep}차` : ""} 결재자
                    </span>
                    <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                      {(a.approver as { name?: string })?.name ?? a.approverId}
                    </span>
                    <Badge
                      size="sm"
                      color={
                        a.approvalStatus === "APPROVED"
                          ? "success"
                          : a.approvalStatus === "REJECTED"
                            ? "error"
                            : "warning"
                      }
                    >
                      {a.approvalStatus}
                    </Badge>
                    {a.approvalComment && (
                      <span className="text-theme-xs text-gray-500">{a.approvalComment}</span>
                    )}
                    {a.approvedAt && (
                      <span className="text-theme-xs text-gray-500">{formatDate(a.approvedAt)}</span>
                    )}
                  </div>
                  {a.approvalStatus === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          approveMutation.mutate({ approvalId: a.id, comment: null })
                        }
                        disabled={approveMutation.isPending}
                        className="rounded border border-green-600 bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        승인
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectOpen({ approvalId: a.id })}
                        disabled={rejectMutation.isPending}
                        className="rounded border border-red-600 bg-white px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:bg-gray-800 dark:hover:bg-gray-700"
                      >
                        반려
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </ComponentCard>

        <ComponentCard title="변경 이력">
          <ul className="space-y-2">
            {(histories as PurchaseOrderHistory[]).length === 0 ? (
              <li className="text-theme-sm text-gray-500">이력이 없습니다.</li>
            ) : (
              (histories as PurchaseOrderHistory[]).map((h) => (
                <li
                  key={h.id}
                  className="flex flex-wrap gap-2 rounded border border-gray-100 p-2 text-theme-sm dark:border-white/5"
                >
                  <span className="font-medium">{h.changeType}</span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {(h.changedBy as { name?: string })?.name ?? "-"} · {formatDate(h.changedAt)}
                  </span>
                  {h.beforeValue != null && (
                    <span className="text-gray-500">이전: {String(h.beforeValue)}</span>
                  )}
                  {h.afterValue != null && (
                    <span className="text-gray-700 dark:text-gray-300">→ {String(h.afterValue)}</span>
                  )}
                </li>
              ))
            )}
          </ul>
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
                (po?.items ?? []).forEach((item) => {
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

      {/* 상신 모달: 결재자 선택 */}
      <Modal
        isOpen={submitApprovalOpen}
        onClose={() => {
          setSubmitApprovalOpen(false);
          setApproverIds([]);
        }}
        className="mx-4 max-w-lg p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">결재자 지정 (상신)</h3>
        <p className="mt-1 text-theme-sm text-gray-500">
          결재할 사용자를 순서대로 선택하세요.
        </p>
        <div className="mt-4 space-y-2">
          {(usersData as UserItem[]).slice(0, 20).map((u) => (
            <label key={u.id} className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={approverIds.includes(u.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setApproverIds((prev) => [...prev, u.id].sort((a, b) => a - b));
                  } else {
                    setApproverIds((prev) => prev.filter((x) => x !== u.id));
                  }
                }}
                className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
              />
              <span className="text-theme-sm">
                {u.name ?? u.employeeNo ?? u.id}
              </span>
            </label>
          ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setSubmitApprovalOpen(false)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => submitApprovalMutation.mutate()}
            disabled={approverIds.length === 0 || submitApprovalMutation.isPending}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
          >
            {submitApprovalMutation.isPending ? "처리 중..." : "상신"}
          </button>
        </div>
      </Modal>

      {/* 반려 모달 */}
      <Modal
        isOpen={!!rejectOpen}
        onClose={() => {
          setRejectOpen(null);
          setRejectComment("");
        }}
        className="mx-4 max-w-md p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">반려 사유</h3>
        <div className="mt-3">
          <Label htmlFor="reject-comment">사유 (선택)</Label>
          <Input
            id="reject-comment"
            value={rejectComment}
            onChange={(e) => setRejectComment(e.target.value)}
            placeholder="반려 사유를 입력하세요"
            className="mt-1"
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setRejectOpen(null)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
          >
            취소
          </button>
          <button
            type="button"
            onClick={() =>
              rejectOpen &&
              rejectMutation.mutate({ approvalId: rejectOpen.approvalId, comment: rejectComment || "반려" })
            }
            disabled={rejectMutation.isPending}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {rejectMutation.isPending ? "처리 중..." : "반려"}
          </button>
        </div>
      </Modal>

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
            <span className="text-theme-sm font-medium text-gray-700 dark:text-gray-300">품목별 납품 수량</span>
            <div className="mt-2 overflow-x-auto">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/5">
                  <TableRow>
                    <TableCell isHeader className="text-theme-xs">품목</TableCell>
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
              const items: DeliveryItemPayload[] = (po?.items ?? [])
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
