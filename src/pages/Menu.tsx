import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  createMenu,
  deleteMenu,
  getMenu,
  getMenus,
  updateMenu,
  type MenuItem,
  type MenuMutationPayload,
} from "../api/menu";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmModal from "../components/common/ConfirmModal";
import MenuDetailPanel, {
  type MenuFormValues,
} from "../components/menu/MenuDetailPanel";
import MenuTree from "../components/menu/MenuTree";
import { useAuth } from "../context/AuthContext";
import { findMenuItem, flattenMenuTree } from "../components/menu/menuTreeUtils";

const EMPTY_MENUS: MenuItem[] = [];
const EMPTY_MENU_FORM: MenuFormValues = {
  parentId: null,
  code: "",
  name: "",
  path: "",
  component: "",
  icon: "",
  sortOrder: 0,
  isVisible: true,
  isActive: true,
};

type ReorderMutationVariables = {
  menuId: number;
  previousItems: MenuItem[];
  nextItems: MenuItem[];
};

function isSameForm(left: MenuFormValues, right: MenuFormValues) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildMenuFormValues(
  menu: Partial<MenuItem>,
  parentId: number | null,
  sortOrder: number
): MenuFormValues {
  return {
    parentId,
    code: String(menu.code ?? ""),
    name: String(menu.name ?? ""),
    path: typeof menu.path === "string" ? menu.path : "",
    component: typeof menu.component === "string" ? menu.component : "",
    icon: typeof menu.icon === "string" ? menu.icon : "",
    sortOrder: Number(menu.sortOrder ?? sortOrder),
    isVisible: typeof menu.isVisible === "boolean" ? menu.isVisible : true,
    isActive: typeof menu.isActive === "boolean" ? menu.isActive : true,
  };
}

function getNextSortOrder(items: MenuItem[], parentId: number | null) {
  if (parentId == null) {
    return items.length;
  }

  const parentMenu = findMenuItem(items, parentId);
  return parentMenu?.children.length ?? 0;
}

function buildMenuPayload(formValues: MenuFormValues): MenuMutationPayload {
  return {
    parentId: formValues.parentId,
    code: formValues.code.trim(),
    name: formValues.name.trim(),
    path: formValues.path.trim() || null,
    component: formValues.component.trim() || null,
    icon: formValues.icon.trim() || null,
    sortOrder: formValues.sortOrder,
    isVisible: formValues.isVisible,
    isActive: formValues.isActive,
  };
}

function buildMenuUpdatePayload(formValues: MenuFormValues) {
  return {
    name: formValues.name.trim(),
    path: formValues.path.trim() || null,
    component: formValues.component.trim() || null,
    icon: formValues.icon.trim() || null,
    sortOrder: formValues.sortOrder,
    isVisible: formValues.isVisible,
    isActive: formValues.isActive,
  };
}

function getChangedMenuOrders(previousItems: MenuItem[], nextItems: MenuItem[]) {
  const previousFlatItems = flattenMenuTree(previousItems);
  const nextFlatItems = flattenMenuTree(nextItems);

  return nextFlatItems
    .map((nextItem) => {
      const previousItem = previousFlatItems.find((item) => item.id === nextItem.id);

      if (!previousItem) {
        return null;
      }

      if (
        previousItem.parentId === nextItem.parentId &&
        previousItem.sortOrder === nextItem.sortOrder
      ) {
        return null;
      }

      return {
        menuId: nextItem.id,
        parentId: nextItem.parentId,
        sortOrder: nextItem.sortOrder,
      };
    })
    .filter(
      (
        item
      ): item is { menuId: number; parentId: number | null; sortOrder: number } =>
        item !== null
    );
}

