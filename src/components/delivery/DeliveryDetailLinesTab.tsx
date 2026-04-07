import { Fragment } from "react";
import { Link } from "react-router";
import type { DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import type { ProductDefinitionDetailDto } from "../../api/products";
import type { HousingTemplate } from "../../api/housingTemplates";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import ComponentCard from "../common/ComponentCard";
import { DeliveryLineCompositionPanel } from "./DeliveryLineCompositionPanel";
import { formatCurrency } from "../../lib/formatCurrency";
import {
  asDeliveryDetailRecord,
  definitionLabelFromOrderItem,
  formatQtyDisplayForDelivery,
  housingTemplateInfoFromOrderItem,
  lineNoteFromOrderItem,
  orderLineQtyFromOrderItem,
  productCodeFromOrderItem,
  productDefinitionIdFromOrderItem,
  productIdFromOrderItem,
  productNameFromOrderItem,
  resolveOrderItemForDeliveryLine,
  unitCodeFromOrderItem,
  unitPriceFromOrderItem,
  currencyFromOrderItem,
} from "../../lib/deliveryDetailHelpers";

type DefinitionQuerySlice = {
  data?: ProductDefinitionDetailDto;
  isLoading: boolean;
  isError: boolean;
};

type TemplateQuerySlice = {
  data?: HousingTemplate;
  isLoading: boolean;
  isError: boolean;
};

type DeliveryDetailLinesTabProps = {
  lines: unknown[];
  order: DeliveryOrderWithDetail | undefined;
  definitionIds: number[];
  templateIds: number[];
  definitionQueries: DefinitionQuerySlice[];
  templateQueries: TemplateQuerySlice[];
  expandedLineKey: string | null;
  onToggleLineKey: (lineKey: string) => void;
  unitLabel: (code: string | undefined) => string;
  orderCurrency: string;
};

export function DeliveryDetailLinesTab({
  lines,
  order,
  definitionIds,
  templateIds,
  definitionQueries,
  templateQueries,
  expandedLineKey,
  onToggleLineKey,
  unitLabel,
  orderCurrency,
}: DeliveryDetailLinesTabProps) {
  return (
    <ComponentCard title="납품 품목">
      {lines.length === 0 ? (
        <p className="text-theme-sm text-gray-500 dark:text-gray-400">등록된 품목이 없습니다.</p>
      ) : (
        <div className="max-w-full overflow-x-auto">
          <p className="mb-3 text-theme-xs text-gray-500 dark:text-gray-400">
            하우징 템플릿·제품 정의 구성은 행의 <strong className="font-medium">구성</strong>에서 펼쳐
            확인할 수 있습니다.
          </p>
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  품목
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  제품 정의
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  하우징 템플릿
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  발주 수량
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  단가
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  이번 납품
                </TableCell>
                <TableCell
                  isHeader
                  className="px-4 py-3 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  비고
                </TableCell>
                <TableCell
                  isHeader
                  className="px-3 py-3 text-center text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                >
                  구성
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {lines.map((line, idx) => {
                const rec = asDeliveryDetailRecord(line);
                const oi = resolveOrderItemForDeliveryLine(line, order);
                const qtyRaw = rec?.quantity ?? rec?.delivery_qty ?? rec?.deliveryQty;
                const pcode = productCodeFromOrderItem(oi);
                const pname = productNameFromOrderItem(oi);
                const productTitle =
                  pcode && pname
                    ? `${pcode} · ${pname}`
                    : pname ||
                      pcode ||
                      (rec?.orderItemId != null ? `품목 #${rec.orderItemId}` : `행 ${idx + 1}`);
                const defLabel = definitionLabelFromOrderItem(oi);
                const defId = productDefinitionIdFromOrderItem(oi);
                const productId = productIdFromOrderItem(oi);
                const htInfo = housingTemplateInfoFromOrderItem(oi);
                const defIdx = defId > 0 ? definitionIds.indexOf(defId) : -1;
                const tplIdx =
                  htInfo && htInfo.id > 0 ? templateIds.indexOf(htInfo.id) : -1;
                const defQ =
                  defIdx >= 0 && defIdx < definitionQueries.length
                    ? definitionQueries[defIdx]
                    : undefined;
                const tplQ =
                  tplIdx >= 0 && tplIdx < templateQueries.length
                    ? templateQueries[tplIdx]
                    : undefined;
                const canExpand = defId > 0 || !!htInfo;
                const lineKey = `${rec?.id ?? "x"}-${rec?.orderItemId ?? idx}-${idx}`;
                const isOpen = expandedLineKey === lineKey;

                const oQty = orderLineQtyFromOrderItem(oi);
                const uCode = unitCodeFromOrderItem(oi);
                const uName = uCode ? unitLabel(uCode) : "";
                const orderQtyCell =
                  oQty != null
                    ? `${oQty}${uName ? ` ${uName}` : uCode ? ` (${uCode})` : ""}`
                    : "—";
                const cur = currencyFromOrderItem(oi) || orderCurrency || "KRW";
                const up = unitPriceFromOrderItem(oi);
                const note = lineNoteFromOrderItem(oi);

                const housingCell =
                  htInfo != null ? (
                    <Link
                      to={`/housing-templates/${htInfo.id}`}
                      className="text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {htInfo.label}
                    </Link>
                  ) : (
                    "—"
                  );

                return (
                  <Fragment key={lineKey}>
                    <TableRow>
                      <TableCell className="max-w-[14rem] px-4 py-3 text-theme-sm text-gray-800 dark:text-gray-200">
                        <span className="font-medium text-gray-900 dark:text-white">
                          {productTitle}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[12rem] px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                        {defId > 0 && productId > 0 ? (
                          <Link
                            to={`/products/${productId}/definitions/${defId}`}
                            className="text-brand-600 hover:underline dark:text-brand-400"
                          >
                            {defLabel}
                          </Link>
                        ) : (
                          defLabel
                        )}
                      </TableCell>
                      <TableCell className="max-w-[11rem] px-4 py-3 text-theme-sm text-gray-600 dark:text-gray-300">
                        {housingCell}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                        {orderQtyCell}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end text-theme-sm text-gray-800 dark:text-gray-200">
                        {up != null ? formatCurrency(up, cur) : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap px-4 py-3 text-end font-medium text-theme-sm text-gray-900 dark:text-white">
                        {formatQtyDisplayForDelivery(qtyRaw)}
                      </TableCell>
                      <TableCell className="max-w-[10rem] px-4 py-3 text-theme-xs text-gray-600 dark:text-gray-300">
                        {note || "—"}
                      </TableCell>
                      <TableCell className="px-2 py-3 text-center">
                        {canExpand ? (
                          <button
                            type="button"
                            onClick={() => onToggleLineKey(lineKey)}
                            className="rounded-md px-2 py-1 text-theme-xs font-medium text-brand-600 hover:bg-brand-50 dark:text-brand-400 dark:hover:bg-brand-500/10"
                          >
                            {isOpen ? "접기" : "펼치기"}
                          </button>
                        ) : (
                          <span className="text-theme-xs text-gray-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && canExpand ? (
                      <TableRow>
                        <TableCell colSpan={8} className="p-0">
                          <DeliveryLineCompositionPanel
                            defId={defId}
                            productId={productId}
                            templateInfo={htInfo}
                            definition={defQ?.data}
                            definitionLoading={defQ?.isLoading ?? false}
                            definitionError={defQ?.isError ?? false}
                            housingDetail={tplQ?.data}
                            housingLoading={tplQ?.isLoading ?? false}
                            housingError={tplQ?.isError ?? false}
                          />
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </ComponentCard>
  );
}
