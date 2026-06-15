import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import Select from "../components/form/Select";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import SerialLotLookupModal from "../components/unit/SerialLotLookupModal";
import Badge from "../components/ui/badge/Badge";
import { useAuth } from "../hooks/useAuth";
import { useRmaCommonCodes } from "../hooks/useRmaCommonCodes";
import { useRmaPermissions } from "../hooks/useRmaPermissions";
import { commonCodesToSelectOptions, labelForCommonCode } from "../api/commonCode";
import {
  createRmaRequest,
  getRmaRequests,
  type CreateRmaRequestPayload,
  type SearchRmaTargetUnitItem,
} from "../api/rma";
import { getProductionPlanUnitById } from "../api/purchaseOrder";
import type { ProductionPlanUnitDetail } from "../api/purchaseOrder";
import { validateRequiredFields } from "../lib/formValidation";
import { formatDateYmd, localYmdToday } from "../lib/format/dateFormat";
import { notify } from "../lib/notify";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function searchItemFromUnitDetail(
  detail: ProductionPlanUnitDetail
): SearchRmaTargetUnitItem {
  return {
    productionPlanUnitId: String(detail.unitId ?? "").trim(),
    unitCode: detail.unitCode ?? null,
    productSerialNo: detail.serialNo ?? null,
    detectorSerialNo: detail.detectorSerialNo ?? null,
    partnerName: detail.partner?.name ?? detail.order?.partnerName ?? null,
    isDelivered: detail.isDelivered === true,
    deliveredAt: detail.deliveredAt ?? null,
    rmaCount: detail.rmaCount ?? null,
  };
}

function selectOptionsWithPlaceholder(
  options: Array<{ value: string; label: string }>,
  placeholder: string
) {
  if (options.length === 0) {
    return [{ value: "", label: placeholder }];
  }
  return [{ value: "", label: "선택" }, ...options];
}