export default function Menu() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const queryClient = useQueryClient();
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["menus"],
    queryFn: () => getMenus(accessToken as string),
    enabled: !!accessToken && !isAuthLoading,
  });
  const menus = data ?? EMPTY_MENUS;
  const [editableMenuTree, setEditableMenuTree] = useState<MenuItem[]>([]);
  const [selectedMenuId, setSelectedMenuId] = useState<number | null>(null);
  const [mode, setMode] = useState<"create" | "edit">("edit");
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [formValues, setFormValues] = useState<MenuFormValues>(EMPTY_MENU_FORM);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  useEffect(() => {
    setEditableMenuTree(menus);
  }, [menus]);

  const flattenedItems = useMemo(
    () => flattenMenuTree(editableMenuTree),
    [editableMenuTree]
  );

  useEffect(() => {
    if (flattenedItems.length === 0) {
      setSelectedMenuId(null);
      return;
    }

    if (
      selectedMenuId == null ||
      !flattenedItems.some((item) => item.id === selectedMenuId)
    ) {
      setSelectedMenuId(flattenedItems[0].id);
    }
  }, [flattenedItems, selectedMenuId]);

  const selectedFlatItem =
    selectedMenuId != null
      ? flattenedItems.find((item) => item.id === selectedMenuId) ?? null
      : null;
  const selectedMenu =
    selectedMenuId != null ? findMenuItem(editableMenuTree, selectedMenuId) : null;
  const selectedParentMenu =
    selectedFlatItem?.parentId != null
      ? findMenuItem(editableMenuTree, selectedFlatItem.parentId)
      : null;
  const createParentMenu =
    createParentId != null ? findMenuItem(editableMenuTree, createParentId) : null;
  const parentMenu = mode === "create" ? createParentMenu : selectedParentMenu;
  const depth =
    mode === "create"
      ? createParentId == null
        ? 0
        : (flattenedItems.find((item) => item.id === createParentId)?.depth ?? -1) + 1
      : selectedFlatItem?.depth ?? 0;
  const isRootMenuWithChildren =
    mode === "edit" &&
    depth === 0 &&
    !!selectedMenu &&
    selectedMenu.children.length > 0;
  const {
    data: menuDetailData,
    isLoading: isDetailLoading,
    error: detailError,
  } = useQuery({
    queryKey: ["menu", selectedMenuId],
    queryFn: () => getMenu(selectedMenuId as number, accessToken as string),
    enabled: mode === "edit" && !!selectedMenuId && !!accessToken && !isAuthLoading,
  });
  const detailMenu = mode === "edit" ? menuDetailData ?? selectedMenu : null;

  useEffect(() => {
    if (mode !== "edit" || !detailMenu) {
      return;
    }

    const nextFormValues = buildMenuFormValues(
      detailMenu,
      selectedFlatItem?.parentId ?? null,
      detailMenu.sortOrder
    );
    setFormValues((currentValues) =>
      isSameForm(currentValues, nextFormValues) ? currentValues : nextFormValues
    );
  }, [detailMenu, mode, selectedFlatItem?.parentId]);

  const syncMenus = async (nextSelectedMenuId?: number | null) => {
    await queryClient.invalidateQueries({ queryKey: ["menus"] });
    const refreshed = await refetch();
    const refreshedMenus = refreshed.data ?? EMPTY_MENUS;

    setEditableMenuTree(refreshedMenus);

    if (typeof nextSelectedMenuId === "number") {
      const exists = flattenMenuTree(refreshedMenus).some(
        (item) => item.id === nextSelectedMenuId
      );
      setSelectedMenuId(exists ? nextSelectedMenuId : null);
      return;
    }

    setSelectedMenuId(nextSelectedMenuId ?? null);
  };

  const createMutation = useMutation({
    mutationFn: async () => createMenu(buildMenuPayload(formValues), accessToken as string),
    onSuccess: async (createdMenu) => {
      toast.success("메뉴 생성 성공");
      setMode("edit");
      setCreateParentId(null);
      await syncMenus(createdMenu?.id ?? null);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "메뉴 생성에 실패했습니다."
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () =>
      updateMenu(
        selectedMenuId as number,
        buildMenuUpdatePayload(formValues),
        accessToken as string
      ),
    onSuccess: async (updatedMenu) => {
      toast.success("메뉴 수정 성공");
      await queryClient.invalidateQueries({ queryKey: ["menu", selectedMenuId] });
      await syncMenus(updatedMenu?.id ?? selectedMenuId);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "메뉴 수정에 실패했습니다."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteMenu(selectedMenuId as number, accessToken as string),
    onSuccess: async () => {
      toast.success("메뉴 삭제 성공");
      setMode("edit");
      setIsDeleteModalOpen(false);
      await syncMenus(selectedFlatItem?.parentId ?? null);
    },
    onError: (mutationError) => {
      toast.error(
        mutationError instanceof Error ? mutationError.message : "메뉴 삭제에 실패했습니다."
      );
    },
  });

  const reorderMutation = useMutation({
    mutationFn: async ({
      previousItems,
      nextItems,
    }: ReorderMutationVariables) =>
      Promise.all(
        getChangedMenuOrders(previousItems, nextItems).map((item) =>
          updateMenu(
            item.menuId,
            {
              parentId: item.parentId,
              sortOrder: item.sortOrder,
            },
            accessToken as string
          )
        )
      ),
    onSuccess: async (_, variables) => {
      toast.success("메뉴 순서가 저장되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["menu", variables.menuId] });
      await syncMenus(variables.menuId);
    },
    onError: (mutationError, variables) => {
      toast.error(
        mutationError instanceof Error
          ? mutationError.message
          : "메뉴 순서 저장에 실패했습니다."
      );
      setEditableMenuTree(variables.previousItems);
    },
  });

  const handleSelectMenu = (menuId: number) => {
    setMode("edit");
    setCreateParentId(null);
    setSelectedMenuId(menuId);
  };

  const handleStartCreateRoot = () => {
    setMode("create");
    setCreateParentId(null);
    setFormValues(
      buildMenuFormValues({}, null, getNextSortOrder(editableMenuTree, null))
    );
  };

  const handleStartCreateChild = () => {
    if (!selectedMenuId) {
      return;
    }

    setMode("create");
    setCreateParentId(selectedMenuId);
    setFormValues(
      buildMenuFormValues(
        {},
        selectedMenuId,
        getNextSortOrder(editableMenuTree, selectedMenuId)
      )
    );
  };

  const handleCancelCreate = () => {
    setMode("edit");
    setCreateParentId(null);
  };

  const handleSave = () => {
    if (!formValues.code.trim() || !formValues.name.trim()) {
      toast.error("코드와 이름은 필수입니다.");
      return;
    }

    if (mode === "create") {
      createMutation.mutate();
      return;
    }

    if (!selectedMenuId) {
      toast.error("수정할 메뉴를 선택해주세요.");
      return;
    }

    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (!selectedMenuId || !selectedMenu) {
      toast.error("삭제할 메뉴를 선택해주세요.");
      return;
    }

    if (isRootMenuWithChildren) {
      toast.error("하위 메뉴가 있어 바로 최상위 메뉴를 삭제할 수 없습니다.");
      return;
    }

    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  return (
    <>
      <PageMeta title="메뉴 관리" description="메뉴 관리 페이지" />
      <PageBreadcrumb pageTitle="메뉴 관리" />

      {isAuthLoading || isLoading ? (
        <ComponentCard title="메뉴 관리">
          <div className="flex min-h-[480px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">메뉴 정보를 불러오는 중...</p>
          </div>
        </ComponentCard>
      ) : !accessToken ? (
        <ComponentCard title="메뉴 관리">
          <div className="flex min-h-[480px] items-center justify-center text-gray-500 dark:text-gray-400">
            <p className="text-sm">로그인 후 메뉴 관리 페이지를 사용할 수 있습니다.</p>
          </div>
        </ComponentCard>
      ) : error ? (
        <ComponentCard title="메뉴 관리">
          <div className="flex min-h-[480px] items-center justify-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error instanceof Error
                ? error.message
                : "메뉴 정보를 불러오지 못했습니다."}
            </p>
          </div>
        </ComponentCard>
      ) : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)]">
          <ComponentCard
            title="메뉴 트리"
            desc="드래그해서 정렬 순서와 상하위 관계를 조정할 수 있습니다."
            bodyClassName="p-3 sm:p-4"
            contentClassName="space-y-0"
          >
            <MenuTree
              items={editableMenuTree}
              selectedMenuId={selectedMenuId}
              disabled={
                mode === "create" ||
                createMutation.isPending ||
                updateMutation.isPending ||
                deleteMutation.isPending ||
                reorderMutation.isPending
              }
              onSelectMenu={handleSelectMenu}
              onChangeItems={setEditableMenuTree}
              onMoveMenu={({ menuId, previousItems, nextItems }) => {
                reorderMutation.mutate({
                  menuId,
                  previousItems,
                  nextItems,
                });
              }}
            />
          </ComponentCard>

          <MenuDetailPanel
            selectedMenu={mode === "create" ? null : detailMenu ?? selectedMenu}
            parentMenu={parentMenu}
            depth={depth}
            mode={mode}
            formValues={formValues}
            detailErrorMessage={
              detailError instanceof Error ? detailError.message : null
            }
            isDetailLoading={isDetailLoading}
            isSaving={
              createMutation.isPending ||
              updateMutation.isPending ||
              reorderMutation.isPending
            }
            isDeleting={deleteMutation.isPending || reorderMutation.isPending}
            isDeleteDisabled={isRootMenuWithChildren}
            deleteDisabledMessage={
              isRootMenuWithChildren
                ? "하위 메뉴가 있어 바로 최상위 메뉴를 삭제할 수 없습니다."
                : null
            }
            onChange={(key, value) =>
              setFormValues((currentValues) => ({
                ...currentValues,
                [key]: value,
              }))
            }
            onCreateRoot={handleStartCreateRoot}
            onCreateChild={handleStartCreateChild}
            onCancelCreate={handleCancelCreate}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        </div>
      )}

      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        title="메뉴 삭제"
        message={
          selectedMenu
            ? `'${selectedMenu.name}' 메뉴를 삭제하시겠습니까?`
            : "선택한 메뉴를 삭제하시겠습니까?"
        }
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
      />
    </>
  );
}
