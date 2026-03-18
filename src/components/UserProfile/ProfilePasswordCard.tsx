import { useState } from "react";
import toast from "react-hot-toast";
import { useMutation } from "@tanstack/react-query";
import { changePassword } from "../../api/user";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import ComponentCard from "../common/ComponentCard";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";

interface ProfilePasswordCardProps {
  userId: number | null;
  accessToken: string | null;
}

export default function ProfilePasswordCard({
  userId,
  accessToken,
}: ProfilePasswordCardProps) {
  const { isOpen, openModal, closeModal } = useModal();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirm, setNewPasswordConfirm] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      changePassword(
        userId!,
        { currentPassword, newPassword },
        accessToken!
      ),
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다.");
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordConfirm("");
      setValidationError(null);
      closeModal();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const canSubmit = !!userId && !!accessToken;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setValidationError(null);

    if (!currentPassword.trim()) {
      setValidationError("현재 비밀번호를 입력해주세요.");
      return;
    }
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

  function handleClose() {
    setCurrentPassword("");
    setNewPassword("");
    setNewPasswordConfirm("");
    setValidationError(null);
    closeModal();
  }

  return (
    <>
      <ComponentCard
        title="비밀번호 변경"
        desc="비밀번호를 변경하려면 아래 버튼을 눌러주세요."
      >
        <Button
          type="button"
          variant="outline"
          size="md"
          onClick={openModal}
          disabled={!canSubmit}
        >
          비밀번호 변경
        </Button>
      </ComponentCard>

      <Modal isOpen={isOpen} onClose={handleClose} className="max-w-md m-4 p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-800 dark:text-white/90">
          비밀번호 변경
        </h3>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          새 비밀번호는 8자 이상 입력해주세요.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div
            className="min-h-6 text-sm text-red-600 dark:text-red-400"
            aria-live="polite"
          >
            {validationError ?? "\u00A0"}
          </div>
          <div>
            <Label htmlFor="modal-current-password">현재 비밀번호</Label>
            <Input
              id="modal-current-password"
              type="password"
              placeholder="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="modal-new-password">새 비밀번호</Label>
            <Input
              id="modal-new-password"
              type="password"
              placeholder="새 비밀번호 (8자 이상)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label htmlFor="modal-new-password-confirm">새 비밀번호 확인</Label>
            <Input
              id="modal-new-password-confirm"
              type="password"
              placeholder="새 비밀번호 다시 입력"
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              disabled={mutation.isPending}
              className="mt-1.5"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!canSubmit || mutation.isPending}
            >
              {mutation.isPending ? "변경 중..." : "변경"}
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
