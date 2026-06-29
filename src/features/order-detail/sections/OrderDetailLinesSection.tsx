import { OrderDetailLinesCard } from "../../../components/order/OrderDetailLinesCard";
import type { PurchaseOrderItem } from "../../../api/purchaseOrder";
import type { LineAmountSummary } from "../../../domains/order/helpers/orderLineAmountSummary";

type OrderDetailLinesSectionProps = {
  orderLines: PurchaseOrderItem[];
  defaultCurrencyCode: string;
  orderLineSummaries: LineAmountSummary[];
  registeredQtyByOrderItemId: Map<number, number>;
};

export function OrderDetailLinesSection({
  orderLines,
  defaultCurrencyCode,
  orderLineSummaries,
  registeredQtyByOrderItemId,
}: OrderDetailLinesSectionProps) {
  return (
    <OrderDetailLinesCard
      orderLines={orderLines}
      defaultCurrencyCode={defaultCurrencyCode}
      orderLineSummaries={orderLineSummaries}
      registeredQtyByOrderItemId={registeredQtyByOrderItemId}
      layoutMode="dashboard"
    />
  );
}
