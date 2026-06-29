import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { getMenus } from "../api/menu";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import ConfirmModal from "../components/common/ConfirmModal";
import ListPageLoading from "../components/common/ListPageLoading";
import SegmentedControl from "../components/common/SegmentedControl";
import MenuDetailPanel from "../components/menu/MenuDetailPanel";
import MenuTree from "../components/menu/MenuTree";
import RoleMenuCard from "../components/menu/RoleMenuCard";
import { useAuth } from "../hooks/useAuth";
import { useMenuTreeState } from "../hooks/useMenuTreeState";

const EMPTY_MENUS: never[] = [];

export default function Menu() {
  const navigate = useNavigate();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [menuActiveTab, setMenuActiveTab] = useState<"tree" | "roleMenus">("tree");

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

  const tree = useMenuTreeState({
    menus: data ?? EMPTY_MENUS,
    accessToken,
    isAuthLoading,
    refetchMenus: refetch,
  });

  return (
    <>
      <PageMeta title="메뉴 관리" description="메뉴 관리 페이지" />
      <PageBreadcrumb pageTitle="메뉴 관리" />

      {isAuthLoading || isLoading ? (
        <ComponentCard title="메뉴 관리">
          <ListPageLoading message="메뉴 정보를 불러오는 중..." minHeight={480} />
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
        <>
          <SegmentedControl<"tree" | "roleMenus">
            ariaLabel="메뉴 관리 탭"
            value={menuActiveTab}
            onChange={setMenuActiveTab}
            equalWidth
            className="max-w-md mb-6"
            options={[
              { value: "tree", label: "메뉴 트리" },
              { value: "roleMenus", label: "역할별 메뉴 연결" },
            ]}
          />
          {menuActiveTab === "tree" && (
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)] rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <ComponentCard
                title="메뉴 트리"
                desc="드래그해서 정렬 순서와 상하위 관계를 조정할 수 있습니다."
                className="border-0"
                bodyClassName="p-3 sm:p-4"
                contentClassName="space-y-0"
              >
                <MenuTree
                  items={tree.editableMenuTree}
                  selectedMenuId={tree.selectedMenuId}
                  disabled={tree.isTreeDisabled}
                  onSelectMenu={tree.handleSelectMenu}
                  onChangeItems={tree.setEditableMenuTree}
                  onMoveMenu={tree.handleReorder}
                />
              </ComponentCard>

              <MenuDetailPanel
                selectedMenu={
                  tree.mode === "create" ? null : tree.detailMenu ?? tree.selectedMenu
                }
                parentMenu={tree.parentMenu}
                depth={tree.depth}
                mode={tree.mode}
                formValues={tree.formValues}
                detailErrorMessage={
                  tree.detailError instanceof Error ? tree.detailError.message : null
                }
                isDetailLoading={tree.isDetailLoading}
                isSaving={
                  tree.createMutation.isPending ||
                  tree.updateMutation.isPending ||
                  tree.reorderMutation.isPending
                }
                isDeleting={
                  tree.deleteMutation.isPending || tree.reorderMutation.isPending
                }
                isDeleteDisabled={tree.isRootMenuWithChildren}
                deleteDisabledMessage={
                  tree.isRootMenuWithChildren
                    ? "하위 메뉴가 있어 바로 최상위 메뉴를 삭제할 수 없습니다."
                    : null
                }
                onChange={(key, value) =>
                  tree.setFormValues((currentValues) => ({
                    ...currentValues,
                    [key]: value,
                  }))
                }
                onCreateRoot={tree.handleStartCreateRoot}
                onCreateChild={tree.handleStartCreateChild}
                onCancelCreate={tree.handleCancelCreate}
                onSave={tree.handleSave}
                onDelete={tree.handleDelete}
                onMoveToRoot={tree.handleMoveToRoot}
              />
            </div>
          )}
          {menuActiveTab === "roleMenus" && (
            <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
              <RoleMenuCard accessToken={accessToken} />
            </div>
          )}
        </>
      )}

      <ConfirmModal
        isOpen={tree.isDeleteModalOpen}
        onClose={() => tree.setIsDeleteModalOpen(false)}
        onCloseButtonClick={() => {
          tree.setIsDeleteModalOpen(false);
          navigate(-1);
        }}
        onConfirm={tree.handleConfirmDelete}
        title="메뉴 삭제"
        message={
          tree.selectedMenu
            ? `'${tree.selectedMenu.name}' 메뉴를 삭제하시겠습니까?`
            : "선택한 메뉴를 삭제하시겠습니까?"
        }
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={tree.deleteMutation.isPending}
      />
    </>
  );
}
