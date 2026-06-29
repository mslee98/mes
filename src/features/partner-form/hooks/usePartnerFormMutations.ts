import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import {
  createPartner,
  updatePartner,
  type PartnerCreatePayload,
  type PartnerUpdatePayload,
} from "../../../api/purchaseOrder";
import { mutationErrorNotify } from "../../../lib/api/mutationOnError";
import { notify } from "../../../lib/notify";

type UsePartnerFormMutationsParams = {
  isNew: boolean;
  partnerId: string;
  accessToken: string | null | undefined;
};

export function usePartnerFormMutations({
  isNew,
  partnerId,
  accessToken,
}: UsePartnerFormMutationsParams) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (payload: PartnerCreatePayload) =>
      createPartner(payload, accessToken as string),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      notify.success("업체를 등록했습니다.");
      navigate(`/partners/${created.id}`);
    },
    onError: (e) =>
      mutationErrorNotify(e, {
        forbiddenMessage: "업체 등록 권한이 없습니다.",
        fallbackMessage: "등록에 실패했습니다.",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PartnerUpdatePayload) =>
      updatePartner(partnerId, payload, accessToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner", partnerId] });
      notify.success("업체를 수정했습니다.");
      navigate(`/partners/${partnerId}`);
    },
    onError: (e) =>
      mutationErrorNotify(e, {
        forbiddenMessage: "업체 수정 권한이 없습니다.",
        fallbackMessage: "수정에 실패했습니다.",
      }),
  });

  const submitPayload = (payload: PartnerCreatePayload, isActive: boolean) => {
    if (isNew) {
      createMutation.mutate(payload);
      return;
    }
    updateMutation.mutate({ ...payload, isActive });
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return { submitPayload, isPending };
}
