import type { UseMutationResult } from "@tanstack/react-query";
import type { ProductionPlanUnit, ProductionPlanUnitDetail, UnitProcessRecord } from "../../../api/purchaseOrder";
import { Modal } from "../../ui/modal";
import DatePicker from "../../form/date-picker";
import Label from "../../form/Label";
import TextArea from "../../form/input/TextArea";
import Button from "../../ui/button/Button";
import { UnitProcessRecordsTimeline } from "../../production-plan/UnitProcessRecordsTimeline";
import { unitDisplayLot } from "../../../domains/production-plan/mappers/unitMappers";

type UnitDetailDeliverModalProps = {
  isOpen: boolean;
  unit: ProductionPlanUnitDetail;
  processUnit: ProductionPlanUnit;
  accessToken: string | null | undefined;
  deliverDate: string;
  onDeliverDateChange: (v: string) => void;
  deliverRemark: string;
  onDeliverRemarkChange: (v: string) => void;
  onClose: () => void;
  deliverMutation: UseMutationResult<unknown, Error, void, unknown>;
  sortedDeliverRecords: UnitProcessRecord[];
  deliverRecordsLoading: boolean;
  unitId: string;
  onUploadAttachments: (recordId: string, files: File[]) => Promise<void>;
  uploadingRecordKey: string | null;
};

export function UnitDetailDeliverModal({
  isOpen,
  unit,
  processUnit,
  accessToken,
  deliverDate,
  onDeliverDateChange,
  deliverRemark,
  onDeliverRemarkChange,
  onClose,
  deliverMutation,
  sortedDeliverRecords,
  deliverRecordsLoading,
  onUploadAttachments,
  uploadingRecordKey,
}: UnitDetailDeliverModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      strictClose
      className="mx-4 max-w-lg p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            납품 등록
          </h3>
          <p className="mt-0.5 font-mono text-theme-sm text-gray-600 dark:text-gray-400">
            {unitDisplayLot(unit)}
          </p>
        </>
      }
    >
      <div className="mt-4">
        <UnitProcessRecordsTimeline
          records={sortedDeliverRecords}
          isLoading={deliverRecordsLoading}
          unit={processUnit}
          accessToken={accessToken ?? null}
          onUploadAttachments={onUploadAttachments}
          uploadingRecordKey={uploadingRecordKey}
        />
      </div>
      <div className="mt-4 space-y-3">
        <DatePicker
          id="unit-deliver-date"
          label="제품 납품일"
          value={deliverDate}
          onValueChange={onDeliverDateChange}
          placeholder="년-월-일"
          required
        />
        <div>
          <Label htmlFor="unit-deliver-remark">비고 (선택)</Label>
          <TextArea
            id="unit-deliver-remark"
            rows={2}
            value={deliverRemark}
            onChange={onDeliverRemarkChange}
            className="mt-1"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          취소
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={deliverMutation.isPending || !deliverDate.trim()}
          onClick={() => deliverMutation.mutate()}
        >
          {deliverMutation.isPending ? "등록 중…" : "납품 등록"}
        </Button>
      </div>
    </Modal>
  );
}
