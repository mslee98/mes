import { Link } from "react-router";
import type { Delivery, DeliveryOrderWithDetail } from "../../api/purchaseOrder";
import type { CommonCodeItem } from "../../api/commonCode";
import ComponentCard from "../common/ComponentCard";
import {
  asDeliveryDetailRecord,
  deliveryLinesFromDelivery,
  formatDeliveryDetailDate,
} from "../../lib/deliveryDetailHelpers";

type DeliveryDetailSummaryTabProps = {
  delivery: Delivery;
  order: DeliveryOrderWithDetail | undefined;
  purchaseOrderId: number | undefined;
  sortedDeliveryStatusCodes: CommonCodeItem[];
  statusName: (code: string | undefined) => string;
};

function attachmentNamesFromUnknown(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const rec = asDeliveryDetailRecord(item);
      if (!rec) return "";
      const directName =
        (typeof rec.fileName === "string" && rec.fileName.trim()) ||
        (typeof rec.name === "string" && rec.name.trim()) ||
        "";
      if (directName) return directName;
      const nestedFile = asDeliveryDetailRecord(rec.file);
      return (typeof nestedFile?.originalName === "string" && nestedFile.originalName.trim()) || "";
    })
    .filter((name) => name.length > 0);
}

function exampleDataForStep(index: number, lastIndex: number) {
  if (index <= 0) {
    return {
      data: ["발주번호/거래처", "요청 납품일", "납품 대상 품목 목록"],
      files: ["요청서 PDF", "초기 품목 명세서"],
    };
  }
  if (index >= lastIndex) {
    return {
      data: ["최종 납품 수량", "납품 완료일", "인수 확인자 정보"],
      files: ["인수 확인서", "최종 납품 리포트"],
    };
  }
  return {
    data: ["진행 단계 상태값", "라인별 확정 수량", "담당자/처리 시각"],
    files: ["검수 체크리스트", "진행 증빙 파일"],
  };
}

export function DeliveryDetailSummaryTab({
  delivery,
  order,
  purchaseOrderId,
  sortedDeliveryStatusCodes,
  statusName,
}: DeliveryDetailSummaryTabProps) {
  const lineCount = deliveryLinesFromDelivery(delivery).length;
  const orderAttachmentNames = attachmentNamesFromUnknown(
    asDeliveryDetailRecord(order as unknown)?.attachments
  );

  return (
    <div className="space-y-6">
      <ComponentCard title="요약">
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">현재 상태</dt>
            <dd className="mt-0.5 font-medium text-gray-900 dark:text-white">
              {statusName(delivery.status)}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">납품일</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">
              {formatDeliveryDetailDate(delivery.deliveryDate)}
            </dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">이번 납품 품목</dt>
            <dd className="mt-0.5 text-gray-800 dark:text-gray-100">{lineCount}건</dd>
          </div>
          <div>
            <dt className="text-theme-xs text-gray-500 dark:text-gray-400">연결 발주</dt>
            <dd className="mt-0.5">
              {purchaseOrderId != null ? (
                <Link
                  to={`/order/${purchaseOrderId}`}
                  className="font-medium text-brand-600 hover:underline dark:text-brand-400"
                >
                  발주 상세 바로가기
                </Link>
              ) : (
                <span className="text-gray-800 dark:text-gray-100">—</span>
              )}
            </dd>
          </div>
        </dl>
      </ComponentCard>

      <ComponentCard title="진행 상태별 데이터/파일 예시" collapsible>
        {sortedDeliveryStatusCodes.length === 0 ? (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            상태 공통코드가 없어서 예시를 표시할 수 없습니다.
          </p>
        ) : (
          <div className="space-y-3">
            {sortedDeliveryStatusCodes.map((code, index) => {
              const displayLabel = (code.name ?? "").trim() || code.code;
              const sample = exampleDataForStep(index, sortedDeliveryStatusCodes.length - 1);
              return (
                <div
                  key={code.id ?? code.code}
                  className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-3 dark:border-white/10 dark:bg-white/[0.03]"
                >
                  <p className="text-theme-sm font-semibold text-gray-900 dark:text-white">
                    {index + 1}. {displayLabel}
                  </p>
                  <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    예시 데이터
                  </p>
                  <p className="text-theme-sm text-gray-700 dark:text-gray-200">
                    {sample.data.join(" · ")}
                  </p>
                  <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                    예시 파일
                  </p>
                  <p className="text-theme-sm text-gray-700 dark:text-gray-200">
                    {sample.files.join(" · ")}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </ComponentCard>

      <ComponentCard title="연결된 실제 첨부 정보" collapsible defaultCollapsed>
        {orderAttachmentNames.length > 0 ? (
          <div className="space-y-1">
            {orderAttachmentNames.slice(0, 10).map((name, index) => (
              <p key={`${name}-${index}`} className="text-theme-sm text-gray-800 dark:text-gray-100">
                {index + 1}. {name}
              </p>
            ))}
          </div>
        ) : (
          <p className="text-theme-sm text-gray-500 dark:text-gray-400">
            발주 응답에서 첨부 정보를 확인하지 못했습니다.
          </p>
        )}
      </ComponentCard>
    </div>
  );
}
