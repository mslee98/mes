import { OrderDetailProductionPlansCard } from "../../../components/order/OrderDetailProductionPlansCard";

type OrderDetailProductionSectionProps = {
  purchaseOrderId: string;
  accessToken: string;
  isAuthLoading: boolean;
  canCreate: boolean;
  onOpenPlanModal: () => void;
};

export function OrderDetailProductionSection({
  purchaseOrderId,
  accessToken,
  isAuthLoading,
  canCreate,
  onOpenPlanModal,
}: OrderDetailProductionSectionProps) {
  return (
    <OrderDetailProductionPlansCard
      purchaseOrderId={purchaseOrderId}
      accessToken={accessToken}
      isAuthLoading={isAuthLoading}
      canCreate={canCreate}
      onOpenPlanModal={onOpenPlanModal}
      hideHeaderCreateButton
      visualVariant="dashboard"
    />
  );
}
