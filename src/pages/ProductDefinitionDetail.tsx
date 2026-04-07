import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import Badge from "../components/ui/badge/Badge";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import ProductDefinitionAddCompositionModal from "../components/products/ProductDefinitionAddCompositionModal";
import DatePicker from "../components/form/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import { useProductPermissions } from "../hooks/useProductPermissions";
import {
  getProduct,
  getProductDefinition,
  updateProductDefinition,
  deleteProductDefinitionItemRevision,
  productDefinitionSelectLabel,
  type ProductDefinitionDetailDto,
  type DefinitionItemRevisionLineDto,
} from "../api/products";
import { getHousingTemplates } from "../api/housingTemplates";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import {
  COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
  commonCodesToSelectOptions,
} from "../api/commonCode";
import { showForbiddenToast } from "../lib/forbiddenToast";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { TrashBinIcon } from "../icons";

const ORDER_TYPE_NONE = "__none__";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex border-b border-gray-100 py-3 dark:border-white/[0.05]">
      <dt className="w-36 shrink-0 text-sm font-medium text-gray-500 dark:text-gray-400">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-sm text-gray-800 dark:text-white/90 [&_code]:rounded [&_code]:bg-gray-200/80 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-theme-xs dark:[&_code]:bg-gray-700 dark:[&_code]:text-gray-100">
        {value}
      </dd>
    </div>
  );
}

const STATUS_OPTIONS = [
  { value: "DRAFT", label: "DRAFT" },
  { value: "ACTIVE", label: "ACTIVE" },
  { value: "OBSOLETE", label: "OBSOLETE" },
];

