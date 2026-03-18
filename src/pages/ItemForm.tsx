import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import LoadingLottie from "../components/common/LoadingLottie";
import ConfirmLeaveModal from "../components/common/ConfirmLeaveModal";
import Input from "../components/form/input/InputField";
import Label from "../components/form/Label";
import { useAuth } from "../context/AuthContext";
import { useConfirmLeave } from "../hooks/useConfirmLeave";
import {
  getItem,
  getItemCategories,
  getItemTypes,
  createItem,
  updateItem,
  type Item,
  type ItemCategory,
  type ItemCreatePayload,
} from "../api/items";
import { getCommonCodesByGroup } from "../api/commonCode";
import { getCurrencySymbol } from "../lib/formatCurrency";
import SelectInput from "../components/form/SelectInput";
import { itemFormStrings as S } from "./itemFormStrings";

function flattenCategories(
  nodes: ItemCategory[],
  level = 0
): { category: ItemCategory; level: number }[] {
  const result: { category: ItemCategory; level: number }[] = [];
  for (const c of nodes) {
    result.push({ category: c, level });
    if (c.children?.length) {
      result.push(...flattenCategories(c.children, level + 1));
    }
  }
  return result;
}

const inputClass =
  "mt-1 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-white";

export default function ItemForm() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken } = useAuth();
  const isNew = itemId == null || itemId === "new";
  const id = isNew ? 0 : Number(itemId);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [itemTypeId, setItemTypeId] = useState<string>("");
  const [unit, setUnit] = useState("");
  const [currencyCode, setCurrencyCode] = useState("KRW");
  const [unitPrice, setUnitPrice] = useState<string>("");
  const [spec, setSpec] = useState("");
  const [productDiv, setProductDiv] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: item, isLoading: itemLoading } = useQuery({
    queryKey: ["item", id],
    queryFn: () => getItem(id, accessToken as string),
    enabled: !isNew && !!accessToken && Number.isFinite(id),
  });

  /** Initial snapshot for dirty check (derived from isNew/item at render) */
  const initialSnapshot = useMemo(() => {
    if (isNew)
      return {
        code: "",
        name: "",
        categoryId: "",
        itemTypeId: "",
        unit: "",
        currencyCode: "KRW",
        unitPrice: "",
        spec: "",
        productDiv: "",
        isActive: true,
      };
    if (!item) return null;
    const i = item as Item;
    const unitPriceStr =
      i.unitPrice != null
        ? new Intl.NumberFormat("ko-KR").format(i.unitPrice)
        : "";
    return {
      code: i.code ?? "",
      name: i.name ?? "",
      categoryId: String(i.categoryId ?? ""),
      itemTypeId: String(i.itemTypeId ?? ""),
      unit: i.unit ?? "",
      currencyCode: i.currencyCode ?? "KRW",
      unitPrice: unitPriceStr,
      spec: i.spec ?? "",
      productDiv: i.productDiv ?? "",
      isActive: i.isActive !== false,
    };
  }, [isNew, item]);

  const { data: categoryTree = [] } = useQuery({
    queryKey: ["itemCategories", "tree"],
    queryFn: () => getItemCategories(accessToken as string, { tree: true }),
    enabled: !!accessToken,
  });

  const { data: itemTypes = [] } = useQuery({
    queryKey: ["itemTypes"],
    queryFn: () => getItemTypes(accessToken as string),
    enabled: !!accessToken,
  });

  const { data: unitCodes = [] } = useQuery({
    queryKey: ["commonCodes", "UNIT"],
    queryFn: () => getCommonCodesByGroup("UNIT", accessToken as string),
    enabled: !!accessToken,
  });

  const { data: currencyCodes = [] } = useQuery({
    queryKey: ["commonCodes", "CURRENCY"],
    queryFn: () => getCommonCodesByGroup("CURRENCY", accessToken as string),
    enabled: !!accessToken,
  });

  const categoryOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "", label: S.optionCategory },
    ];
    flattenCategories(categoryTree).forEach(({ category: c, level }) => {
      options.push({
        value: String(c.id),
        label: "\u3000".repeat(level) + (c.name || c.code),
      });
    });
    return options;
  }, [categoryTree]);

  const itemTypeOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "", label: S.optionType },
    ];
    itemTypes.forEach((t) => {
      options.push({ value: String(t.id), label: t.name || t.code || "-" });
    });
    return options;
  }, [itemTypes]);

  const unitOptions = useMemo(() => {
    const options: { value: string; label: string }[] = [
      { value: "", label: S.optionUnit },
    ];
    unitCodes.forEach((c) => {
      options.push({ value: c.code, label: c.name || c.code });
    });
    if (item && !isNew) {
      const i = item as Item;
      const currentUnit = (i.unit ?? "").trim();
      if (currentUnit && !unitCodes.some((c) => c.code === currentUnit)) {
        options.push({ value: currentUnit, label: `${currentUnit} (${S.optionExistingValue})` });
      }
    }
    return options;
  }, [unitCodes, item, isNew]);

  const currencyOptions = useMemo(() => {
    const options: { value: string; label: string; symbol?: string }[] = [];
    currencyCodes.forEach((c) => {
      options.push({
        value: c.code,
        label: c.name || c.code,
        symbol: getCurrencySymbol(c.code),
      });
    });
    if (options.length === 0)
      options.push({ value: "KRW", label: S.currencyKrwLabel, symbol: S.currencyKrwSymbol });
    return options;
  }, [currencyCodes]);

  // Sync form state when item loads from server
  useEffect(() => {
    if (isNew) return;
    if (item) {
      const i = item as Item;
      const unitPriceStr =
        i.unitPrice != null
          ? new Intl.NumberFormat("ko-KR").format(i.unitPrice)
          : "";
      setCode(i.code ?? "");
      setName(i.name ?? "");
      setCategoryId(String(i.categoryId ?? ""));
      setItemTypeId(String(i.itemTypeId ?? ""));
      setUnit(i.unit ?? "");
      setCurrencyCode(i.currencyCode ?? "KRW");
      setUnitPrice(unitPriceStr);
      setSpec(i.spec ?? "");
      setProductDiv(i.productDiv ?? "");
      setIsActive(i.isActive !== false);
    }
  }, [isNew, item]);

  const isDirty = useMemo(() => {
    if (!initialSnapshot) return false;
    return (
      initialSnapshot.code !== code ||
      initialSnapshot.name !== name ||
      initialSnapshot.categoryId !== categoryId ||
      initialSnapshot.itemTypeId !== itemTypeId ||
      initialSnapshot.unit !== unit ||
      initialSnapshot.currencyCode !== currencyCode ||
      initialSnapshot.unitPrice !== unitPrice ||
      initialSnapshot.spec !== spec ||
      initialSnapshot.productDiv !== productDiv ||
      initialSnapshot.isActive !== isActive
    );
  }, [
    initialSnapshot,
    code,
    name,
    categoryId,
    itemTypeId,
    unit,
    currencyCode,
    unitPrice,
    spec,
    productDiv,
    isActive,
  ]);

  const leavePath = isNew ? "/items" : `/items/${id}`;
  const {
    showLeaveModal,
    handleCancelClick,
    handleConfirmLeave,
    closeLeaveModal,
  } = useConfirmLeave(isDirty, () => navigate(leavePath));

  const createMutation = useMutation({
    mutationFn: (payload: ItemCreatePayload) =>
      createItem(payload, accessToken!),
    onSuccess: (data) => {
      toast.success(S.toastCreateSuccess);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      navigate(`/items/${data.id}`);
    },
    onError: (e: Error) => toast.error(e.message || S.toastCreateError),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: ItemCreatePayload) =>
      updateItem(id, payload, accessToken!),
    onSuccess: () => {
      toast.success(S.toastUpdateSuccess);
      queryClient.invalidateQueries({ queryKey: ["items"] });
      queryClient.invalidateQueries({ queryKey: ["item", id] });
      navigate(`/items/${id}`);
    },
    onError: (e: Error) => toast.error(e.message || S.toastUpdateError),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const catId = categoryId ? Number(categoryId) : 0;
    const typeId = itemTypeId ? Number(itemTypeId) : 0;
    if (!code.trim()) {
      toast.error(S.toastCodeRequired);
      return;
    }
    if (!name.trim()) {
      toast.error(S.toastNameRequired);
      return;
    }
    if (!catId) {
      toast.error(S.toastCategoryRequired);
      return;
    }
    if (!typeId) {
      toast.error(S.toastTypeRequired);
      return;
    }
    const payload: ItemCreatePayload = {
      code: code.trim(),
      name: name.trim(),
      categoryId: catId,
      itemTypeId: typeId,
      unit: unit.trim() || null,
      currencyCode: currencyCode || "KRW",
      unitPrice: unitPrice.trim()
        ? Number(unitPrice.replace(/,/g, "")) || null
        : null,
      spec: spec.trim() || null,
      productDiv: productDiv.trim() || null,
      isActive,
    };
    if (isNew) {
      createMutation.mutate(payload);
    } else {
      updateMutation.mutate(payload);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (!isNew && itemLoading && !item) {
    return (
      <>
        <PageMeta title={S.pageTitleEdit} description={S.pageTitleEdit} />
        <PageBreadcrumb pageTitle={S.pageTitleEdit} />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie message={S.loadingMessage} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageMeta
        title={isNew ? S.pageTitleCreate : S.pageTitleEdit}
        description={isNew ? S.pageTitleCreate : S.pageTitleEdit}
      />
      <PageBreadcrumb pageTitle={isNew ? S.pageTitleCreate : S.pageTitleEdit} />

      <div className="space-y-6">
        <ComponentCard
          title={isNew ? S.pageTitleCreate : S.pageTitleEdit}
          desc={S.cardDesc}
        >
          <form
            key={isNew ? "new" : item ? `edit-${(item as Item).id}` : "loading"}
            onSubmit={handleSubmit}
            className="space-y-6"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="item-code">{S.labelCode}</Label>
                <Input
                  id="item-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={S.placeholderCode}
                  className="mt-1"
                  disabled={!isNew}
                />
              </div>
              <div>
                <Label htmlFor="item-name">{S.labelName}</Label>
                <Input
                  id="item-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={S.placeholderName}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="item-category">{S.labelCategory}</Label>
                <select
                  id="item-category"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className={inputClass}
                >
                  {categoryOptions.map((opt) => (
                    <option key={opt.value || "empty"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="item-type">{S.labelType}</Label>
                <select
                  id="item-type"
                  value={itemTypeId}
                  onChange={(e) => setItemTypeId(e.target.value)}
                  className={inputClass}
                >
                  {itemTypeOptions.map((opt) => (
                    <option key={opt.value || "empty"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="item-unit">{S.labelUnit}</Label>
                <select
                  id="item-unit"
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className={inputClass}
                >
                  {unitOptions.map((opt) => (
                    <option key={opt.value || "empty"} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="item-unitPrice">{S.labelPrice}</Label>
                <div className="mt-1">
                  <SelectInput
                    id="item-unitPrice"
                    selectOptions={currencyOptions}
                    selectValue={currencyCode}
                    onSelectChange={setCurrencyCode}
                    inputValue={unitPrice}
                    onInputChange={setUnitPrice}
                    inputPlaceholder="0"
                    selectPlaceholder={S.selectCurrency}
                    formatNumber
                    maxFractionDigits={2}
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="item-spec">{S.labelSpec}</Label>
                <Input
                  id="item-spec"
                  value={spec}
                  onChange={(e) => setSpec(e.target.value)}
                  placeholder={S.placeholderSpec}
                  className="mt-1"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="item-productDiv">{S.labelProductDiv}</Label>
                <Input
                  id="item-productDiv"
                  value={productDiv}
                  onChange={(e) => setProductDiv(e.target.value)}
                  placeholder={S.placeholderProductDiv}
                  className="mt-1"
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <input
                  id="item-active"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                />
                <Label htmlFor="item-active">{S.labelActive}</Label>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
              <button
                type="submit"
                disabled={isPending || (!isNew && !isDirty)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-gray-50 disabled:opacity-50"
              >
                {isPending ? S.buttonSaving : isNew ? S.buttonCreate : S.buttonUpdate}
              </button>
              <button
                type="button"
                onClick={handleCancelClick}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
              >
                {S.buttonCancel}
              </button>
            </div>
          </form>
        </ComponentCard>
      </div>

      <ConfirmLeaveModal
        isOpen={showLeaveModal}
        onClose={closeLeaveModal}
        onConfirm={handleConfirmLeave}
      />
    </>
  );
}