import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router";
import toast from "react-hot-toast";
import Select from "react-select";
import type { GroupBase, SingleValue, StylesConfig } from "react-select";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import PageNotice from "../components/common/PageNotice";
import LoadingLottie from "../components/common/LoadingLottie";
import ComponentCard from "../components/common/ComponentCard";
import { Modal } from "../components/ui/modal";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import FormSelect from "../components/form/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useProductPermissions } from "../hooks/useProductPermissions";
import {
  getHousingTemplate,
  updateHousingTemplate,
  deleteHousingTemplate,
  addHousingTemplateLine,
  deleteHousingTemplateLine,
  type HousingTemplate,
  type HousingTemplateLine,
} from "../api/housingTemplates";
import {
  getItemMasterList,
  getItemRevisions,
  type ItemMasterListItem,
} from "../api/itemMaster";
import { showForbiddenToast } from "../lib/forbiddenToast";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { TrashBinIcon } from "../icons";
import {
  COMMON_CODE_GROUP_USE_STATUS,
  USE_STATUS_CODE_ACTIVE,
  USE_STATUS_CODE_INACTIVE,
  buildUseStatusSelectOptions,
} from "../api/commonCode";

const ITEM_LIST_PAGE_SIZE = 100;
const HOUSING_LINE_ITEM_TYPE_PART = "PART";

async function fetchAllItemsForPicker(
  accessToken: string
): Promise<ItemMasterListItem[]> {
  const out: ItemMasterListItem[] = [];
  let page = 1;
  for (;;) {
    const res = await getItemMasterList(accessToken, {
      page,
      size: ITEM_LIST_PAGE_SIZE,
      itemType: HOUSING_LINE_ITEM_TYPE_PART,
    });
    out.push(...res.items);
    const batch = res.items.length;
    const total = res.total;
    if (batch === 0 || batch < ITEM_LIST_PAGE_SIZE || out.length >= total) {
      break;
    }
    page += 1;
    if (page > 500) break;
  }
  return out;
}

type ItemOption = { value: string; label: string };
type RevisionOption = { value: string; label: string };

function buildSelectStyles(
  isDark: boolean
): StylesConfig<ItemOption | RevisionOption, false, GroupBase<ItemOption>> {
  const bg = isDark ? "#111827" : "#ffffff";
  const border = isDark ? "#374151" : "#d1d5db";
  const text = isDark ? "#f9fafb" : "#111827";
  const muted = isDark ? "#9ca3af" : "#6b7280";
  const hoverBg = isDark ? "#1f2937" : "#f3f4f6";
  const focusRing = "0 0 0 2px rgba(70, 95, 255, 0.25)";

  return {
    container: (base) => ({ ...base, width: "100%" }),
    control: (base, state) => ({
      ...base,
      minHeight: 44,
      fontSize: 14,
      borderRadius: 8,
      backgroundColor: bg,
      borderColor: state.isFocused ? "#465fff" : border,
      boxShadow: state.isFocused ? focusRing : "none",
      "&:hover": { borderColor: state.isFocused ? "#465fff" : border },
    }),
    menu: (base) => ({ ...base, backgroundColor: bg, zIndex: 10001 }),
    menuPortal: (base) => ({ ...base, zIndex: 100020 }),
    menuList: (base) => ({ ...base, padding: 4 }),
    option: (base, state) => ({
      ...base,
      cursor: "pointer",
      backgroundColor: state.isSelected
        ? isDark
          ? "#312e81"
          : "#e0e7ff"
        : state.isFocused
          ? hoverBg
          : "transparent",
      color: text,
    }),
    singleValue: (base) => ({ ...base, color: text }),
    input: (base) => ({ ...base, color: text }),
    placeholder: (base) => ({ ...base, color: muted }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: border }),
    dropdownIndicator: (base) => ({ ...base, color: muted }),
    clearIndicator: (base) => ({ ...base, color: muted }),
  };
}

