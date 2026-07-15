import type {
  ProductionPlan,
  ProductionPlanUnitListItem,
} from "../../../api/purchaseOrder";
import { resolvePartnerForDisplay } from "../../partner/display/partnerDisplay";
import type { FlatPlanUnitRow } from "../helpers/detailHelpers";

export function mapPlanDetailUnitsToListItems(
  plan: ProductionPlan,
  rows: FlatPlanUnitRow[]
): ProductionPlanUnitListItem[] {
  const purchaseOrderId = Number(
    plan.purchaseOrderId ?? plan.purchaseOrder?.id ?? ""
  );
  const orderNo = plan.purchaseOrder?.orderNo ?? null;
  const partner = resolvePartnerForDisplay(
    plan.purchaseOrder?.partner,
    plan.purchaseOrder?.partnerSummary
  );
  const partnerName = partner?.name ?? null;
  const partnerCountryCode = partner?.countryCode ?? null;
  const dueDate =
    plan.purchaseOrder?.dueDate ??
    plan.purchaseOrder?.requestDeliveryDate ??
    null;
  const plannedDate =
    plan.plannedDeliveryDate ?? plan.plannedDate ?? plan.deliveryDate ?? null;
  const orderId = Number.isFinite(purchaseOrderId)
    ? String(purchaseOrderId)
    : String(plan.purchaseOrderId ?? plan.purchaseOrder?.id ?? "").trim() ||
      null;

  return rows.map((row) => {
    const u = row.unit;
    const unitId = String(u.id ?? "").trim();
    return {
      unitId,
      unitCode: u.unitCode ?? null,
      lotPoComposite: u.lotPoComposite ?? null,
      serialNo: u.serialNo ?? null,
      operatorUserId: u.operatorUserId ?? null,
      operatorEmployeeNoSnapshot: u.operatorEmployeeNoSnapshot ?? null,
      operatorNameSnapshot: u.operatorNameSnapshot ?? null,
      operatorAssignedAt: u.operatorAssignedAt ?? null,
      detectorSerialNo: u.detectorSerialNo ?? null,
      currentProcessCode: u.currentProcessCode ?? null,
      processStatus: u.processStatus ?? null,
      qualityStatus: u.qualityStatus ?? null,
      isDeliveryReady: u.isDeliveryReady ?? false,
      isDelivered: u.isDelivered ?? false,
      isInDeliveryPlan: !!(u.isInDeliveryPlan ?? u.deliveryPlanId),
      deliveryPlanId: u.deliveryPlanId ?? null,
      deliveryPlanNo: u.deliveryPlanNo ?? null,
      purchaseOrderId: Number.isFinite(purchaseOrderId) ? purchaseOrderId : null,
      orderNo,
      partnerName,
      partnerCountryCode,
      dueDate,
      order: orderId
        ? {
            orderId,
            orderNo,
            partnerName,
            partnerCountryCode,
          }
        : null,
      plan: {
        planId: plan.id,
        planNo: plan.planNo ?? null,
        planSeq: plan.planSeq ?? null,
        plannedDate,
        deliveryDate: plan.deliveryDate ?? null,
        status: plan.status ?? null,
      },
      item: {
        purchaseOrderItemId: row.purchaseOrderItemId ?? null,
        productNameSnapshot: row.orderLine.productNameSnapshot ?? null,
        businessNameSnapshot:
          row.businessNameSnapshot ?? row.orderLine.businessNameSnapshot ?? null,
      },
      productionManager: plan.productionManager?.name
        ? {
            name: plan.productionManager.name,
            department: plan.productionManagerDepartment ?? null,
          }
        : null,
      partner: partner
        ? {
            name: partnerName,
            countryCode: partnerCountryCode,
            code: partner?.code ?? null,
          }
        : null,
    } as ProductionPlanUnitListItem;
  });
}
