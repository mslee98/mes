import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import Select from "../components/form/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import {
  getPurchaseOrder,
  getPartners,
  getItems,
  createPurchaseOrder,
  updatePurchaseOrder,
  type PurchaseOrderCreatePayload,
  type PurchaseOrderUpdatePayload,
  type PurchaseOrderItemPayload,
  type Partner,
  type Item,
} from "../api/purchaseOrder";
import { getCommonCodesByGroup } from "../api/commonCode";

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

type ItemRow = {
  itemId: number;
  qty: number;
  unitPrice: number;
  currencyCode: string;
  requestDeliveryDate: string;
  remark: string;
};

const emptyItemRow = (defaultCurrency = "KRW"): ItemRow => ({
  itemId: 0,
  qty: 0,
  unitPrice: 0,
  currencyCode: defaultCurrency,
  requestDeliveryDate: "",
  remark: "",
});

export default function OrderForm() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // /order/new 라우트에는 :orderId가 없어 orderId가 undefined이므로 둘 다 등록 모드로 처리
  const isNew = orderId == null || orderId === "new";
  const id = isNew ? 0 : Number(orderId);
  const { accessToken } = useAuth();

  const [title, setTitle] = useState("");
  const [partnerId, setPartnerId] = useState<string>("");
  const [orderDate, setOrderDate] = useState(todayString());
  const [dueDate, setDueDate] = useState("");
  const [requestDeliveryDate, setRequestDeliveryDate] = useState("");
  const [vendorOrderNo, setVendorOrderNo] = useState("");
  const [vendorRequest, setVendorRequest] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [orderCurrencyCode, setOrderCurrencyCode] = useState("KRW");
  const [items, setItems] = useState<ItemRow[]>([emptyItemRow("KRW")]);

  const { data: order, isLoading: orderLoading } = useQuery({
    queryKey: ["purchaseOrder", id],
    queryFn: () => getPurchaseOrder(id, accessToken!),
    enabled: !isNew && !!accessToken && Number.isFinite(id),
  });

  const { data: partners = [] } = useQuery({
    queryKey: ["partners"],
    queryFn: () => getPartners(accessToken!),
    enabled: !!accessToken,
  });

  const { data: itemList = [] } = useQuery({
    queryKey: ["items"],
    queryFn: () => getItems(accessToken!),
    enabled: !!accessToken && isNew,
  });

  const { data: currencyCodes = [] } = useQuery({
    queryKey: ["commonCodes", "CURRENCY"],
    queryFn: () => getCommonCodesByGroup("CURRENCY", accessToken!),
    enabled: !!accessToken,
  });

  const currencyOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [];
    currencyCodes.forEach((c) => list.push({ value: c.code, label: c.name || c.code }));
    if (list.length === 0) list.push({ value: "KRW", label: "원 (KRW)" });
    return list;
  }, [currencyCodes]);

  // 편집 시 기존 값 채우기
  useEffect(() => {
    if (!isNew && order) {
      setTitle(order.title ?? "");
      setPartnerId(String(order.partnerId ?? ""));
      setOrderDate(order.orderDate ?? todayString());
      setDueDate(order.dueDate ?? "");
      setOrderCurrencyCode(order.currencyCode ?? "KRW");
      setRequestDeliveryDate(order.requestDeliveryDate ?? "");
      setVendorOrderNo(order.vendorOrderNo ?? "");
      setVendorRequest(order.vendorRequest ?? "");
      setSpecialNote(order.specialNote ?? "");
    }
  }, [isNew, order]);

  const partnerOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "", label: "거래처 선택" }];
    (partners as Partner[]).forEach((p) =>
      list.push({ value: String(p.id), label: p.name || p.code || "-" })
    );
    return list;
  }, [partners]);

  const itemOptions = useMemo(() => {
    const list: { value: string; label: string }[] = [{ value: "0", label: "품목 선택" }];
    (itemList as Item[]).forEach((i) =>
      list.push({ value: String(i.id), label: `${i.name} (${i.code})` })
    );
    return list;
  }, [itemList]);

  const createMutation = useMutation({
    mutationFn: (payload: PurchaseOrderCreatePayload) =>
      createPurchaseOrder(payload, accessToken!),
    onSuccess: (data) => {
      toast.success("발주가 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      navigate(`/order/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PurchaseOrderUpdatePayload) =>
      updatePurchaseOrder(id, payload, accessToken!),
    onSuccess: () => {
      toast.success("발주가 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ["purchaseOrders"] });
      queryClient.invalidateQueries({ queryKey: ["purchaseOrder", id] });
      navigate(`/order/${id}`);
    },
    onError: (e: Error) => toast.error(e.message || "수정에 실패했습니다."),
  });

  const addItemRow = () => setItems((prev) => [...prev, emptyItemRow(orderCurrencyCode)]);
  const removeItemRow = (index: number) =>
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  const updateItemRow = (index: number, field: keyof ItemRow, value: string | number) => {
    setItems((prev) => {
      const next = [...prev];
      (next[index] as Record<string, unknown>)[field] = value;
      return next;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNew) {
      const validItems = items.filter((row) => row.itemId > 0 && row.qty > 0 && row.unitPrice >= 0);
      if (validItems.length === 0) {
        toast.error("품목을 1건 이상 등록하고, 수량·단가를 입력하세요.");
        return;
      }
      if (!title.trim()) {
        toast.error("제목을 입력하세요.");
        return;
      }
      if (!partnerId || Number(partnerId) <= 0) {
        toast.error("거래처를 선택하세요.");
        return;
      }
      const payload: PurchaseOrderCreatePayload = {
        title: title.trim(),
        partnerId: Number(partnerId),
        orderDate,
        currencyCode: orderCurrencyCode || "KRW",
        dueDate: dueDate || null,
        requestDeliveryDate: requestDeliveryDate || null,
        vendorOrderNo: vendorOrderNo.trim() || null,
        vendorRequest: vendorRequest.trim() || null,
        specialNote: specialNote.trim() || null,
        items: validItems.map(
          (row): PurchaseOrderItemPayload => ({
            itemId: row.itemId,
            qty: row.qty,
            unitPrice: row.unitPrice,
            currencyCode: row.currencyCode || orderCurrencyCode || null,
            requestDeliveryDate: row.requestDeliveryDate || null,
            remark: row.remark || null,
          })
        ),
      };
      createMutation.mutate(payload);
    } else {
      const payload: PurchaseOrderUpdatePayload = {
        title: title.trim(),
        partnerId: partnerId ? Number(partnerId) : undefined,
        orderDate,
        currencyCode: orderCurrencyCode || "KRW",
        dueDate: dueDate || null,
        requestDeliveryDate: requestDeliveryDate || null,
        vendorOrderNo: vendorOrderNo.trim() || null,
        vendorRequest: vendorRequest.trim() || null,
        specialNote: specialNote.trim() || null,
      };
      updateMutation.mutate(payload);
    }
  };

  if (!isNew && orderLoading && !order) {
    return (
      <>
        <PageMeta title="발주 수정" description="발주 수정" />
        <PageBreadcrumb pageTitle="발주 수정" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie />
        </div>
      </>
    );
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <>
      <PageMeta
        title={isNew ? "발주 등록" : "발주 수정"}
        description={isNew ? "발주 등록" : "발주 수정"}
      />
      <PageBreadcrumb pageTitle={isNew ? "발주 등록" : "발주 수정"} />

      <div className="space-y-6">
        <ComponentCard title={isNew ? "발주 등록 (타 업체 → 우리 회사 요청)" : "발주 헤더 수정"}>
          <form key={isNew ? "new" : order ? `edit-${order.id}` : "loading"} onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="발주 제목"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="partnerId">거래처 *</Label>
                <Select
                  options={partnerOptions}
                  defaultValue={partnerId}
                  onChange={setPartnerId}
                  placeholder="거래처 선택"
                  size="md"
                />
              </div>
              <div>
                <Label htmlFor="orderDate">발주일 *</Label>
                <input
                  id="orderDate"
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="dueDate">요청납기</Label>
                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                />
              </div>
              <div>
                <Label htmlFor="orderCurrencyCode">기본 통화</Label>
                <Select
                  key={`order-currency-${orderCurrencyCode || "KRW"}`}
                  options={currencyOptions}
                  defaultValue={orderCurrencyCode || "KRW"}
                  onChange={setOrderCurrencyCode}
                  placeholder="통화 선택"
                  size="md"
                />
              </div>
              {isNew && (
                <div className="sm:col-span-2">
                  <Label htmlFor="requestDeliveryDate">납품 요청일</Label>
                  <input
                    id="requestDeliveryDate"
                    type="date"
                    value={requestDeliveryDate}
                    onChange={(e) => setRequestDeliveryDate(e.target.value)}
                    className="mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              )}
              <div className="sm:col-span-2">
                <Label htmlFor="vendorOrderNo">업체 발주번호</Label>
                <Input
                  id="vendorOrderNo"
                  value={vendorOrderNo}
                  onChange={(e) => setVendorOrderNo(e.target.value)}
                  placeholder="업체에서 부여한 발주번호"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="vendorRequest">업체 요청사항</Label>
                <Input
                  id="vendorRequest"
                  value={vendorRequest}
                  onChange={(e) => setVendorRequest(e.target.value)}
                  placeholder="업체 요청사항"
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="specialNote">특이사항</Label>
                <Input
                  id="specialNote"
                  value={specialNote}
                  onChange={(e) => setSpecialNote(e.target.value)}
                  placeholder="특이사항"
                  className="mt-1"
                />
              </div>
            </div>

            {isNew && (
              <div>
                <div className="flex items-center justify-between">
                  <Label>발주 품목 *</Label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="rounded border border-brand-500 px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-600 dark:text-brand-400 dark:hover:bg-gray-800"
                  >
                    + 품목 추가
                  </button>
                </div>
                <div className="mt-2 overflow-x-auto">
                  <Table>
                    <TableHeader className="border-b border-gray-100 dark:border-white/5">
                      <TableRow>
                        <TableCell isHeader className="text-theme-xs">품목</TableCell>
                        <TableCell isHeader className="text-theme-xs text-end">수량</TableCell>
                        <TableCell isHeader className="text-theme-xs">통화</TableCell>
                        <TableCell isHeader className="text-theme-xs text-end">단가</TableCell>
                        <TableCell isHeader className="text-theme-xs">납품 요청일</TableCell>
                        <TableCell isHeader className="text-theme-xs">비고</TableCell>
                        <TableCell isHeader className="text-theme-xs w-20">{""}</TableCell>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-gray-100 dark:divide-white/5">
                      {items.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            <Select
                              options={itemOptions}
                              defaultValue={row.itemId ? String(row.itemId) : "0"}
                              onChange={(v) => updateItemRow(index, "itemId", Number(v) || 0)}
                              placeholder="품목 선택"
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-end">
                            <input
                              type="number"
                              min={0}
                              value={row.qty || ""}
                              onChange={(e) =>
                                updateItemRow(index, "qty", Number(e.target.value) || 0)
                              }
                              className="h-9 w-24 rounded border border-gray-300 bg-white px-2 text-right text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <Select
                              key={`row-${index}-${row.currencyCode || orderCurrencyCode}`}
                              options={currencyOptions}
                              defaultValue={row.currencyCode || orderCurrencyCode || "KRW"}
                              onChange={(v) => updateItemRow(index, "currencyCode", v)}
                              placeholder="통화"
                              size="sm"
                            />
                          </TableCell>
                          <TableCell className="text-end">
                            <input
                              type="number"
                              min={0}
                              step={row.currencyCode === "USD" ? 0.01 : 1}
                              value={row.unitPrice || ""}
                              onChange={(e) =>
                                updateItemRow(index, "unitPrice", Number(e.target.value) || 0)
                              }
                              className="h-9 w-28 rounded border border-gray-300 bg-white px-2 text-right text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="date"
                              value={row.requestDeliveryDate}
                              onChange={(e) =>
                                updateItemRow(index, "requestDeliveryDate", e.target.value)
                              }
                              className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <input
                              type="text"
                              value={row.remark}
                              onChange={(e) => updateItemRow(index, "remark", e.target.value)}
                              placeholder="비고"
                              className="h-9 w-full rounded border border-gray-300 bg-white px-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                            />
                          </TableCell>
                          <TableCell>
                            <button
                              type="button"
                              onClick={() => removeItemRow(index)}
                              disabled={items.length <= 1}
                              className="text-red-600 hover:underline disabled:opacity-50"
                            >
                              삭제
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <button
                type="submit"
                disabled={isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
              >
                {isPending ? "저장 중..." : isNew ? "등록" : "수정"}
              </button>
              <Link
                to={isNew ? "/order" : `/order/${id}`}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                취소
              </Link>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}
