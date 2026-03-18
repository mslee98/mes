import type { MenuItem } from "../../api/menu";
import ComponentCard from "../common/ComponentCard";
import Checkbox from "../form/input/Checkbox";
import Input from "../form/input/InputField";

export type MenuFormValues = {
  parentId: number | null;
  code: string;
  name: string;
  path: string;
  component: string;
  icon: string;
  sortOrder: number;
  isVisible: boolean;
  isActive: boolean;
};

interface MenuDetailPanelProps {
  selectedMenu: MenuItem | null;
  parentMenu: MenuItem | null;
  depth: number;
  mode: "create" | "edit";
  formValues: MenuFormValues;
  detailErrorMessage?: string | null;
  isDetailLoading: boolean;
  isSaving: boolean;
  isDeleting: boolean;
  isDeleteDisabled?: boolean;
  deleteDisabledMessage?: string | null;
  onChange: <K extends keyof MenuFormValues>(
    key: K,
    value: MenuFormValues[K]
  ) => void;
  onCreateRoot: () => void;
  onCreateChild: () => void;
  onCancelCreate: () => void;
  onSave: () => void;
  onDelete: () => void;
  onMoveToRoot?: () => void;
}

export default function MenuDetailPanel({
  selectedMenu,
  parentMenu,
  depth,
  mode,
  formValues,
  detailErrorMessage,
  isDetailLoading,
  isSaving,
  isDeleting,
  isDeleteDisabled = false,
  deleteDisabledMessage = null,
  onChange,
  onCreateRoot,
  onCreateChild,
  onCancelCreate,
  onSave,
  onDelete,
  onMoveToRoot,
}: MenuDetailPanelProps) {
  const isCreateMode = mode === "create";
  const canDelete = !isCreateMode && !!selectedMenu;
  const canMoveToRoot = !isCreateMode && depth > 0 && !!onMoveToRoot;

  return (
    <div className="space-y-6">
      <ComponentCard
        title="메뉴 작업"
        desc="트리 변경은 자동 저장되며, 여기서 메뉴 생성과 상세 수정 작업을 할 수 있습니다."
      >
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          드래그로 변경한 메뉴 순서와 계층은 즉시 서버에 저장됩니다.
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row flex-wrap">
          <button
            type="button"
            onClick={onCreateRoot}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            최상위 메뉴 추가
          </button>
          <button
            type="button"
            onClick={onCreateChild}
            disabled={!selectedMenu}
            className="inline-flex h-11 items-center justify-center rounded-lg border border-brand-300 px-4 py-2.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-brand-500/30 dark:text-brand-400 dark:hover:bg-brand-500/10"
          >
            하위 메뉴 추가
          </button>
          {canMoveToRoot && (
            <button
              type="button"
              onClick={onMoveToRoot}
              disabled={isSaving}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              최상위로 이동
            </button>
          )}
          {isCreateMode && (
            <button
              type="button"
              onClick={onCancelCreate}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              생성 취소
            </button>
          )}
        </div>
      </ComponentCard>

      <ComponentCard
        title={isCreateMode ? "메뉴 생성" : "메뉴 상세 수정"}
        desc={
          isCreateMode
            ? "새 메뉴 정보를 입력한 뒤 저장하세요."
            : "선택한 메뉴 정보를 수정할 수 있습니다."
        }
      >
        {!isCreateMode && !selectedMenu ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            왼쪽에서 메뉴를 선택해주세요.
          </div>
        ) : isDetailLoading ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            메뉴 상세 정보를 불러오는 중...
          </div>
        ) : detailErrorMessage ? (
          <div className="flex min-h-[320px] items-center justify-center text-sm text-red-600 dark:text-red-400">
            {detailErrorMessage}
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">이름</p>
                <Input
                  value={formValues.name}
                  onChange={(event) => onChange("name", event.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">코드</p>
                <Input
                  value={formValues.code}
                  onChange={(event) => onChange("code", event.target.value)}
                  disabled={!isCreateMode}
                  hint={
                    isCreateMode ? "영문 대문자와 언더스코어 조합을 권장합니다." : "코드는 생성 후 변경하지 않는 것을 권장합니다."
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">경로</p>
                <Input
                  value={formValues.path}
                  placeholder="/report"
                  onChange={(event) => onChange("path", event.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">컴포넌트</p>
                <Input
                  value={formValues.component}
                  placeholder="ReportPage"
                  onChange={(event) => onChange("component", event.target.value)}
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">아이콘</p>
                <Input
                  value={formValues.icon}
                  placeholder="GridIcon"
                  onChange={(event) => onChange("icon", event.target.value)}
                  hint="예: GridIcon, PieChartIcon, WrenchScrewdriverIcon"
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">정렬 순서</p>
                <Input
                  type="number"
                  value={formValues.sortOrder}
                  onChange={(event) =>
                    onChange("sortOrder", Number(event.target.value || 0))
                  }
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">상위 메뉴</p>
                <Input
                  value={parentMenu ? `${parentMenu.name} (${parentMenu.code})` : ""}
                  placeholder="최상위 메뉴"
                  disabled
                />
              </div>
              <div>
                <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">깊이</p>
                <Input value={depth} disabled />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <Checkbox
                  checked={formValues.isVisible}
                  onChange={(checked) => onChange("isVisible", checked)}
                  label="사이드바/화면에 노출"
                />
              </div>
              <div className="rounded-xl border border-gray-200 px-4 py-4 dark:border-gray-800">
                <Checkbox
                  checked={formValues.isActive}
                  onChange={(checked) => onChange("isActive", checked)}
                  label="활성 상태"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <StatBox
                label="하위 메뉴 수"
                value={selectedMenu?.children.length ?? 0}
              />
              <StatBox
                label="상태"
                value={formValues.isActive ? "활성" : "비활성"}
              />
              <StatBox label="ID" value={selectedMenu?.id ?? "-"} />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              {canDelete && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={isDeleting || isDeleteDisabled}
                  className="inline-flex h-11 items-center justify-center rounded-lg border border-error-300 px-4 py-2.5 text-sm font-medium text-error-600 hover:bg-error-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-error-500/30 dark:text-error-400 dark:hover:bg-error-500/10"
                >
                  삭제
                </button>
              )}
              <button
                type="button"
                onClick={onSave}
                disabled={isSaving || !formValues.code.trim() || !formValues.name.trim()}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving ? "저장 중..." : isCreateMode ? "메뉴 생성" : "수정 저장"}
              </button>
            </div>
            {canDelete && deleteDisabledMessage && (
              <p className="text-sm text-error-600 dark:text-error-400">
                {deleteDisabledMessage}
              </p>
            )}
          </div>
        )}
      </ComponentCard>
    </div>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 dark:border-gray-800 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-2 text-base font-semibold text-gray-800 dark:text-white/90">
        {value}
      </p>
    </div>
  );
}