export default function ProductDefinitionDetail() {
  const { productId, definitionId } = useParams();
  const pid = Number(productId);
  const did = Number(definitionId);
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadProducts, canManageProducts } = useProductPermissions();

  const [headerModalOpen, setHeaderModalOpen] = useState(false);
  const [addCompositionOpen, setAddCompositionOpen] = useState(false);

  const [editName, setEditName] = useState("");
  const [editCode, setEditCode] = useState("");
  const [editVersion, setEditVersion] = useState("");
  const [editOrderType, setEditOrderType] = useState("");
  const [editProject, setEditProject] = useState("");
  const [editStatus, setEditStatus] = useState("DRAFT");
  const [editDefault, setEditDefault] = useState(false);
  const [editFrom, setEditFrom] = useState("");
  const [editTo, setEditTo] = useState("");
  const [editRemark, setEditRemark] = useState("");
  const [editHousingTemplateIdStr, setEditHousingTemplateIdStr] = useState("");

  const { data: product } = useQuery({
    queryKey: ["product", pid],
    queryFn: () => getProduct(pid, accessToken as string),
    enabled:
      !!accessToken && !isAuthLoading && canReadProducts && Number.isFinite(pid),
  });

  const {
    data: definition,
    isLoading: defLoading,
    error: defError,
  } = useQuery({
    queryKey: ["productDefinition", did],
    queryFn: () => getProductDefinition(did, accessToken as string),
    enabled:
      !!accessToken && !isAuthLoading && canReadProducts && Number.isFinite(did),
  });

  const { data: orderTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_PURCHASE_ORDER_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading && canReadProducts }
  );

  const orderTypeOptions = commonCodesToSelectOptions(orderTypeCodes);
  const orderTypeSelectOptionsWithNone = useMemo(
    () => [
      { value: ORDER_TYPE_NONE, label: "미지정" },
      ...orderTypeOptions,
    ],
    [orderTypeOptions]
  );

  const { data: housingTemplates = [], isLoading: housingListLoading } =
    useQuery({
      queryKey: ["housingTemplates"],
      queryFn: () => getHousingTemplates(accessToken as string),
      enabled:
        !!accessToken &&
        !isAuthLoading &&
        canReadProducts &&
        headerModalOpen,
      staleTime: 60_000,
    });

  const housingModalOptions = useMemo(
    () => [
      { value: "", label: "연결 안 함" },
      ...housingTemplates.map((t) => ({
        value: String(t.id),
        label: `${t.templateName} (${t.templateCode})`,
      })),
    ],
    [housingTemplates]
  );

  const openHeaderModal = (d: ProductDefinitionDetailDto) => {
    setEditName(d.name ?? "");
    setEditCode(d.code ?? "");
    setEditVersion(d.version ?? "");
    setEditOrderType(d.purchaseOrderTypeCode ?? "");
    setEditProject(d.projectCode ?? "");
    setEditStatus(d.definitionStatus ?? "DRAFT");
    setEditDefault(d.isDefault === true);
    setEditFrom(
      d.effectiveFrom?.slice(0, 10) ?? d.effectiveFrom ?? ""
    );
    setEditTo(d.effectiveTo?.slice(0, 10) ?? d.effectiveTo ?? "");
    setEditRemark(d.remark ?? "");
    setEditHousingTemplateIdStr(
      d.housingTemplateId != null && d.housingTemplateId > 0
        ? String(d.housingTemplateId)
        : ""
    );
    setHeaderModalOpen(true);
  };

  const updateHeaderMutation = useMutation({
    mutationFn: () => {
      const htRaw = editHousingTemplateIdStr.trim();
      const htNum = htRaw ? Number(htRaw) : NaN;
      const housingTemplateId =
        Number.isFinite(htNum) && htNum > 0 ? htNum : null;
      return updateProductDefinition(did, accessToken as string, {
        definitionName: editName.trim(),
        definitionCode: editCode.trim(),
        versionNo: editVersion.trim() || null,
        orderType:
          editOrderType === ORDER_TYPE_NONE
            ? null
            : editOrderType.trim() || null,
        projectCode: editProject.trim() || null,
        status: editStatus,
        isDefault: editDefault,
        effectiveFrom: editFrom.trim() || null,
        effectiveTo: editTo.trim() || null,
        remark: editRemark.trim() || null,
        housingTemplateId,
      });
    },
    onSuccess: () => {
      toast.success("저장했습니다.");
      queryClient.invalidateQueries({ queryKey: ["productDefinition", did] });
      queryClient.invalidateQueries({ queryKey: ["product", pid] });
      queryClient.invalidateQueries({ queryKey: ["productList"] });
      setHeaderModalOpen(false);
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "수정 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다.");
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: number) =>
      deleteProductDefinitionItemRevision(did, lineId, accessToken as string),
    onSuccess: () => {
      toast.success("삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: ["productDefinition", did] });
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "삭제 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    },
  });

  const sortedLines = useMemo(() => {
    const lines = definition?.lines ?? [];
    return [...lines].sort((a, b) => {
      const sa = a.sortOrder ?? 999999;
      const sb = b.sortOrder ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.id - b.id;
    });
  }, [definition?.lines]);

  if (!Number.isFinite(pid) || !Number.isFinite(did)) {
    return (
      <>
        <PageMeta title="제품 정의" description="제품 정의 상세" />
        <PageBreadcrumb pageTitle="제품 정의" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          잘못된 경로입니다.
        </p>
      </>
    );
  }

  if (!canReadProducts) {
    return (
      <>
        <PageMeta title="제품 정의" description="제품 정의 상세" />
        <PageBreadcrumb pageTitle="제품 정의" />
        <PageNotice variant="neutral">
          제품 조회 권한(<code>product.read</code>)이 없습니다.
        </PageNotice>
      </>
    );
  }

  if (isAuthLoading || defLoading) {
    return (
      <>
        <PageMeta title="제품 정의" description="제품 정의 상세" />
        <PageBreadcrumb pageTitle="제품 정의" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="제품 정의를 불러오는 중..." />
        </div>
      </>
    );
  }

  if (defError || !definition) {
    return (
      <>
        <PageMeta title="제품 정의" description="제품 정의 상세" />
        <PageBreadcrumb pageTitle="제품 정의" />
        <p className="text-sm text-red-600 dark:text-red-400">
          {defError instanceof Error
            ? defError.message
            : "제품 정의를 불러오지 못했습니다."}
        </p>
      </>
    );
  }

  const d = definition;
  const p = product;
  const belongsToProduct =
    (d.productId != null && d.productId === pid) ||
    d.product?.id === pid ||
    (p != null && (d.productId === p.id || d.product?.id === p.id));

  if (!belongsToProduct) {
    return (
      <>
        <PageMeta title="제품 정의" description="제품 정의 상세" />
        <PageBreadcrumb pageTitle="제품 정의" />
        <PageNotice variant="neutral">
          이 정의는 선택한 대표 제품에 속하지 않습니다.
        </PageNotice>
        <Link
          to={`/products/${pid}`}
          className="mt-4 inline-block text-sm text-brand-600 underline dark:text-brand-400"
        >
          제품 상세로
        </Link>
      </>
    );
  }

  const titleLabel = productDefinitionSelectLabel(d);

  return (
    <>
      <PageMeta title={`정의: ${titleLabel}`} description="제품 정의 상세" />
      <PageBreadcrumb pageTitle="제품 정의 상세" />

      <div className="mb-4 flex flex-wrap gap-2 text-theme-sm">
        <Link
          to="/products"
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          제품 목록
        </Link>
        <span className="text-gray-400 dark:text-gray-500">/</span>
        <Link
          to={`/products/${pid}`}
          className="text-brand-600 hover:underline dark:text-brand-400"
        >
          {p?.productName || p?.productCode || `제품 #${pid}`}
        </Link>
        <span className="text-gray-400 dark:text-gray-500">/</span>
        <span className="text-gray-600 dark:text-gray-300">{titleLabel}</span>
      </div>

      <div className="space-y-6">
        <ComponentCard
          title="제품 정의 기본 정보"
          desc="발주 라인에 저장되는 기준(product_definition)입니다."
          headerEnd={
            canManageProducts ? (
              <button
                type="button"
                onClick={() => openHeaderModal(d)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                수정
              </button>
            ) : null
          }
        >
          <dl className="min-w-0 flex-1">
            <DetailRow label="정의 ID" value={<code>{d.id}</code>} />
            <DetailRow
              label="이름 · 코드"
              value={
                <span>
                  {d.name ?? "-"} / <code>{d.code ?? "-"}</code>
                </span>
              }
            />
            <DetailRow label="버전" value={d.version ?? "-"} />
            <DetailRow
              label="발주 유형 (orderType)"
              value={
                d.purchaseOrderTypeCode ? (
                  <code>{d.purchaseOrderTypeCode}</code>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                )
              }
            />
            <DetailRow
              label="기본 정의"
              value={
                d.isDefault === true ? (
                  <Badge size="sm" color="success">
                    예
                  </Badge>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">아니오</span>
                )
              }
            />
            <DetailRow
              label="프로젝트"
              value={
                d.projectCode ? (
                  <code>{d.projectCode}</code>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                )
              }
            />
            <DetailRow
              label="하우징 템플릿"
              value={
                d.housingTemplateId != null && d.housingTemplateId > 0 ? (
                  <span className="flex flex-wrap items-center gap-2">
                    <span>
                      {d.housingTemplateName ?? "—"}
                      {d.housingTemplateCode ? (
                        <>
                          {" "}
                          (<code>{d.housingTemplateCode}</code>)
                        </>
                      ) : null}
                    </span>
                    <Link
                      to={`/housing-templates/${d.housingTemplateId}`}
                      className="text-theme-xs text-brand-600 underline dark:text-brand-400"
                    >
                      템플릿 보기
                    </Link>
                  </span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                )
              }
            />
            <DetailRow
              label="유효 기간"
              value={
                <span>
                  {d.effectiveFrom?.slice(0, 10) ?? "—"} ~{" "}
                  {d.effectiveTo?.slice(0, 10) ?? "—"}
                </span>
              }
            />
            <DetailRow
              label="비고"
              value={
                d.remark?.trim() ? (
                  <span className="whitespace-pre-wrap">{d.remark}</span>
                ) : (
                  <span className="text-gray-500 dark:text-gray-400">—</span>
                )
              }
            />
            <DetailRow
              label="상태"
              value={
                <Badge
                  size="sm"
                  color={d.isActive === false ? "error" : "success"}
                >
                  {d.definitionStatus
                    ? d.definitionStatus
                    : d.isActive === false
                      ? "비활성"
                      : "활성"}
                </Badge>
              }
            />
          </dl>
        </ComponentCard>

        <ComponentCard
          title="구성 품목 (리비전)"
          desc="보드 등 직접 연결할 품목만 추가합니다. 하우징은 위 하우징 템플릿으로 지정합니다. 동일 정의에 같은 itemRevisionId는 한 번만 등록할 수 있습니다."
          headerEnd={
            canManageProducts && accessToken ? (
              <button
                type="button"
                onClick={() => setAddCompositionOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                구성 추가
              </button>
            ) : null
          }
        >
          {sortedLines.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              등록된 구성이 없습니다.
            </p>
          ) : (
            <div className="mb-6 max-w-full overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      순서
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목 · 리비전
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      역할
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      필수
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      비고
                    </TableCell>
                    {canManageProducts ? (
                      <TableCell
                        isHeader
                        className="w-14 px-2 py-2 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                      >
                        <span className="sr-only">삭제</span>
                      </TableCell>
                    ) : null}
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                  {sortedLines.map((row: DefinitionItemRevisionLineDto) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                        {row.sortOrder ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-white/90">
                        <div className="min-w-[10rem]">
                          <div className="font-medium">
                            {row.itemName || row.itemCode || "—"}
                          </div>
                          <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                            <code>rev #{row.itemRevisionId}</code>
                            {row.revisionCode
                              ? ` · ${row.revisionCode}`
                              : null}
                            {row.revisionName
                              ? ` ${row.revisionName}`
                              : null}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {row.itemRole ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                        {row.quantity ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-gray-200">
                        {row.isRequired === false ? "아니오" : "예"}
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                        {row.remark ?? "—"}
                      </TableCell>
                      {canManageProducts ? (
                        <TableCell className="px-2 py-2 text-center align-middle">
                          <button
                            type="button"
                            disabled={deleteLineMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm(
                                  "이 구성 행을 삭제할까요?"
                                )
                              ) {
                                deleteLineMutation.mutate(row.id);
                              }
                            }}
                            title="구성 행 삭제"
                            aria-label="구성 행 삭제"
                            className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:pointer-events-none disabled:opacity-40 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          >
                            <TrashBinIcon className="size-[18px]" aria-hidden />
                          </button>
                        </TableCell>
                      ) : null}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

        </ComponentCard>
      </div>

      {canManageProducts && accessToken ? (
        <ProductDefinitionAddCompositionModal
          isOpen={addCompositionOpen}
          onClose={() => setAddCompositionOpen(false)}
          definitionId={did}
          productId={pid}
          accessToken={accessToken}
        />
      ) : null}

      <Modal
        isOpen={headerModalOpen}
        onClose={() => setHeaderModalOpen(false)}
        className="max-h-[90vh] max-w-lg overflow-y-auto p-6 sm:p-8"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          제품 정의 수정
        </h2>
        <form
          className="mt-4 space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (!editCode.trim() || !editName.trim()) {
              toast.error("정의 코드와 정의명은 필수입니다.");
              return;
            }
            updateHeaderMutation.mutate();
          }}
        >
          <div>
            <Label htmlFor="eh-code">정의 코드 *</Label>
            <Input
              id="eh-code"
              value={editCode}
              onChange={(e) => setEditCode(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="eh-name">정의명 *</Label>
            <Input
              id="eh-name"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="eh-ver">버전</Label>
            <Input
              id="eh-ver"
              value={editVersion}
              onChange={(e) => setEditVersion(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="eh-ot">발주 유형</Label>
            <Select
              id="eh-ot"
              className="mt-1.5"
              placeholder="발주 유형"
              value={editOrderType}
              onChange={setEditOrderType}
              options={orderTypeSelectOptionsWithNone}
              size="md"
            />
          </div>
          <div>
            <Label htmlFor="eh-proj">프로젝트 코드</Label>
            <Input
              id="eh-proj"
              value={editProject}
              onChange={(e) => setEditProject(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <SearchableSelectWithCreate
            id="eh-housing"
            label="하우징 템플릿"
            value={editHousingTemplateIdStr}
            onChange={setEditHousingTemplateIdStr}
            options={housingModalOptions}
            placeholder={
              housingListLoading
                ? "불러오는 중…"
                : "검색하여 선택 · 연결 안 함"
            }
            addTrigger="none"
            addButtonLabel="추가"
            onAddClick={() => {}}
            isDisabled={housingListLoading}
          />
          <div>
            <Label htmlFor="eh-st">상태</Label>
            <Select
              id="eh-st"
              className="mt-1.5"
              placeholder="상태"
              value={editStatus}
              onChange={setEditStatus}
              options={STATUS_OPTIONS}
              size="md"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              id="eh-effectiveFrom"
              label="유효 시작"
              placeholder="년-월-일"
              value={editFrom}
              onValueChange={setEditFrom}
            />
            <DatePicker
              id="eh-effectiveTo"
              label="유효 종료"
              placeholder="년-월-일"
              value={editTo}
              onValueChange={setEditTo}
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              id="eh-def"
              type="checkbox"
              checked={editDefault}
              onChange={(e) => setEditDefault(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 dark:border-gray-600"
            />
            기본 정의
          </label>
          <div>
            <Label>비고</Label>
            <TextArea
              value={editRemark}
              onChange={setEditRemark}
              rows={3}
              placeholder="비고"
              className="mt-1.5"
            />
          </div>
          <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
            <button
              type="submit"
              disabled={updateHeaderMutation.isPending}
              className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
            >
              저장
            </button>
            <button
              type="button"
              onClick={() => setHeaderModalOpen(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
            >
              닫기
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