export default function RmaRegisterForm() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const presetUnitId = toText(searchParams.get("unitId"));
  const queryClient = useQueryClient();
  const { accessToken, user, isLoading: isAuthLoading } = useAuth();
  const { canCreateRma, canReadRma } = useRmaPermissions();

  const [lookupOpen, setLookupOpen] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState<SearchRmaTargetUnitItem | null>(null);

  const { data: presetUnitItem } = useQuery({
    queryKey: ["productionPlanUnit", presetUnitId, "rmaRegisterPreset"],
    queryFn: async () => {
      const detail = await getProductionPlanUnitById(accessToken!, presetUnitId);
      return searchItemFromUnitDetail(detail);
    },
    enabled:
      !!accessToken &&
      !isAuthLoading &&
      !!presetUnitId &&
      !selectedUnit &&
      canReadRma,
  });

  useEffect(() => {
    if (presetUnitItem && !selectedUnit) {
      setSelectedUnit(presetUnitItem);
    }
  }, [presetUnitItem, selectedUnit]);

  const [receivedAt, setReceivedAt] = useState(localYmdToday());
  const [requestContent, setRequestContent] = useState("");
  const [rmaCategoryCode, setRmaCategoryCode] = useState("");
  const [asTypeCode, setAsTypeCode] = useState("");
  const [symptomCode, setSymptomCode] = useState("");
  const [returnRequiredYn, setReturnRequiredYn] = useState(false);
  const [returnType, setReturnType] = useState("");
  const [returnExpectedAt, setReturnExpectedAt] = useState("");

  const {
    rmaCategoryCodes,
    rmaAsTypeCodes,
    rmaSymptomCodes,
    rmaReturnTypeCodes,
  } = useRmaCommonCodes(accessToken, !isAuthLoading);

  /** 목록·메뉴에서 진입할 때만 조회 모달 자동 오픈. `?unitId=` 프리셋(생산·납품 현황 등)은 대상이 이미 정해짐. */
  useEffect(() => {
    if (presetUnitId) return;
    if (canCreateRma && canReadRma && !selectedUnit) {
      setLookupOpen(true);
    }
  }, [canCreateRma, canReadRma, selectedUnit, presetUnitId]);

  const unitId = toText(selectedUnit?.productionPlanUnitId);

  const { data: existingRmaList } = useQuery({
    queryKey: ["rmaRequestsByUnit", unitId],
    queryFn: () =>
      getRmaRequests(accessToken!, {
        productionPlanUnitId: unitId,
        page: 1,
        pageSize: 5,
      }),
    enabled: !!accessToken && !isAuthLoading && Boolean(unitId),
  });

  const existingRmaCount = Number(existingRmaList?.total) || 0;
  const existingRmaItems = existingRmaList?.items ?? [];

  const registrantDisplay = user
    ? user.name
      ? `${user.name} (사번 ${user.employeeNo})`
      : `사번 ${user.employeeNo}`
    : "—";

  const createMutation = useMutation({
    mutationFn: (payload: CreateRmaRequestPayload) =>
      createRmaRequest(accessToken!, payload),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["rmaRequests"] });
      await queryClient.invalidateQueries({ queryKey: ["rmaTabCounts"] });
      await queryClient.invalidateQueries({ queryKey: ["rmaRequestsByUnit"] });
      const rmaNo = toText(created.rmaNo) || `#${created.id}`;
      notify.success(`RMA가 접수되었습니다. (${rmaNo})`);
      const unitIdForNav = toText(created.productionPlanUnitId) || unitId;
      const createdId = Number(created.id);
      if (unitIdForNav && Number.isFinite(createdId) && createdId > 0) {
        navigate(
          `/delivery/units/${unitIdForNav}?tab=rma&rmaId=${createdId}`,
          { replace: true }
        );
        return;
      }
      if (unitIdForNav) {
        navigate(`/delivery/units/${unitIdForNav}?tab=rma`, { replace: true });
        return;
      }
      navigate("/rma", { replace: true });
    },
    onError: () => notify.error("RMA 접수 등록에 실패했습니다."),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedUnit?.productionPlanUnitId) {
      notify.error("RMA를 접수할 제품을 선택해 주세요.");
      return;
    }
    if (selectedUnit.isDelivered === false) {
      notify.error("아직 납품 완료되지 않은 제품입니다. RMA 접수할 수 없습니다.");
      return;
    }

    const isValid = validateRequiredFields(
      [
        { value: requestContent, message: "요청 내용을 입력해 주세요." },
        { value: receivedAt, message: "접수일을 선택해 주세요." },
      ],
      (message) => notify.error(message)
    );
    if (!isValid) return;

    createMutation.mutate({
      productionPlanUnitId: unitId,
      requestContent: requestContent.trim(),
      receivedAt: receivedAt.trim(),
      rmaCategoryCode: rmaCategoryCode.trim() || undefined,
      asTypeCode: asTypeCode.trim() || undefined,
      symptomCode: symptomCode.trim() || undefined,
      returnRequiredYn,
      returnType: returnRequiredYn ? returnType.trim() || undefined : undefined,
      returnExpectedAt:
        returnRequiredYn && returnExpectedAt.trim() ? returnExpectedAt.trim() : undefined,
    });
  };

  const selectedSummary = useMemo(() => {
    if (!selectedUnit) return null;
    return {
      unitCode: toText(selectedUnit.unitCode) || "-",
      productSerial: toText(selectedUnit.productSerialNo) || "-",
      engineSerial: toText(selectedUnit.engineSerialNo) || "-",
      iddcaSerial: toText(selectedUnit.detectorSerialNo) || "-",
      partner: toText(selectedUnit.partnerName) || "-",
      deliveredAt: formatDateYmd(selectedUnit.deliveredAt),
    };
  }, [selectedUnit]);

  if (!canCreateRma) {
    return (
      <>
        <PageMeta title="RMA 접수" description="RMA 접수 등록" />
        <PageBreadcrumb pageTitle="RMA 접수" />
        <ComponentCard title="권한 없음">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            RMA 접수 권한(rma.create)이 없습니다.
          </p>
          <Link
            to="/rma"
            className="mt-4 inline-flex rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
          >
            목록으로
          </Link>
        </ComponentCard>
      </>
    );
  }

  return (
    <>
      <PageMeta title="아이쓰리시스템(주) | RMA 접수" description="RMA 접수 등록" />
      <PageBreadcrumb pageTitle="RMA 접수" />

      <form className="space-y-6" onSubmit={handleSubmit}>
        <ComponentCard title="접수 대상 제품">
          {selectedUnit && selectedSummary ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">관리 코드 (LOT)</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.unitCode}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">제품 S/N</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.productSerial}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">엔진 S/N</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.engineSerial}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">IDDCA S/N</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.iddcaSerial}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">거래처</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.partner}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">납품일</p>
                  <p className="mt-1 text-sm font-medium text-gray-900 dark:text-white">
                    {selectedSummary.deliveredAt}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Badge size="sm" color="success">
                  납품 완료
                </Badge>
                {existingRmaCount > 0 ? (
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    이 제품은 과거 RMA {existingRmaCount}건이 있습니다.{" "}
                    {existingRmaItems.slice(0, 3).map((item) => (
                      <Link
                        key={item.id}
                        to={`/delivery/units/${unitId}?tab=rma&rmaId=${item.id}`}
                        className="mr-2 underline hover:text-brand-600"
                      >
                        {toText(item.rmaNo) || `#${item.id}`}
                      </Link>
                    ))}
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              시리얼/LOT 조회에서 납품 완료된 제품 1대를 선택하세요.
            </p>
          )}

          {canReadRma ? (
            <button
              type="button"
              onClick={() => setLookupOpen(true)}
              className="mt-4 rounded-lg border border-brand-300 bg-brand-50 px-4 py-2 text-sm font-medium text-brand-700 hover:bg-brand-100 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
            >
              {selectedUnit ? "다른 제품 선택" : "시리얼/LOT 조회"}
            </button>
          ) : null}
        </ComponentCard>

        <ComponentCard title="RMA 접수 정보">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="rma-no-display">RMA 번호</Label>
              <Input id="rma-no-display" value="자동 채번" readOnly disabled className="mt-1" />
            </div>
            <div>
              <Label htmlFor="rma-registrant">등록자</Label>
              <Input
                id="rma-registrant"
                value={registrantDisplay}
                readOnly
                disabled
                className="mt-1"
              />
            </div>

            <DatePicker
              id="rma-received-at"
              label="접수일"
              required
              placeholder="년-월-일"
              value={receivedAt}
              onValueChange={setReceivedAt}
            />

            <div>
              <Label htmlFor="rma-category">RMA 구분</Label>
              <div className="mt-1">
                <Select
                  id="rma-category"
                  options={selectOptionsWithPlaceholder(
                    commonCodesToSelectOptions(rmaCategoryCodes),
                    "공통코드 없음"
                  )}
                  value={rmaCategoryCode}
                  onChange={setRmaCategoryCode}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rma-as-type">A/S 분류</Label>
              <div className="mt-1">
                <Select
                  id="rma-as-type"
                  options={selectOptionsWithPlaceholder(
                    commonCodesToSelectOptions(rmaAsTypeCodes),
                    "공통코드 없음"
                  )}
                  value={asTypeCode}
                  onChange={setAsTypeCode}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="rma-symptom">증상</Label>
              <div className="mt-1">
                <Select
                  id="rma-symptom"
                  options={selectOptionsWithPlaceholder(
                    commonCodesToSelectOptions(rmaSymptomCodes),
                    "공통코드 없음"
                  )}
                  value={symptomCode}
                  onChange={setSymptomCode}
                />
              </div>
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="rma-request-content" required>
                접수 내용
              </Label>
              <TextArea
                id="rma-request-content"
                value={requestContent}
                onChange={setRequestContent}
                rows={4}
                placeholder="고객 요청·증상 설명을 입력하세요."
              />
            </div>

            <div className="sm:col-span-2 flex items-center gap-3 pt-1">
              <Toggle
                id="rma-return-required"
                checked={returnRequiredYn}
                onChange={setReturnRequiredYn}
                activeLabel="반송 필요"
                inactiveLabel="반송 불필요"
              />
            </div>

            {returnRequiredYn ? (
              <>
                <div>
                  <Label htmlFor="rma-return-type">반송 유형</Label>
                  <div className="mt-1">
                    <Select
                      id="rma-return-type"
                      options={selectOptionsWithPlaceholder(
                        commonCodesToSelectOptions(rmaReturnTypeCodes),
                        "공통코드 없음"
                      )}
                      value={returnType}
                      onChange={setReturnType}
                    />
                  </div>
                </div>
                <DatePicker
                  id="rma-return-expected-at"
                  label="반송 예정일"
                  placeholder="년-월-일"
                  value={returnExpectedAt}
                  onValueChange={setReturnExpectedAt}
                />
              </>
            ) : null}
          </div>

          {symptomCode ? (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              선택 증상: {labelForCommonCode(rmaSymptomCodes, symptomCode)}
            </p>
          ) : null}

          <FormActionBar
            submitLabel="접수 등록"
            pendingSubmitLabel="등록 중…"
            isPending={createMutation.isPending}
            submitDisabled={!accessToken || !selectedUnit}
            cancelTo="/rma"
          />
        </ComponentCard>
      </form>

      <SerialLotLookupModal
        isOpen={lookupOpen}
        onClose={() => setLookupOpen(false)}
        onConfirm={(units) => {
          const unit = units[0];
          if (!unit) return;
          setSelectedUnit(unit);
        }}
        context="rma"
        selectionMode="single"
        confirmButtonLabel="선택 제품 반영"
      />
    </>
  );
}