function AddHousingLineModal({
  isOpen,
  onClose,
  templateId,
  accessToken,
}: {
  isOpen: boolean;
  onClose: () => void;
  templateId: number;
  accessToken: string;
}) {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(() => buildSelectStyles(isDark), [isDark]);

  const [pickedItemId, setPickedItemId] = useState<number | null>(null);
  const [itemOption, setItemOption] = useState<ItemOption | null>(null);
  const [revisionIdPick, setRevisionIdPick] = useState(0);
  const [lineQuantity, setLineQuantity] = useState("1");
  const [lineSortOrder, setLineSortOrder] = useState("");
  const [lineRoleCode, setLineRoleCode] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPickedItemId(null);
    setItemOption(null);
    setRevisionIdPick(0);
    setLineQuantity("1");
    setLineSortOrder("");
    setLineRoleCode("");
  }, [isOpen]);

  const {
    data: allItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ["itemMasterList", "housingTemplateLinePicker"],
    queryFn: () => fetchAllItemsForPicker(accessToken),
    enabled: isOpen && !!accessToken,
    staleTime: 60_000,
  });

  const itemOptions: ItemOption[] = useMemo(
    () =>
      [...allItems]
        .filter(
          (it) =>
            String(it.itemType ?? "").trim().toUpperCase() ===
            HOUSING_LINE_ITEM_TYPE_PART
        )
        .sort((a, b) =>
          a.itemName.localeCompare(b.itemName, "ko", { sensitivity: "base" })
        )
        .map((it) => ({
          value: String(it.id),
          label: `${it.itemName} (${it.itemCode})`,
        })),
    [allItems]
  );

  const { data: revisionsPick = [] } = useQuery({
    queryKey: ["itemRevisions", pickedItemId],
    queryFn: () =>
      getItemRevisions(pickedItemId as number, accessToken),
    enabled: isOpen && pickedItemId != null && pickedItemId > 0,
  });

  const revisionOptions: RevisionOption[] = useMemo(
    () =>
      revisionsPick.map((r) => ({
        value: String(r.id),
        label: `${r.revisionCode} — ${r.revisionName} (#${r.id})`,
      })),
    [revisionsPick]
  );

  const selectedRevision: SingleValue<RevisionOption> = useMemo(() => {
    if (revisionIdPick < 1) return null;
    return (
      revisionOptions.find((o) => o.value === String(revisionIdPick)) ?? null
    );
  }, [revisionIdPick, revisionOptions]);

  const addMutation = useMutation({
    mutationFn: () => {
      const sortRaw = lineSortOrder.trim();
      const sortParsed = sortRaw === "" ? undefined : Number(sortRaw);
      const sortOrder =
        sortParsed != null && Number.isFinite(sortParsed)
          ? sortParsed
          : undefined;
      const qtyRaw = lineQuantity.trim();
      const qtyParsed = qtyRaw === "" ? 1 : Number(qtyRaw);
      const quantity =
        qtyParsed != null && Number.isFinite(qtyParsed) && qtyParsed > 0
          ? qtyParsed
          : 1;
      return addHousingTemplateLine(templateId, accessToken, {
        itemRevisionId: revisionIdPick,
        quantity,
        sortOrder,
        roleCode: lineRoleCode.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("라인을 추가했습니다.");
      queryClient.invalidateQueries({ queryKey: ["housingTemplate", templateId] });
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
      onClose();
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "추가 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "추가에 실패했습니다.");
    },
  });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (revisionIdPick < 1) {
      toast.error("품목과 리비전을 선택하세요.");
      return;
    }
    addMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90vh] max-w-lg overflow-y-auto p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        템플릿 라인 추가
      </h2>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        품목·리비전을 선택하고 수량·정렬·역할 코드를 입력합니다.
      </p>
      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="htl-item">품목 *</Label>
          <div className="mt-1.5">
            <Select<ItemOption, false>
              inputId="htl-item"
              instanceId="htl-item"
              isClearable
              isSearchable
              isDisabled={itemsLoading || itemsError}
              isLoading={itemsLoading}
              options={itemOptions}
              value={itemOption}
              onChange={(opt) => {
                if (!opt) {
                  setItemOption(null);
                  setPickedItemId(null);
                  setRevisionIdPick(0);
                  return;
                }
                setItemOption(opt);
                setPickedItemId(Number(opt.value) || null);
                setRevisionIdPick(0);
              }}
              styles={styles}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              placeholder={
                itemsError
                  ? "품목 목록 오류"
                  : itemsLoading
                    ? "불러오는 중…"
                    : "품목 검색·선택"
              }
              noOptionsMessage={() => "일치하는 품목이 없습니다."}
              filterOption={(option, input) => {
                if (!input) return true;
                const q = input.trim().toLowerCase();
                const labelStr = String(option.label ?? "").toLowerCase();
                const valueStr = String(option.value ?? "").toLowerCase();
                return labelStr.includes(q) || valueStr.includes(q);
              }}
            />
          </div>
        </div>
        <div>
          <Label htmlFor="htl-rev">리비전 *</Label>
          <div className="mt-1.5">
            <Select<RevisionOption, false>
              inputId="htl-rev"
              instanceId="htl-rev"
              isDisabled={!pickedItemId}
              isClearable
              isSearchable
              options={revisionOptions}
              value={selectedRevision}
              onChange={(opt) =>
                setRevisionIdPick(opt ? Number(opt.value) || 0 : 0)
              }
              styles={styles}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              placeholder={
                pickedItemId ? "리비전 검색·선택" : "먼저 품목 선택"
              }
              noOptionsMessage={() => "리비전이 없습니다."}
              filterOption={(option, input) => {
                if (!input) return true;
                const q = input.trim().toLowerCase();
                const labelStr = String(option.label ?? "").toLowerCase();
                const valueStr = String(option.value ?? "").toLowerCase();
                return labelStr.includes(q) || valueStr.includes(q);
              }}
            />
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="htl-qty">수량</Label>
            <Input
              id="htl-qty"
              value={lineQuantity}
              onChange={(e) => setLineQuantity(e.target.value)}
              className="mt-1.5"
              placeholder="1"
            />
          </div>
          <div>
            <Label htmlFor="htl-sort">순서 (sortOrder)</Label>
            <Input
              id="htl-sort"
              value={lineSortOrder}
              onChange={(e) => setLineSortOrder(e.target.value)}
              className="mt-1.5"
              placeholder="비우면 맨 끝"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="htl-role">역할 코드 (roleCode)</Label>
          <Input
            id="htl-role"
            value={lineRoleCode}
            onChange={(e) => setLineRoleCode(e.target.value)}
            className="mt-1.5"
            placeholder="예: FRONT_CASE"
          />
        </div>
        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
          <button
            type="submit"
            disabled={addMutation.isPending || revisionIdPick < 1}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            추가
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            취소
          </button>
        </div>
      </form>
    </Modal>
  );
}

