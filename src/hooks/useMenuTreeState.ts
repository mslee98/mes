import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMenu, type MenuItem } from "../api/menu";
import { notify } from "../lib/notify";
import type { MenuFormValues } from "../components/menu/MenuDetailPanel";
import {
  buildMenuFormValues,
  EMPTY_MENU_FORM,
  getNextMenuSortOrder,
  isSameMenuForm,
} from "../components/menu/menuFormUtils";
import {
  findMenuItem,
  flattenMenuTree,
  moveMenuItemToRoot,
} from "../components/menu/menuTreeUtils";
import { useMenuMutations } from "./useMenuMutations";

const EMPTY_MENUS: MenuItem[] = [];

type UseMenuTreeStateParams = {
  menus: MenuItem[];
  accessToken: string | null | undefined;
  isAuthLoading: boolean;
  refetchMenus: () => Promise<{ data?: MenuItem[] }>;
};

export function useMenuTreeState({
  menus,
  accessToken,
  isAuthLoading,
  refetchMenus,
}: UseMenuTreeStateParams) {
  const queryClient = useQueryClient();
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
    if (mode !== "edit" || !detailMenu) return;
    const nextFormValues = buildMenuFormValues(
      detailMenu,
      selectedFlatItem?.parentId ?? null,
      detailMenu.sortOrder
    );
    setFormValues((currentValues) =>
      isSameMenuForm(currentValues, nextFormValues) ? currentValues : nextFormValues
    );
  }, [detailMenu, mode, selectedFlatItem?.parentId]);

  const syncMenus = async (nextSelectedMenuId?: number | null) => {
    await queryClient.invalidateQueries({ queryKey: ["menus"] });
    const refreshed = await refetchMenus();
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

  const {
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
  } = useMenuMutations({
    accessToken,
    formValues,
    selectedMenuId,
    selectedFlatItemParentId: selectedFlatItem?.parentId,
    syncMenus,
    onCreateSuccess: () => {
      setMode("edit");
      setCreateParentId(null);
    },
    onDeleteSuccess: () => {
      setMode("edit");
      setIsDeleteModalOpen(false);
    },
    setEditableMenuTree,
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
      buildMenuFormValues({}, null, getNextMenuSortOrder(editableMenuTree, null))
    );
  };

  const handleStartCreateChild = () => {
    if (!selectedMenuId) return;
    setMode("create");
    setCreateParentId(selectedMenuId);
    setFormValues(
      buildMenuFormValues(
        {},
        selectedMenuId,
        getNextMenuSortOrder(editableMenuTree, selectedMenuId)
      )
    );
  };

  const handleCancelCreate = () => {
    setMode("edit");
    setCreateParentId(null);
  };

  const handleSave = () => {
    if (!formValues.code.trim() || !formValues.name.trim()) {
      notify.error("코드와 이름은 필수입니다.");
      return;
    }
    if (mode === "create") {
      createMutation.mutate();
      return;
    }
    if (!selectedMenuId) {
      notify.error("수정할 메뉴를 선택해주세요.");
      return;
    }
    updateMutation.mutate();
  };

  const handleDelete = () => {
    if (!selectedMenuId || !selectedMenu) {
      notify.error("삭제할 메뉴를 선택해주세요.");
      return;
    }
    if (isRootMenuWithChildren) {
      notify.error("하위 메뉴가 있어 바로 최상위 메뉴를 삭제할 수 없습니다.");
      return;
    }
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = () => {
    deleteMutation.mutate();
  };

  const handleMoveToRoot = () => {
    if (selectedMenuId == null || flattenedItems.length === 0) return;
    const current = flattenedItems.find((item) => item.id === selectedMenuId);
    if (!current || current.depth === 0) return;
    const nextItems = moveMenuItemToRoot(editableMenuTree, selectedMenuId);
    setEditableMenuTree(nextItems);
    handleSelectMenu(selectedMenuId);
    reorderMutation.mutate({
      menuId: selectedMenuId,
      previousItems: editableMenuTree,
      nextItems,
    });
  };

  const handleReorder = ({
    menuId,
    previousItems,
    nextItems,
  }: {
    menuId: number;
    previousItems: MenuItem[];
    nextItems: MenuItem[];
  }) => {
    reorderMutation.mutate({ menuId, previousItems, nextItems });
  };

  const isTreeDisabled =
    mode === "create" ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    reorderMutation.isPending;

  return {
    editableMenuTree,
    setEditableMenuTree,
    selectedMenuId,
    mode,
    formValues,
    setFormValues,
    isDeleteModalOpen,
    setIsDeleteModalOpen,
    selectedMenu,
    parentMenu,
    depth,
    detailMenu,
    detailError,
    isDetailLoading,
    isRootMenuWithChildren,
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
    isTreeDisabled,
    handleSelectMenu,
    handleStartCreateRoot,
    handleStartCreateChild,
    handleCancelCreate,
    handleSave,
    handleDelete,
    handleConfirmDelete,
    handleMoveToRoot,
    handleReorder,
  };
}
