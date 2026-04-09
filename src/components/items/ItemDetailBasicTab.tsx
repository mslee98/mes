import { Link } from "react-router";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
import { labelForCommonCode } from "../../api/commonCode";
import {
  ITEM_TYPE_OPTIONS_FALLBACK,
  type ItemMasterDetail,
} from "../../api/itemMaster";
import { ItemDetailDetailRow } from "./ItemDetailDetailRow";
import { formatItemDetailDt } from "../../lib/itemDetailDisplay";

type ItemDetailBasicTabProps = {
  item: ItemMasterDetail;
  itemTypeCodes: { code: string; name?: string; isActive?: boolean }[];
  canManageItems: boolean;
  onEditClick: () => void;
};

export function ItemDetailBasicTab({
  item: i,
  itemTypeCodes,
  canManageItems,
  onEditClick,
}: ItemDetailBasicTabProps) {
  return (
    <ComponentCard title="기본 정보" desc="품목 마스터">
      <dl className="min-w-0 flex-1">
        <ItemDetailDetailRow
          label="품목코드"
          value={
            <code className="rounded bg-gray-200/80 px-1.5 py-0.5 text-theme-xs dark:bg-gray-700 dark:text-gray-100">
              {i.itemCode}
            </code>
          }
        />
        <ItemDetailDetailRow
          label="품목명"
          value={
            <span className="font-medium text-gray-800 dark:text-white/90">
              {i.itemName}
            </span>
          }
        />
        <ItemDetailDetailRow
          label="유형"
          value={
            <span title={i.itemType || undefined}>
              {itemTypeCodes.length
                ? labelForCommonCode(
                    itemTypeCodes.map((codeItem, index) => ({
                      id: index + 1,
                      groupCode: "ITEM_TYPE",
                      code: codeItem.code,
                      name: codeItem.name ?? codeItem.code,
                      description: "",
                      sortOrder: index,
                      isActive: codeItem.isActive ?? true,
                    })),
                    i.itemType
                  )
                : ITEM_TYPE_OPTIONS_FALLBACK.find((o) => o.value === i.itemType)
                    ?.label ??
                  (i.itemType || "-")}
            </span>
          }
        />
        <ItemDetailDetailRow
          label="설명"
          value={
            i.description?.trim() ? (
              <span className="whitespace-pre-wrap text-gray-800 dark:text-white/90">
                {i.description}
              </span>
            ) : (
              "-"
            )
          }
        />
        <ItemDetailDetailRow
          label="사용 여부"
          value={
            <Badge size="sm" color={i.isActive === false ? "error" : "success"}>
              {i.isActive === false ? "미사용" : "사용"}
            </Badge>
          }
        />
        <ItemDetailDetailRow label="등록일" value={formatItemDetailDt(i.createdAt)} />
        <ItemDetailDetailRow label="수정일" value={formatItemDetailDt(i.updatedAt)} />
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-gray-100 pt-4 dark:border-white/5">
        {canManageItems ? (
          <button
            type="button"
            onClick={onEditClick}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 dark:bg-brand-600 dark:hover:bg-brand-500"
          >
            수정
          </button>
        ) : null}
        <Link
          to="/items"
          className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
        >
          목록
        </Link>
      </div>
    </ComponentCard>
  );
}
