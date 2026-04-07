import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import Select, {
  type GroupBase,
  type SingleValue,
  type StylesConfig,
} from "react-select";
import toast from "react-hot-toast";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import { addProductDefinitionItemRevision } from "../../api/products";
import {
  getItemMasterList,
  getItemRevisions,
  type ItemMasterListItem,
} from "../../api/itemMaster";
import { showForbiddenToast } from "../../lib/forbiddenToast";
import { useTheme } from "../../context/ThemeContext";

/** 품목 목록 API 페이지 크기(상한과 맞춤: `Items` 목록과 동일 계열) */
const ITEM_LIST_PAGE_SIZE = 100;

async function fetchAllItemsForPicker(
  accessToken: string
): Promise<ItemMasterListItem[]> {
  const out: ItemMasterListItem[] = [];
  let page = 1;
  for (;;) {
    const res = await getItemMasterList(accessToken, {
      page,
      size: ITEM_LIST_PAGE_SIZE,
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

type ProductDefinitionAddCompositionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  definitionId: number;
  productId: number;
  accessToken: string;
};

export default function ProductDefinitionAddCompositionModal({
  isOpen,
  onClose,
  definitionId,
  productId,
  accessToken,
}: ProductDefinitionAddCompositionModalProps) {
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const styles = useMemo(() => buildSelectStyles(isDark), [isDark]);

  const [pickedItemId, setPickedItemId] = useState<number | null>(null);
  const [itemOption, setItemOption] = useState<ItemOption | null>(null);
  const [revisionIdPick, setRevisionIdPick] = useState(0);
  const [lineItemRole, setLineItemRole] = useState("");
  const [lineQuantity, setLineQuantity] = useState("");
  const [lineSortOrder, setLineSortOrder] = useState("");
  const [lineIsRequired, setLineIsRequired] = useState(true);
  const [lineRemark, setLineRemark] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setPickedItemId(null);
    setItemOption(null);
    setRevisionIdPick(0);
    setLineItemRole("");
    setLineQuantity("");
    setLineSortOrder("");
    setLineIsRequired(true);
    setLineRemark("");
  }, [isOpen]);

  const {
    data: allItems = [],
    isLoading: itemsLoading,
    isError: itemsError,
  } = useQuery({
    queryKey: ["itemMasterList", "productDefinitionCompositionPicker"],
    queryFn: () => fetchAllItemsForPicker(accessToken),
    enabled: isOpen && !!accessToken,
    staleTime: 60_000,
  });

  const itemOptions: ItemOption[] = useMemo(
    () =>
      [...allItems]
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

  const addLineMutation = useMutation({
    mutationFn: () => {
      const sortRaw = lineSortOrder.trim();
      const sortParsed = sortRaw === "" ? undefined : Number(sortRaw);
      const sortOrder =
        sortParsed != null && Number.isFinite(sortParsed)
          ? sortParsed
          : undefined;
      return addProductDefinitionItemRevision(definitionId, accessToken, {
        itemRevisionId: revisionIdPick,
        itemRole: lineItemRole.trim() || null,
        quantity: lineQuantity.trim() || null,
        sortOrder,
        isRequired: lineIsRequired,
        remark: lineRemark.trim() || null,
      });
    },
    onSuccess: () => {
      toast.success("구성 품목을 추가했습니다.");
      queryClient.invalidateQueries({
        queryKey: ["productDefinition", definitionId],
      });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
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
    if (lineItemRole.trim().toLowerCase() === "housing") {
      toast.error(
        "역할에 HOUSING을 사용할 수 없습니다. 하우징은 제품 정의의 하우징 템플릿에서 지정하세요."
      );
      return;
    }
    addLineMutation.mutate();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      className="max-h-[90vh] max-w-lg overflow-y-auto p-6 sm:p-8"
    >
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
        구성 품목 추가
      </h2>
      <p className="mt-1 text-theme-sm text-gray-500 dark:text-gray-400">
        품목 목록을 연 뒤 입력으로 필터링해 선택합니다. 리비전·수량·역할을
        입력하세요. 하우징은 구성 라인이 아니라 정의 헤더의 하우징 템플릿으로
        연결합니다. 역할에 <code className="text-theme-xs">HOUSING</code>은
        사용할 수 없습니다. 동일 정의에 같은 리비전은 한 번만 등록할 수
        있습니다.
      </p>

      <form onSubmit={onSubmit} className="mt-4 space-y-4">
        <div>
          <Label htmlFor="pdef-add-item">품목 *</Label>
          <div className="mt-1.5">
            <Select<ItemOption, false>
              inputId="pdef-add-item"
              instanceId="pdef-add-item"
              isClearable
              isSearchable
              isDisabled={itemsLoading || itemsError}
              isLoading={itemsLoading}
              options={itemOptions}
              value={itemOption}
              onChange={(opt) => {
                const o = opt;
                if (!o) {
                  setItemOption(null);
                  setPickedItemId(null);
                  setRevisionIdPick(0);
                  return;
                }
                setItemOption(o);
                setPickedItemId(Number(o.value) || null);
                setRevisionIdPick(0);
              }}
              styles={styles}
              menuPortalTarget={
                typeof document !== "undefined" ? document.body : null
              }
              menuPosition="fixed"
              placeholder={
                itemsError
                  ? "품목 목록을 불러오지 못했습니다"
                  : itemsLoading
                    ? "품목 목록 불러오는 중…"
                    : "품목 검색·선택 (▼로 전체 보기)"
              }
              loadingMessage={() => "불러오는 중…"}
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
          {itemsError ? (
            <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
              품목 목록을 다시 불러오려면 모달을 닫았다가 다시 여세요.
            </p>
          ) : null}
          <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
            <Link
              to="/items"
              className="text-brand-600 underline dark:text-brand-400"
            >
              품목 목록
            </Link>
            에서도 확인할 수 있습니다.
          </p>
        </div>

        <div>
          <Label htmlFor="pdef-add-rev">리비전 *</Label>
          <div className="mt-1.5">
            <Select<RevisionOption, false>
              inputId="pdef-add-rev"
              instanceId="pdef-add-rev"
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
                pickedItemId ? "리비전 검색·선택" : "먼저 품목을 선택하세요"
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
            <Label htmlFor="pdef-add-role">역할 (itemRole)</Label>
            <Input
              id="pdef-add-role"
              value={lineItemRole}
              onChange={(e) => setLineItemRole(e.target.value)}
              className="mt-1.5"
              placeholder="HOUSING 사용 불가"
            />
          </div>
          <div>
            <Label htmlFor="pdef-add-qty">수량</Label>
            <Input
              id="pdef-add-qty"
              value={lineQuantity}
              onChange={(e) => setLineQuantity(e.target.value)}
              className="mt-1.5"
              placeholder="숫자 또는 문자열"
            />
          </div>
          <div>
            <Label htmlFor="pdef-add-sort">순서 (sortOrder)</Label>
            <Input
              id="pdef-add-sort"
              value={lineSortOrder}
              onChange={(e) => setLineSortOrder(e.target.value)}
              className="mt-1.5"
              placeholder="비우면 맨 뒤"
            />
          </div>
          <label className="flex cursor-pointer items-center gap-2 pt-6 text-sm text-gray-700 dark:text-gray-300 sm:pt-8">
            <input
              type="checkbox"
              checked={lineIsRequired}
              onChange={(e) => setLineIsRequired(e.target.checked)}
              className="rounded border-gray-300 text-brand-600 dark:border-gray-600"
            />
            필수 구성
          </label>
        </div>

        <div>
          <Label htmlFor="pdef-add-remark">비고</Label>
          <Input
            id="pdef-add-remark"
            value={lineRemark}
            onChange={(e) => setLineRemark(e.target.value)}
            className="mt-1.5"
          />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-gray-100 pt-4 dark:border-white/[0.08]">
          <button
            type="submit"
            disabled={addLineMutation.isPending || revisionIdPick < 1}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 disabled:opacity-50 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            구성에 추가
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