function syncFormFromTemplate(
  t: HousingTemplate,
  setters: {
    setCode: (v: string) => void;
    setName: (v: string) => void;
    setStatus: (v: string) => void;
    setRemark: (v: string) => void;
  }
) {
  setters.setCode(t.templateCode);
  setters.setName(t.templateName);
  setters.setStatus(
    t.isActive ? USE_STATUS_CODE_ACTIVE : USE_STATUS_CODE_INACTIVE
  );
  setters.setRemark(t.remark ?? "");
}

export default function HousingTemplateDetail() {
  const { templateId: templateIdParam } = useParams();
  const tid = Number(templateIdParam);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canReadProducts, canManageProducts } = useProductPermissions();

  const [editCode, setEditCode] = useState("");
  const [editName, setEditName] = useState("");
  const [editStatus, setEditStatus] = useState(USE_STATUS_CODE_ACTIVE);
  const [editRemark, setEditRemark] = useState("");
  const [addLineOpen, setAddLineOpen] = useState(false);

  const {
    data: template,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["housingTemplate", tid],
    queryFn: () => getHousingTemplate(tid, accessToken as string),
    enabled:
      !!accessToken && !isAuthLoading && canReadProducts && Number.isFinite(tid),
  });

  const { data: useStatusCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_USE_STATUS,
    accessToken,
    {
      enabled:
        !!accessToken && !isAuthLoading && canReadProducts && Number.isFinite(tid),
    }
  );

  const statusSelectOptions = useMemo(
    () => buildUseStatusSelectOptions(useStatusCodes, editStatus),
    [useStatusCodes, editStatus]
  );

  useEffect(() => {
    if (!template) return;
    syncFormFromTemplate(template, {
      setCode: setEditCode,
      setName: setEditName,
      setStatus: setEditStatus,
      setRemark: setEditRemark,
    });
  }, [template]);

  const sortedLines = useMemo(() => {
    const lines = template?.lines ?? [];
    return [...lines].sort((a, b) => {
      const sa = a.sortOrder ?? 999999;
      const sb = b.sortOrder ?? 999999;
      if (sa !== sb) return sa - sb;
      return a.id - b.id;
    });
  }, [template?.lines]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateHousingTemplate(tid, accessToken as string, {
        templateCode: editCode.trim(),
        templateName: editName.trim(),
        isActive:
          editStatus.trim().toUpperCase() === USE_STATUS_CODE_ACTIVE,
        remark: editRemark.trim() || null,
      }),
    onSuccess: () => {
      toast.success("저장했습니다.");
      queryClient.invalidateQueries({ queryKey: ["housingTemplate", tid] });
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "수정 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "수정에 실패했습니다.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteHousingTemplate(tid, accessToken as string),
    onSuccess: () => {
      toast.success("삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
      navigate("/housing-templates");
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "삭제 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    },
  });

  const deleteLineMutation = useMutation({
    mutationFn: (lineId: number) =>
      deleteHousingTemplateLine(tid, lineId, accessToken as string),
    onSuccess: () => {
      toast.success("라인을 삭제했습니다.");
      queryClient.invalidateQueries({ queryKey: ["housingTemplate", tid] });
      queryClient.invalidateQueries({ queryKey: ["housingTemplates"] });
    },
    onError: (e: unknown) => {
      if (showForbiddenToast(e, "삭제 권한이 없습니다.")) return;
      toast.error(e instanceof Error ? e.message : "삭제에 실패했습니다.");
    },
  });

  if (!Number.isFinite(tid)) {
    return (
      <>
        <PageMeta title="하우징 템플릿" description="하우징 템플릿 상세" />
        <PageBreadcrumb pageTitle="하우징 템플릿" />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          잘못된 ID입니다.
        </p>
      </>
    );
  }

  if (!canReadProducts) {
    return (
      <>
        <PageMeta title="하우징 템플릿" description="하우징 템플릿 상세" />
        <PageBreadcrumb pageTitle="하우징 템플릿" />
        <PageNotice variant="neutral">
          제품 조회 권한(<code>product.read</code>)이 없습니다.
        </PageNotice>
      </>
    );
  }

  if (isAuthLoading || isLoading) {
    return (
      <>
        <PageMeta title="하우징 템플릿" description="하우징 템플릿 상세" />
        <PageBreadcrumb pageTitle="하우징 템플릿" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message="불러오는 중..." />
        </div>
      </>
    );
  }

  if (error || !template) {
    return (
      <>
        <PageMeta title="하우징 템플릿" description="하우징 템플릿 상세" />
        <PageBreadcrumb pageTitle="하우징 템플릿" />
        <p className="text-sm text-red-600 dark:text-red-400">
          {error instanceof Error
            ? error.message
            : "템플릿을 불러오지 못했습니다."}
        </p>
        <Link
          to="/housing-templates"
          className="mt-4 inline-block text-sm text-brand-600 underline dark:text-brand-400"
        >
          목록으로
        </Link>
      </>
    );
  }

  const t = template;

  return (
    <>
      <PageMeta title={`하우징: ${t.templateName}`} description={`하우징 템플릿 상세`} />
      <PageBreadcrumb pageTitle="하우징 템플릿 상세" />

      <div className="space-y-6">
        <ComponentCard
          title="기본 정보"
          headerEnd={
            canManageProducts && accessToken ? (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (
                      window.confirm(
                        "이 하우징 템플릿을 삭제할까요? 제품 정의에서 참조 중이면 실패할 수 있습니다."
                      )
                    ) {
                      deleteMutation.mutate();
                    }
                  }}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10"
                >
                  삭제
                </button>
              </div>
            ) : null
          }
        >
          <form
            className="max-w-2xl space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (!editCode.trim() || !editName.trim()) {
                toast.error("코드와 이름은 필수입니다.");
                return;
              }
              updateMutation.mutate();
            }}
          >
            <div>
              <Label htmlFor="ht-code">템플릿 코드 *</Label>
              <Input
                id="ht-code"
                value={editCode}
                onChange={(e) => setEditCode(e.target.value)}
                disabled={!canManageProducts}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ht-name">템플릿 이름 *</Label>
              <Input
                id="ht-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={!canManageProducts}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="ht-status">상태</Label>
              <FormSelect
                id="ht-status"
                className="mt-1.5"
                value={editStatus}
                onChange={setEditStatus}
                options={statusSelectOptions}
                disabled={!canManageProducts}
                size="md"
              />
            </div>
            <div>
              <Label>비고</Label>
              <TextArea
                value={editRemark}
                onChange={setEditRemark}
                rows={3}
                disabled={!canManageProducts}
                className="mt-1.5"
              />
            </div>
            {canManageProducts ? (
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
              >
                저장
              </button>
            ) : null}
          </form>
        </ComponentCard>

        <ComponentCard
          title="구성 라인"
          desc="itemRevisionId 기준으로 하우징 부품을 구성합니다."
          headerEnd={
            canManageProducts && accessToken ? (
              <button
                type="button"
                onClick={() => setAddLineOpen(true)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
              >
                라인 추가
              </button>
            ) : null
          }
        >
          {sortedLines.length === 0 ? (
            <p className="text-theme-sm text-gray-500 dark:text-gray-400">
              등록된 라인이 없습니다.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-100 dark:border-white/[0.06]">
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
                      도면
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
                      역할
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
                  {sortedLines.map((row: HousingTemplateLine) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                        {row.sortOrder ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-800 dark:text-white/90">
                        <div className="font-medium">
                          {row.itemCode ? (
                            <code>{row.itemCode}</code>
                          ) : (
                            "—"
                          )}
                        </div>
                        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                          <code>rev #{row.itemRevisionId}</code>
                          {row.revisionCode ? ` · ${row.revisionCode}` : null}
                          {row.revisionName ? ` ${row.revisionName}` : null}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[10rem] truncate px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {row.drawingNo ?? "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm tabular-nums text-gray-600 dark:text-gray-300">
                        {row.quantity}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-sm text-gray-600 dark:text-gray-300">
                        {row.roleCode ?? "—"}
                      </TableCell>
                      {canManageProducts ? (
                        <TableCell className="px-2 py-2 text-center">
                          <button
                            type="button"
                            disabled={deleteLineMutation.isPending}
                            onClick={() => {
                              if (
                                window.confirm("이 라인을 삭제할까요?")
                              ) {
                                deleteLineMutation.mutate(row.id);
                              }
                            }}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                            aria-label="라인 삭제"
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
        <AddHousingLineModal
          isOpen={addLineOpen}
          onClose={() => setAddLineOpen(false)}
          templateId={tid}
          accessToken={accessToken}
        />
      ) : null}
    </>
  );
}
