import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notify } from "../../lib/notify";
import FormField from "../form/FormField";
import Input from "../form/input/InputField";
import SearchableSelectWithCreate from "../form/SearchableSelectWithCreate";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import { ProductionPlanProcessStageBadge } from "./ProductionPlanProcessStageBadge";
import type { ProductionPlanUnit } from "../../api/purchaseOrder";
import {
  checkProductionPlanUnitDetectorSerial,
  checkProductionPlanUnitLot,
  checkProductionPlanUnitProductSerial,
  updateProductionPlanUnit,
  type UpdateProductionPlanUnitPayload,
} from "../../api/purchaseOrder";
import { invalidateProductionPlanUnitListQueries } from "../../domains/production-plan/queries/invalidateUnitListQueries";
import type { FlatPlanUnitRow } from "../../domains/production-plan/helpers/detailHelpers";
import { validateLegacyProductSerialNo } from "../../domains/production-plan/serial/legacyProductSerialNumber";
import {
  canEditUnitDetectorSerial,
  canEditUnitFieldsBeforeShipment,
  canEditUnitProductSerial,
  validateDetectorSerialInput,
  validateLotUnitCodeInput,
} from "../../domains/production-plan/policy/unitEditPolicy";
import {
  availableCheckHint,
  duplicateCheckMessage,
  fieldCheckBlocksSave,
  fieldCheckToFormFieldProps,
  type UnitFieldCheckState,
} from "../../domains/production-plan/helpers/unitDuplicateCheck";

const OPERATOR_CLEAR_VALUE = "__clear_operator__";

const IDLE_FIELD_CHECK: UnitFieldCheckState = { status: "idle" };

type ProductionPlanUnitEditModalProps = {
  isOpen: boolean;
  onClose: () => void;
  unit: ProductionPlanUnit | null;
  lineLabel?: string;
  flatRow?: FlatPlanUnitRow | null;
  accessToken: string;
  operatorUserOptions: Array<{ value: string; label: string }>;
  onSaved: () => void;
};

