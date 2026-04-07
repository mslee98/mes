import { Link } from "react-router";
import ComponentCard from "../common/ComponentCard";
import Badge from "../ui/badge/Badge";
import type { Delivery } from "../../api/purchaseOrder";

type OrderDetailDeliveriesCardProps = {
  deliveries: Delivery[];
  canRegisterDelivery: boolean;
  onRegisterDeliveryClick: () => void;
  formatDeliveryDate: (s: string | null | undefined) => string;
  deliveryStatusDisplayName: (status: string) => string;
};

export function OrderDetailDeliveriesCard({
  deliveries,
  canRegisterDelivery,
  onRegisterDeliveryClick,
  formatDeliveryDate,
  deliveryStatusDisplayName,
}: OrderDetailDeliveriesCardProps) {
  return (
    <ComponentCard
      title="납품 목록"
      collapsible
      defaultCollapsed={true}
      headerEnd={
        <button
          type="button"
          title={
            canRegisterDelivery
              ? undefined
              : "발주 상태가 종결(PO_CLOSED)일 때만 납품을 등록할 수 있습니다."
          }
          disabled={!canRegisterDelivery}
          onClick={onRegisterDeliveryClick}
          className="rounded-lg border border-brand-500 bg-white px-3 py-1.5 text-sm font-medium text-brand-600 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-brand-600 dark:bg-gray-800 dark:text-brand-400"
        >
          납품 등록
        </button>
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem] flex-1">
          {!canRegisterDelivery ? (
            <p className="text-theme-xs text-amber-700 dark:text-amber-400/90">
              발주가 종결(PO_CLOSED)된 뒤에만 납품을 등록할 수 있습니다.
            </p>
          ) : null}
        </div>
      </div>

      {deliveries.length === 0 ? (
        <p className="text-theme-sm text-gray-500">납품 이력이 없습니다.</p>
      ) : (
        <ul className="space-y-3">
          {deliveries.map((d) => (
            <li
              key={d.id}
              className="rounded-lg border border-gray-100 p-3 dark:border-white/5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/delivery/${d.id}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  {d.title?.trim() || d.deliveryNo || d.id}
                </Link>
                <span className="text-theme-sm text-gray-600 dark:text-gray-400">
                  {formatDeliveryDate(d.deliveryDate)}
                </span>
                {d.status ? (
                  <Badge size="sm" color="primary">
                    {deliveryStatusDisplayName(d.status)}
                  </Badge>
                ) : null}
              </div>
              {d.remark ? (
                <p className="mt-1 text-theme-xs text-gray-500">{d.remark}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </ComponentCard>
  );
}
