import { useState } from "react";
import { useNavigate } from "react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { getRoles, type RoleItem } from "../../api/role";
import {
  getMenus,
  getRoleMenus,
  updateRoleMenu,
  deleteRoleMenu,
  assignMenuToRole,
  type RoleMenuAssignment,
} from "../../api/menu";
import { flattenMenuTree } from "./menuTreeUtils";
import ComponentCard from "../common/ComponentCard";
import Checkbox from "../form/input/Checkbox";
import ConfirmModal from "../common/ConfirmModal";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

export interface RoleMenuCardProps {
  accessToken: string | null;
}

export default function RoleMenuCard({ accessToken }: RoleMenuCardProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleMenuAssignment | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addMenuCode, setAddMenuCode] = useState("");
  const [addCanView, setAddCanView] = useState(true);

  const { data: menus = [] } = useQuery({
    queryKey: ["menus"],
    queryFn: () => getMenus(accessToken!),
    enabled: !!accessToken,
  });
  const flatMenus = flattenMenuTree(menus);
  const menuOptions = flatMenus.map((m) => ({
    value: m.code,
    label: `${"  ".repeat(m.depth)}${m.name} (${m.code})`,
  }));

  const { data: roles = [] } = useQuery({
    queryKey: ["roles"],
    queryFn: () => getRoles(accessToken!),
    enabled: !!accessToken,
  });

  const { data: roleMenus = [], isLoading: isRoleMenusLoading } = useQuery({
    queryKey: ["roleMenus", selectedRoleId],
    queryFn: () => getRoleMenus(selectedRoleId!, accessToken!),
    enabled: !!accessToken && selectedRoleId != null,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      canView,
    }: { id: number; canView: boolean }) =>
      updateRoleMenu(id, { canView }, accessToken!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleMenus", selectedRoleId] });
      toast.success("조회 권한이 수정되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (roleMenuId: number) => deleteRoleMenu(roleMenuId, accessToken!),
    onSuccess: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ["roleMenus", selectedRoleId] });
      queryClient.invalidateQueries({ queryKey: ["menus"] });
      toast.success("연결이 삭제되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const addMutation = useMutation({
    mutationFn: () =>
      assignMenuToRole(
        selectedRoleId!,
        { menuCode: addMenuCode, canView: addCanView },
        accessToken!
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roleMenus", selectedRoleId] });
      setAddModalOpen(false);
      setAddMenuCode("");
      setAddCanView(true);
      toast.success("메뉴가 연결되었습니다.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const roleList = roles.filter(
    (r): r is RoleItem & { id: number } => r.id != null
  );
  const selectedRole = roleList.find((r) => Number(r.id) === Number(selectedRoleId));
  const alreadyConnectedCodes = new Set(roleMenus.map((rm) => rm.menu?.code).filter(Boolean));
  const availableMenuOptions = menuOptions.filter(
    (opt) => !alreadyConnectedCodes.has(opt.value)
  );

  return (
    <>
      <ComponentCard
        title="역할별 메뉴 연결"
        desc="역할을 선택한 뒤 연결된 메뉴의 조회 권한을 수정하거나 연결을 추가·삭제할 수 있습니다. (권한: role_menu.manage)"
      >
        <div className="flex min-h-[420px] flex-col gap-4 lg:flex-row">
          {/* 좌측: 역할 목록 */}
          <div className="w-full shrink-0 border-r border-gray-200 pr-4 dark:border-gray-800 lg:w-56">
            <p className="mb-2 text-xs font-medium text-gray-500 dark:text-gray-400">
              역할 선택
            </p>
            <ul className="space-y-0.5">
              {roleList.map((role) => {
                const isSelected = Number(role.id) === Number(selectedRoleId);
                return (
                  <li key={String(role.id)}>
                    <button
                      type="button"
                      onClick={() => setSelectedRoleId(Number(role.id))}
                      className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-brand-50 font-medium text-brand-700 dark:bg-brand-500/20 dark:text-brand-300"
                          : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/50"
                      }`}
                    >
                      {role.name ?? role.code ?? `역할 #${role.id}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* 우측: 선택한 역할의 메뉴 연결 목록 */}
          <div className="min-w-0 flex-1">
            {selectedRoleId == null ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  왼쪽에서 역할을 선택하세요
                </p>
              </div>
            ) : isRoleMenusLoading ? (
              <div className="flex h-64 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  메뉴 연결 목록을 불러오는 중...
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90">
                    {selectedRole?.name ?? selectedRole?.code ?? "역할"} — 연결된 메뉴
                  </h4>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAddMenuCode(availableMenuOptions[0]?.value ?? "");
                      setAddModalOpen(true);
                    }}
                    disabled={availableMenuOptions.length === 0}
                  >
                    메뉴 연결 추가
                  </Button>
                </div>
                {roleMenus.length === 0 ? (
                  <div className="flex h-48 items-center justify-center rounded-xl border border-gray-200 dark:border-gray-800">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      연결된 메뉴가 없습니다. &quot;메뉴 연결 추가&quot;로 추가하세요.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-800">
                    <Table>
                      <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                        <TableRow>
                          <TableCell
                            isHeader
                            className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            메뉴
                          </TableCell>
                          <TableCell
                            isHeader
                            className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            코드
                          </TableCell>
                          <TableCell
                            isHeader
                            className="px-4 py-3 text-left text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            조회 권한
                          </TableCell>
                          <TableCell
                            isHeader
                            className="px-4 py-3 text-right text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            관리
                          </TableCell>
                        </TableRow>
                      </TableHeader>
                      <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                        {roleMenus.map((rm) => (
                          <TableRow key={rm.id}>
                            <TableCell className="px-4 py-3 text-sm text-gray-800 dark:text-white/90">
                              {rm.menu?.name ?? `메뉴 #${rm.menuId}`}
                            </TableCell>
                            <TableCell className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                              {rm.menu?.code ?? rm.menuId}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                              <Checkbox
                                checked={rm.canView}
                                onChange={(checked) =>
                                  updateMutation.mutate({
                                    id: rm.id,
                                    canView: checked,
                                  })
                                }
                                disabled={updateMutation.isPending}
                                label=""
                              />
                            </TableCell>
                            <TableCell className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => setDeleteTarget(rm)}
                                disabled={deleteMutation.isPending}
                                className="text-sm font-medium text-error-600 hover:underline dark:text-error-400 disabled:opacity-50"
                              >
                                삭제
                              </button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </ComponentCard>

      {/* 메뉴 연결 추가 모달 */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setAddMenuCode("");
        }}
        className="max-w-md p-6"
      >
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          메뉴 연결 추가
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="add-role-menu-select">메뉴</Label>
            <select
              id="add-role-menu-select"
              value={addMenuCode}
              onChange={(e) => setAddMenuCode(e.target.value)}
              disabled={addMutation.isPending}
              className="mt-1.5 h-11 w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
            >
              <option value="">메뉴 선택</option>
              {availableMenuOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="add-role-menu-canview"
              checked={addCanView}
              onChange={setAddCanView}
              disabled={addMutation.isPending}
              label="조회 권한 (canView)"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="primary"
              size="md"
              disabled={!addMenuCode || addMutation.isPending}
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? "추가 중..." : "추가"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={() => setAddModalOpen(false)}
              disabled={addMutation.isPending}
            >
              취소
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmModal
        isOpen={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        onCloseButtonClick={() => {
          setDeleteTarget(null);
          navigate(-1);
        }}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        title="연결 삭제"
        message={
          deleteTarget
            ? `'${deleteTarget.menu?.name ?? deleteTarget.menuId}' 메뉴와의 연결을 삭제하시겠습니까?`
            : ""
        }
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={deleteMutation.isPending}
      />
    </>
  );
}