function deliveryManagerUserIdFromSelect(selectValue: string): number | null {
  const t = selectValue.trim();
  if (!t || t === OPERATOR_CLEAR_VALUE) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function initialOperatorSelectValue(unit: ProductionPlanUnit): string {
  if (unit.operatorUserId != null && Number.isFinite(Number(unit.operatorUserId))) {
    return String(unit.operatorUserId);
  }
  return "";
}

export function ProductionPlanUnitEditModal({
  isOpen,
  onClose,
  unit,
  lineLabel,
  flatRow,
  accessToken,
  operatorUserOptions,
  onSaved,
}: ProductionPlanUnitEditModalProps) {
  const queryClient = useQueryClient();
  const [unitCode, setUnitCode] = useState("");
  const [operatorSelect, setOperatorSelect] = useState("");
  const [detectorSerialNo, setDetectorSerialNo] = useState("");
  const [productSerialNo, setProductSerialNo] = useState("");
  const [lotCheck, setLotCheck] = useState<UnitFieldCheckState>(IDLE_FIELD_CHECK);
  const [detectorCheck, setDetectorCheck] =
    useState<UnitFieldCheckState>(IDLE_FIELD_CHECK);
  const [productSerialCheck, setProductSerialCheck] =
    useState<UnitFieldCheckState>(IDLE_FIELD_CHECK);

  const lotCheckRequestRef = useRef(0);
  const detectorCheckRequestRef = useRef(0);
  const productSerialCheckRequestRef = useRef(0);

  const initialSnapshot = useMemo(() => {
    if (!unit) return null;
    return {
      unitCode: String(unit.unitCode ?? "").trim(),
      operator: initialOperatorSelectValue(unit),
      detectorSerialNo: String(unit.detectorSerialNo ?? "").trim(),
      productSerialNo: String(unit.serialNo ?? "").trim(),
    };
  }, [unit]);

  useEffect(() => {
    if (!isOpen || !unit) return;
    setUnitCode(String(unit.unitCode ?? "").trim());
    setOperatorSelect(initialOperatorSelectValue(unit));
    setDetectorSerialNo(String(unit.detectorSerialNo ?? "").trim());
    setProductSerialNo(String(unit.serialNo ?? "").trim());
    setLotCheck(IDLE_FIELD_CHECK);
    setDetectorCheck(IDLE_FIELD_CHECK);
    setProductSerialCheck(IDLE_FIELD_CHECK);
    lotCheckRequestRef.current += 1;
    detectorCheckRequestRef.current += 1;
    productSerialCheckRequestRef.current += 1;
  }, [isOpen, unit]);

  const beforeShipment = unit ? canEditUnitFieldsBeforeShipment(unit) : false;
  const canEditDetector = unit ? canEditUnitDetectorSerial(unit) : false;
  const canEditSerial = unit ? canEditUnitProductSerial(unit) : false;
  const excludeUnitId = unit?.id ?? null;

  const runLotDuplicateCheck = useCallback(
    async (code: string) => {
      const requestId = ++lotCheckRequestRef.current;
      const trimmed = code.trim();
      if (!trimmed || trimmed === initialSnapshot?.unitCode) {
        setLotCheck(IDLE_FIELD_CHECK);
        return true;
      }
      const formatErr = validateLotUnitCodeInput(trimmed);
      if (formatErr) {
        setLotCheck({ status: "error", message: formatErr });
        return false;
      }
      setLotCheck({ status: "checking" });
      try {
        const result = await checkProductionPlanUnitLot(accessToken, {
          unitCode: trimmed,
          excludeUnitId,
        });
        if (requestId !== lotCheckRequestRef.current) return false;
        if (!result.available) {
          setLotCheck({
            status: "duplicate",
            message: duplicateCheckMessage("LOT", result.conflicts),
          });
          return false;
        }
        setLotCheck({
          status: "available",
          message: availableCheckHint("LOT"),
        });
        return true;
      } catch (e) {
        if (requestId !== lotCheckRequestRef.current) return false;
        const message =
          e instanceof Error ? e.message : "LOT 중복 조회에 실패했습니다.";
        setLotCheck({ status: "error", message });
        return false;
      }
    },
    [accessToken, excludeUnitId, initialSnapshot?.unitCode]
  );

  const runDetectorDuplicateCheck = useCallback(
    async (value: string) => {
      const requestId = ++detectorCheckRequestRef.current;
      const trimmed = value.trim();
      if (trimmed === (initialSnapshot?.detectorSerialNo ?? "")) {
        setDetectorCheck(IDLE_FIELD_CHECK);
        return true;
      }
      if (!trimmed) {
        setDetectorCheck(IDLE_FIELD_CHECK);
        return true;
      }
      const formatErr = validateDetectorSerialInput(trimmed);
      if (formatErr) {
        setDetectorCheck({ status: "error", message: formatErr });
        return false;
      }
      setDetectorCheck({ status: "checking" });
      try {
        const result = await checkProductionPlanUnitDetectorSerial(accessToken, {
          detectorSerialNo: trimmed,
          excludeUnitId,
        });
        if (requestId !== detectorCheckRequestRef.current) return false;
        if (!result.available) {
          setDetectorCheck({
            status: "duplicate",
            message: duplicateCheckMessage("검출기 S/N", result.conflicts),
          });
          return false;
        }
        setDetectorCheck({
          status: "available",
          message: availableCheckHint("검출기 S/N"),
        });
        return true;
      } catch (e) {
        if (requestId !== detectorCheckRequestRef.current) return false;
        const message =
          e instanceof Error
            ? e.message
            : "검출기 S/N 중복 조회에 실패했습니다.";
        setDetectorCheck({ status: "error", message });
        return false;
      }
    },
    [accessToken, excludeUnitId, initialSnapshot?.detectorSerialNo]
  );

  const runProductSerialDuplicateCheck = useCallback(
    async (value: string) => {
      const requestId = ++productSerialCheckRequestRef.current;
      const trimmed = value.trim();
      if (!trimmed || trimmed === initialSnapshot?.productSerialNo) {
        setProductSerialCheck(IDLE_FIELD_CHECK);
        return true;
      }
      const formatErr = validateLegacyProductSerialNo(trimmed);
      if (formatErr) {
        setProductSerialCheck({ status: "error", message: formatErr });
        return false;
      }
      setProductSerialCheck({ status: "checking" });
      try {
        const result = await checkProductionPlanUnitProductSerial(accessToken, {
          serialNo: trimmed,
          excludeUnitId,
        });
        if (requestId !== productSerialCheckRequestRef.current) return false;
        if (!result.available) {
          setProductSerialCheck({
            status: "duplicate",
            message: duplicateCheckMessage("제품 S/N", result.conflicts),
          });
          return false;
        }
        setProductSerialCheck({
          status: "available",
          message: availableCheckHint("제품 S/N"),
        });
        return true;
      } catch (e) {
        if (requestId !== productSerialCheckRequestRef.current) return false;
        const message =
          e instanceof Error
            ? e.message
            : "제품 S/N 중복 조회에 실패했습니다.";
        setProductSerialCheck({ status: "error", message });
        return false;
      }
    },
    [accessToken, excludeUnitId, initialSnapshot?.productSerialNo]
  );

  const operatorOptionsWithClear = useMemo(() => {
    if (!beforeShipment) return operatorUserOptions;
    return [
      { value: OPERATOR_CLEAR_VALUE, label: "담당자 없음" },
      ...operatorUserOptions,
    ];
  }, [beforeShipment, operatorUserOptions]);

  const lotFieldProps = fieldCheckToFormFieldProps(
    beforeShipment ? lotCheck : IDLE_FIELD_CHECK
  );
  const detectorFieldProps = fieldCheckToFormFieldProps(
    canEditDetector ? detectorCheck : IDLE_FIELD_CHECK
  );
  const productSerialFieldProps = fieldCheckToFormFieldProps(
    canEditSerial ? productSerialCheck : IDLE_FIELD_CHECK
  );

  const saveBlockedByDuplicateCheck =
    (beforeShipment && fieldCheckBlocksSave(lotCheck)) ||
    (canEditDetector && fieldCheckBlocksSave(detectorCheck)) ||
    (canEditSerial && fieldCheckBlocksSave(productSerialCheck));

  const saveMutation = useMutation({
    mutationFn: async (payload: UpdateProductionPlanUnitPayload) => {
      if (!unit) throw new Error("품목 정보가 없습니다.");
      return updateProductionPlanUnit(unit.id, payload, accessToken);
    },
    onSuccess: async () => {
      notify.success("품목 정보가 저장되었습니다.");
      await invalidateProductionPlanUnitListQueries(queryClient);
      if (unit?.id) {
        void queryClient.invalidateQueries({
          queryKey: ["productionPlanUnit", unit.id],
        });
      }
      onSaved();
      onClose();
    },
    onError: (e: Error) => {
      notify.error(e.message || "품목 정보를 저장하지 못했습니다.");
    },
  });

  const handleSubmit = async () => {
    if (!unit || !initialSnapshot) return;

    const payload: UpdateProductionPlanUnitPayload = {};
    const checks: Array<Promise<boolean>> = [];

    if (beforeShipment) {
      const nextCode = unitCode.trim();
      if (nextCode !== initialSnapshot.unitCode) {
        const lotErr = validateLotUnitCodeInput(nextCode);
        if (lotErr) {
          notify.error(lotErr);
          return;
        }
        checks.push(runLotDuplicateCheck(nextCode));
        payload.unitCode = nextCode;
      }

      const nextOperatorId = deliveryManagerUserIdFromSelect(operatorSelect);
      const initialOperatorId = deliveryManagerUserIdFromSelect(
        initialSnapshot.operator
      );
      if (nextOperatorId !== initialOperatorId) {
        payload.operatorUserId = nextOperatorId;
      }

    }

    if (canEditDetector) {
      const nextDetector = detectorSerialNo.trim();
      if (nextDetector !== initialSnapshot.detectorSerialNo) {
        if (!nextDetector) {
          notify.error("등록된 검출기 S/N은 비울 수 없습니다.");
          return;
        }
        const detErr = validateDetectorSerialInput(nextDetector);
        if (detErr) {
          notify.error(detErr);
          return;
        }
        checks.push(runDetectorDuplicateCheck(nextDetector));
        payload.detectorSerialNo = nextDetector;
      }
    }

    if (canEditSerial) {
      const nextSerial = productSerialNo.trim();
      if (nextSerial !== initialSnapshot.productSerialNo) {
        if (!nextSerial) {
          notify.error("등록된 제품 S/N은 비울 수 없습니다.");
          return;
        }
        const serialErr = validateLegacyProductSerialNo(nextSerial);
        if (serialErr) {
          notify.error(serialErr);
          return;
        }
        checks.push(runProductSerialDuplicateCheck(nextSerial));
        payload.serialNo = nextSerial;
        if (flatRow) {
          if (flatRow.detectorElementCode) {
            payload.detectorElementCode = flatRow.detectorElementCode;
          }
          if (flatRow.wavelengthCode) {
            payload.wavelengthCode = flatRow.wavelengthCode;
          }
          if (flatRow.detectorId != null) {
            payload.detectorId = flatRow.detectorId;
          }
        }
      }
    }

    if (Object.keys(payload).length === 0) {
      notify.error("변경된 항목이 없습니다.");
      return;
    }

    if (checks.length > 0) {
      const results = await Promise.all(checks);
      if (results.some((ok) => !ok)) {
        notify.error("중복된 값이 있어 저장할 수 없습니다.");
        return;
      }
    }

    if (saveBlockedByDuplicateCheck) {
      notify.error("중복 확인이 끝난 뒤 저장해 주세요.");
      return;
    }

    saveMutation.mutate(payload);
  };

  const lotTitle = unit?.unitCode?.trim() || unit?.id || "품목";
  const nothingEditable =
    unit != null && !beforeShipment && !canEditSerial && !canEditDetector;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      strictClose={!saveMutation.isPending}
      className="mx-4 max-h-[90vh] max-w-lg overflow-y-auto p-6"
      header={
        <>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            품목 정보 수정
          </h3>
          <p className="mt-0.5 font-mono text-theme-sm text-gray-600 dark:text-gray-400">
            {lotTitle}
          </p>
        </>
      }
    >
      {unit ? (
        <div className="mt-4 space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-theme-sm dark:border-gray-700 dark:bg-white/[0.03]">
            <p className="font-medium text-gray-900 dark:text-white">
              {lineLabel?.trim() || "—"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ProductionPlanProcessStageBadge unit={unit} />
              {unit.isDelivered ? (
                <span className="text-theme-xs text-gray-500 dark:text-gray-400">
                  납품 완료 — LOT·담당은 수정할 수 없습니다. 등록된 검출기·제품
                  S/N은 계속 수정할 수 있습니다.
                </span>
              ) : null}
            </div>
          </div>

          {nothingEditable ? (
            <p className="text-theme-sm text-amber-700 dark:text-amber-400/90">
              수정 가능한 항목이 없습니다. 검출기·제품 S/N은 각각 값이 등록된 경우에만 화면에서 수정할 수 있습니다.
            </p>
          ) : (
            <>
              <FormField
                id="unit-edit-lot"
                label="LOT 번호"
                helpText={
                  beforeShipment
                    ? lotFieldProps.helpText
                    : "납품 완료 이전에만 수정할 수 있습니다."
                }
                helpTone={beforeShipment ? lotFieldProps.helpTone : "default"}
                control={
                  <Input
                    id="unit-edit-lot"
                    type="text"
                    value={unitCode}
                    onChange={(e) => {
                      setUnitCode(e.target.value);
                      if (lotCheck.status !== "idle") {
                        setLotCheck(IDLE_FIELD_CHECK);
                      }
                    }}
                    onBlur={() => {
                      if (beforeShipment) void runLotDuplicateCheck(unitCode);
                    }}
                    disabled={!beforeShipment || saveMutation.isPending}
                    error={beforeShipment ? lotFieldProps.error : false}
                    success={beforeShipment ? lotFieldProps.success : false}
                    className="font-mono"
                    placeholder="LT-yyyyMMdd-…"
                  />
                }
              />

              <FormField
                id="unit-edit-operator"
                label="생산 담당자"
                helpText={
                  beforeShipment
                    ? undefined
                    : "납품 완료 이전에만 수정할 수 있습니다."
                }
                control={
                  <SearchableSelectWithCreate
                    id="unit-edit-operator"
                    value={operatorSelect}
                    onChange={setOperatorSelect}
                    options={operatorOptionsWithClear}
                    placeholder="생산 담당자 선택"
                    noOptionsMessage="표시할 담당자가 없습니다."
                    addTrigger="none"
                    addButtonLabel=""
                    onAddClick={() => {}}
                    isDisabled={!beforeShipment || saveMutation.isPending}
                  />
                }
              />

              <FormField
                id="unit-edit-detector-sn"
                label="검출기 S/N"
                helpText={
                  canEditDetector
                    ? detectorFieldProps.helpText
                    : "검출기 S/N이 등록된 경우에만 수정할 수 있습니다."
                }
                helpTone={
                  canEditDetector ? detectorFieldProps.helpTone : "default"
                }
                control={
                  <Input
                    id="unit-edit-detector-sn"
                    type="text"
                    value={detectorSerialNo}
                    onChange={(e) => {
                      setDetectorSerialNo(e.target.value);
                      if (detectorCheck.status !== "idle") {
                        setDetectorCheck(IDLE_FIELD_CHECK);
                      }
                    }}
                    onBlur={() => {
                      if (canEditDetector) {
                        void runDetectorDuplicateCheck(detectorSerialNo);
                      }
                    }}
                    disabled={!canEditDetector || saveMutation.isPending}
                    error={canEditDetector ? detectorFieldProps.error : false}
                    success={
                      canEditDetector ? detectorFieldProps.success : false
                    }
                    className="font-mono"
                    placeholder="검출기 시리얼"
                    maxLength={100}
                  />
                }
              />

              <FormField
                id="unit-edit-product-sn"
                label="제품 S/N"
                helpText={
                  canEditSerial
                    ? productSerialFieldProps.helpText
                    : "제품 S/N이 등록된 경우에만 수정할 수 있습니다."
                }
                helpTone={
                  canEditSerial ? productSerialFieldProps.helpTone : "default"
                }
                control={
                  <Input
                    id="unit-edit-product-sn"
                    type="text"
                    value={productSerialNo}
                    onChange={(e) => {
                      setProductSerialNo(e.target.value);
                      if (productSerialCheck.status !== "idle") {
                        setProductSerialCheck(IDLE_FIELD_CHECK);
                      }
                    }}
                    onBlur={() => {
                      if (canEditSerial) {
                        void runProductSerialDuplicateCheck(productSerialNo);
                      }
                    }}
                    disabled={!canEditSerial || saveMutation.isPending}
                    error={canEditSerial ? productSerialFieldProps.error : false}
                    success={
                      canEditSerial ? productSerialFieldProps.success : false
                    }
                    className="font-mono"
                    placeholder="접두사+끝 4자리 숫자"
                  />
                }
              />
            </>
          )}
        </div>
      ) : null}

      <div className="mt-6 flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={saveMutation.isPending}
          onClick={onClose}
        >
          취소
        </Button>
        <Button
          type="button"
          variant="primary"
          disabled={
            saveMutation.isPending ||
            !unit ||
            nothingEditable ||
            saveBlockedByDuplicateCheck
          }
          onClick={() => void handleSubmit()}
        >
          {saveMutation.isPending ? "저장 중…" : "저장"}
        </Button>
      </div>
    </Modal>
  );
}
