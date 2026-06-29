import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createMenu,
  deleteMenu,
  updateMenu,
  type MenuItem,
  type MenuMutationPayload,
} from "../api/menu";
import { notify } from "../lib/notify";
import type { MenuFormValues } from "../components/menu/MenuDetailPanel";
import { flattenMenuTree } from "../components/menu/menuTreeUtils";

export type ReorderMutationVariables = {
  menuId: number;
  previousItems: MenuItem[];
  nextItems: MenuItem[];
};

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

type UseMenuMutationsParams = {
  accessToken: string | null | undefined;
  formValues: MenuFormValues;
  selectedMenuId: number | null;
  selectedFlatItemParentId: number | null | undefined;
  syncMenus: (nextSelectedMenuId?: number | null) => Promise<void>;
  onCreateSuccess?: () => void;
  onDeleteSuccess?: () => void;
  setEditableMenuTree: (items: MenuItem[]) => void;
};

export function useMenuMutations({
  accessToken,
  formValues,
  selectedMenuId,
  selectedFlatItemParentId,
  syncMenus,
  onCreateSuccess,
  onDeleteSuccess,
  setEditableMenuTree,
}: UseMenuMutationsParams) {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async () => createMenu(buildMenuPayload(formValues), accessToken as string),
    onSuccess: async (createdMenu) => {
      notify.success("메뉴 생성 성공");
      onCreateSuccess?.();
      await syncMenus(createdMenu?.id ?? null);
    },
    onError: (mutationError) => {
      notify.error(
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
      notify.success("메뉴 수정 성공");
      await queryClient.invalidateQueries({ queryKey: ["menu", selectedMenuId] });
      await syncMenus(updatedMenu?.id ?? selectedMenuId);
    },
    onError: (mutationError) => {
      notify.error(
        mutationError instanceof Error ? mutationError.message : "메뉴 수정에 실패했습니다."
      );
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => deleteMenu(selectedMenuId as number, accessToken as string),
    onSuccess: async () => {
      notify.success("메뉴 삭제 성공");
      onDeleteSuccess?.();
      await syncMenus(selectedFlatItemParentId ?? null);
    },
    onError: (mutationError) => {
      notify.error(
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
      notify.success("메뉴 순서가 저장되었습니다.");
      await queryClient.invalidateQueries({ queryKey: ["menu", variables.menuId] });
      await syncMenus(variables.menuId);
    },
    onError: (mutationError, variables) => {
      notify.error(
        mutationError instanceof Error
          ? mutationError.message
          : "메뉴 순서 저장에 실패했습니다."
      );
      setEditableMenuTree(variables.previousItems);
    },
  });

  return {
    createMutation,
    updateMutation,
    deleteMutation,
    reorderMutation,
  };
}
