import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { resetUserPassword } from "../../api/user";
import { notify } from "../../lib/notify";
import { useModal } from "../../hooks/useModal";
import ComponentCard from "../common/ComponentCard";
import { Modal } from "../ui/modal";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import Button from "../ui/button/Button";

type UserAdminResetPasswordCardProps = {
  userId: number;
  accessToken: string | null;
  userLabel: string;
};

export default function UserAdminResetPasswordCard({
  userId,
  accessToken,
  userLabel,
}: UserAdminResetPasswordCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [temporary, setTemporary] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  const canSubmit = !!accessToken;

  const mutation = useMutation({
    mutationFn: () =>
      resetUserPassword(
        userId,
        { newPassword, temporary },
        accessToken!
      ),
    onSuccess: () => {
      notify.success("비밀번호가 초기화되었습니다.");
      handleClose();
    },
    onError: (err: Error) => {
      notify.error(err.message);
    },
  });

  function handleClose() {
    setNewPassword("");
    setNewPasswordConfirm("");
    setTemporary(true);
    setValidationError(null);
    closeModal();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!newPassword.trim()) {
      setValidationError("새 비밀번호를 입력해주세요.");
      return;
    }
    if (newPassword.length < 8) {
      setValidationError("새 비밀번호는 8자 이상이어야 합니다.");
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      setValidationError("새 비밀번호가 일치하지 않습니다.");
      return;
    }

    mutation.mutate();
  }

  return (
    <>
      <ComponentCard
        title="비밀번호 초기화"
        desc="Keycloak 계정 비밀번호를 관리자 권한으로 재설정합니다."
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={openModal}
          disabled={!canSubmit}
        >
          비밀번호 초기화
        </Button>
      </ComponentCard>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md m-4 p-6">
        <h3 className="mb-1 text-lg font-semibold text-gray-800 dark:text-white/90">
          비밀번호 초기화
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">{userLabel}</p>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          임시 비밀번호로 설정하면 다음 로그인 시 변경을 요구합니다.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="min-h-6 text-sm text-red-600 dark:text-red-400"
            aria-live="polite"
          >
            {validationError ?? "\u00A0"}
          </div>
          <div>
            <Label htmlFor="admin-reset-new-password">새 비밀번호</Label>
            <Input
              id="admin-reset-new-password"
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="admin-reset-new-password-confirm">새 비밀번호 확인</Label>
            <Input
              id="admin-reset-new-password-confirm"
              type="password"
              placeholder="새 비밀번호 다시 입력"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1.5"
            />
          </div>
          <Checkbox
            id="admin-reset-temporary"
            label="다음 로그인 시 비밀번호 변경 강제 (임시 비밀번호)"
            checked={temporary}
            onChange={setTemporary}
            disabled={mutation.isPending}
          />
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canSubmit || mutation.isPending}
            >
              {mutation.isPending ? "초기화 중..." : "초기화"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              취소
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
