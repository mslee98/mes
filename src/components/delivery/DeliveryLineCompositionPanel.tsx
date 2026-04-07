import { Link } from "react-router";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import { formatDeliveryLineQty } from "../../lib/deliveryDetailHelpers";
import type {
  ProductDefinitionDetailDto,
  DefinitionItemRevisionLineDto,
} from "../../api/products";
import type { HousingTemplate } from "../../api/housingTemplates";

export function DeliveryLineCompositionPanel({
  defId,
  productId,
  templateInfo,
  definition,
  definitionLoading,
  definitionError,
  housingDetail,
  housingLoading,
  housingError,
}: {
  defId: number;
  productId: number;
  templateInfo: { id: number; label: string } | null;
  definition: ProductDefinitionDetailDto | undefined;
  definitionLoading: boolean;
  definitionError: boolean;
  housingDetail: HousingTemplate | undefined;
  housingLoading: boolean;
  housingError: boolean;
}) {
  const hasDef = defId > 0;
  const hasTpl = templateInfo != null && templateInfo.id > 0;

  return (
    <div className="space-y-5 border-t border-gray-100 bg-gray-50/90 px-4 py-4 dark:border-white/[0.06] dark:bg-white/[0.03]">
      {hasDef ? (
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              제품 정의 구성
            </h4>
            {productId > 0 ? (
              <Link
                to={`/products/${productId}/definitions/${defId}`}
                className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
              >
                정의 상세 →
              </Link>
            ) : null}
          </div>
          {definitionLoading ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              구성 정보를 불러오는 중…
            </p>
          ) : definitionError ? (
            <p className="text-theme-xs text-red-600 dark:text-red-400">
              제품 정의를 불러오지 못했습니다.
            </p>
          ) : !definition ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              정의 데이터가 없습니다.
            </p>
          ) : definition.lines.length === 0 ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              등록된 구성 라인이 없습니다.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      역할
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      리비전
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      비고
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {definition.lines.map((row: DefinitionItemRevisionLineDto) => (
                    <TableRow key={row.id}>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                        {row.itemRole?.trim() || "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                        {row.itemCode?.trim() || row.itemName?.trim()
                          ? [row.itemCode?.trim(), row.itemName?.trim()]
                              .filter(Boolean)
                              .join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                        {row.revisionCode?.trim() || row.revisionName?.trim()
                          ? [row.revisionCode?.trim(), row.revisionName?.trim()]
                              .filter(Boolean)
                              .join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-end text-theme-xs text-gray-800 dark:text-gray-200">
                        {formatDeliveryLineQty(row.quantity)}
                      </TableCell>
                      <TableCell className="max-w-[12rem] px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                        {row.remark?.trim() || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {hasTpl ? (
        <section className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
              하우징 템플릿 · {templateInfo.label}
            </h4>
            <Link
              to={`/housing-templates/${templateInfo.id}`}
              className="text-theme-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
            >
              템플릿 상세 →
            </Link>
          </div>
          {housingLoading ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              템플릿을 불러오는 중…
            </p>
          ) : housingError ? (
            <p className="text-theme-xs text-red-600 dark:text-red-400">
              하우징 템플릿을 불러오지 못했습니다.
            </p>
          ) : !housingDetail ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              템플릿 데이터가 없습니다.
            </p>
          ) : housingDetail.lines.length === 0 ? (
            <p className="text-theme-xs text-gray-500 dark:text-gray-400">
              템플릿 라인이 없습니다.
            </p>
          ) : (
            <div className="max-w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table>
                <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                  <TableRow>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      역할
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      품목
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-start text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      리비전 / 도번
                    </TableCell>
                    <TableCell
                      isHeader
                      className="px-3 py-2 text-end text-theme-xs font-medium text-gray-500 dark:text-gray-400"
                    >
                      수량
                    </TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...housingDetail.lines]
                    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
                    .map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                          {row.roleCode?.trim() || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-800 dark:text-gray-200">
                          {row.itemCode?.trim() || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-theme-xs text-gray-600 dark:text-gray-300">
                          {[row.revisionCode?.trim(), row.revisionName?.trim(), row.drawingNo?.trim()]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </TableCell>
                        <TableCell className="px-3 py-2 text-end text-theme-xs text-gray-800 dark:text-gray-200">
                          {formatDeliveryLineQty(row.quantity)}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>
      ) : null}

      {!hasDef && !hasTpl ? (
        <p className="text-theme-xs text-gray-500 dark:text-gray-400">
          연결된 제품 정의·하우징 템플릿이 없어 구성을 표시할 수 없습니다.
        </p>
      ) : null}
    </div>
  );
}
