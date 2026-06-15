import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import FormField from "../components/form/FormField";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import MultiSelect from "../components/form/MultiSelect";
import Checkbox from "../components/form/input/Checkbox";
import InputAddonField from "../components/form/InputAddonField";
import SearchableSelectWithCreate from "../components/form/SearchableSelectWithCreate";
import { renderPartnerOptionLabel } from "../components/form/PartnerOptionLabel";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import { useAuth } from "../hooks/useAuth";
import { useProductPermissions } from "../hooks/useProductPermissions";
import { useCommonCodesByGroup } from "../hooks/useCommonCodesByGroup";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import {
  COMMON_CODE_GROUP_COUNTRY,
  COMMON_CODE_GROUP_DETECTOR_TYPE,
  commonCodesToSelectOptions,
  labelForCommonCode,
} from "../api/commonCode";
import { getDetectorSeriesList } from "../api/detectorSeries";
import type { Partner } from "../api/purchaseOrder";
import {
  createDetector,
  getDetector,
  updateDetector,
} from "../api/detectors";
import type { CreateDetectorPayload, UpdateDetectorPayload } from "../api/detectors";
import type { SearchableSelectOption } from "../components/form/SearchableSelectWithCreate";
import { toPartnerSearchableSelectOptions } from "../domains/partner/helpers/partnerSelectOptions";
import { normalizeDecimalInput } from "../lib/format/numberInput";

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

const PARTNER_TYPE_CUSTOMER = "CUSTOMER";
const LEGACY_CUSTOMER_PREFIX = "legacy-customer:";
const ARRAY_TYPE_PRESET: Record<
  "QVGA" | "VGA" | "SXGA",
  { width: string; height: string }
> = {
  QVGA: { width: "320", height: "256" },
  VGA: { width: "640", height: "480" },
  SXGA: { width: "1280", height: "1024" },
};
const ARRAY_TYPE_OPTIONS = [
  { value: "QVGA", label: "QVGA" },
  { value: "VGA", label: "VGA" },
  { value: "SXGA", label: "SXGA" },
  { value: "CUSTOM", label: "CUSTOM" },
];
const ROIC_TYPE_OPTIONS = [
  { value: "", label: "선택 없음" },
  { value: "ITR", label: "ITR" },
  { value: "IWR", label: "IWR" },
  { value: "IWR(2Gain)", label: "IWR(2Gain)" },
];
const DELIVERY_TYPE_OPTIONS = [
  { value: "검출기", label: "검출기" },
  { value: "프록시", label: "프록시" },
  { value: "프록시(분리)", label: "프록시(분리)" },
  { value: "프록시(일체)", label: "프록시(일체)" },
  { value: "프록시(2종)", label: "프록시(2종)" },
  { value: "엔진", label: "엔진" },
];

const DELIVERY_TYPE_MULTI_OPTIONS = DELIVERY_TYPE_OPTIONS.map((opt) => ({
  value: opt.value,
  text: opt.label,
}));

function legacyCustomerValue(name: string) {
  return `${LEGACY_CUSTOMER_PREFIX}${encodeURIComponent(name)}`;
}

function tryDecodeLegacyCustomer(selectValue: string): string | null {
  if (!selectValue.startsWith(LEGACY_CUSTOMER_PREFIX)) return null;
  try {
    return decodeURIComponent(selectValue.slice(LEGACY_CUSTOMER_PREFIX.length));
  } catch {
    return null;
  }
}

function normalizeDeliveryTypes(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter((item) => item.length > 0);
  }
  const text = String(value ?? "").trim();
  if (!text) return [];
  if (!text.includes(",")) return [text];
  return text
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function deliveryTypesToPayload(value: string[]): string | null {
  const normalized = value
    .map((item) => String(item ?? "").trim())
    .filter((item) => item.length > 0);
  if (normalized.length === 0) return null;
  return normalized.join(",");
}

export default function DetectorForm() {
  const { detectorId } = useParams();
  const isNew = detectorId == null || detectorId === "new";
  const idNum = isNew ? NaN : Number(String(detectorId ?? "").trim());
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const { canManageProducts } = useProductPermissions();

  const [detectorSeriesId, setDetectorSeriesId] = useState("");
  const [detectorType, setDetectorType] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [customerPartnerSelectValue, setCustomerPartnerSelectValue] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [arrayType, setArrayType] = useState<"QVGA" | "VGA" | "SXGA" | "CUSTOM">("QVGA");
  const [arrayWidth, setArrayWidth] = useState(ARRAY_TYPE_PRESET.QVGA.width);
  const [arrayHeight, setArrayHeight] = useState(ARRAY_TYPE_PRESET.QVGA.height);
  const [pitch, setPitch] = useState("");
  const [cooler, setCooler] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [fNumber, setFNumber] = useState("");
  const [csh, setCsh] = useState("");
  const [feedthruType, setFeedthruType] = useState("");
  const [roicType, setRoicType] = useState("");
  const [filterCut, setFilterCut] = useState("");
  const [specialNote, setSpecialNote] = useState("");
  const [deliveryTypes, setDeliveryTypes] = useState<string[]>([]);
  const [isMassProduction, setIsMassProduction] = useState(false);
  const [remark, setRemark] = useState("");
  const [isActive, setIsActive] = useState(true);

  const { data: countryCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_COUNTRY,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const { data: detectorTypeCodes = [] } = useCommonCodesByGroup(
    COMMON_CODE_GROUP_DETECTOR_TYPE,
    accessToken,
    { enabled: !!accessToken && !isAuthLoading }
  );

  const detectorTypeSelectOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(detectorTypeCodes);
    const t = detectorType.trim();
    if (
      t &&
      !base.some(
        (o) => o.value.trim().toUpperCase() === t.toUpperCase()
      )
    ) {
      return [
        ...base,
        {
          value: t,
          label: `${t} (저장된 값, 목록에 없음)`,
        },
      ];
    }
    return base;
  }, [detectorTypeCodes, detectorType]);

  const countryOptions = useMemo<SearchableSelectOption[]>(() => {
    const opts = commonCodesToSelectOptions(countryCodes).map((item) => ({
      ...item,
      countryCode: String(item.value).trim().toUpperCase(),
    }));
    const base: SearchableSelectOption[] = [
      { value: "", label: "선택 없음" },
      ...opts,
    ];
    const c = countryCode.trim().toUpperCase();
    if (!c || base.some((o) => o.value === c)) return base;
    return [
      ...base,
      {
        value: c,
        label: labelForCommonCode(countryCodes, c),
        countryCode: c,
      },
    ];
  }, [countryCodes, countryCode]);

  const { data: customerPartners = [], isLoading: isCustomerLoading } = usePartnersQuery(
    accessToken,
    { type: PARTNER_TYPE_CUSTOMER },
    { enabled: !!accessToken && !isAuthLoading }
  );

  const customerOptions = useMemo(() => {
    const partnerOptions = toPartnerSearchableSelectOptions(
      customerPartners as Partner[],
      countryCodes
    );
    const selectedId = customerPartnerSelectValue.trim();
    const withSelected =
      selectedId && !partnerOptions.some((opt) => opt.value === selectedId)
        ? [
            {
              value: selectedId,
              label: `${customerName.trim() || "기존 거래처"} (기존값)`,
            },
            ...partnerOptions,
          ]
        : partnerOptions;
    const normalizedName = customerName.trim();
    if (!normalizedName) return withSelected;
    const hit = (customerPartners as Partner[]).find(
      (p) => p.name?.trim() === normalizedName
    );
    if (hit) return withSelected;
    return [
      {
        value: legacyCustomerValue(normalizedName),
        label: `${normalizedName} (기존값)`,
      },
      ...withSelected,
    ];
  }, [customerPartners, countryCodes, customerName, customerPartnerSelectValue]);
  const customerSelectValue = useMemo(() => {
    if (customerPartnerSelectValue.trim()) return customerPartnerSelectValue;
    const name = customerName.trim();
    return name ? legacyCustomerValue(name) : "";
  }, [customerPartnerSelectValue, customerName]);

  const { data: seriesList = [] } = useQuery({
    queryKey: ["detectorSeries", true],
    queryFn: () =>
      getDetectorSeriesList(accessToken as string, { includeInactive: true }),
    enabled: !!accessToken && !isAuthLoading,
  });

  const seriesSelectOptions = useMemo(() => {
    return seriesList.map((s) => ({
      value: String(s.id),
      label: `${s.name} (${s.code})${s.isActive === false ? " · 비활성" : ""}`,
    }));
  }, [seriesList]);

  const {
    data: existing,
    isLoading: isDetailLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["detector", idNum],
    queryFn: () => getDetector(accessToken as string, idNum),
    enabled: !isNew && !!accessToken && !isAuthLoading && Number.isFinite(idNum),
  });

  useEffect(() => {
    if (!existing) return;
    setDetectorSeriesId(String(existing.detectorSeriesId ?? ""));
    setDetectorType(existing.detectorType ?? "");
    const cc = existing.countryCode?.trim() ?? "";
    setCountryCode(cc ? cc.toUpperCase() : "");
    const existingPartnerId = String(existing.partnerId ?? "").trim();
    if (existingPartnerId) {
      setCustomerPartnerSelectValue(existingPartnerId);
      const partnerName = existing.partner?.name?.trim();
      setCustomerName(partnerName || (existing.customerName ?? ""));
    } else {
      setCustomerName(existing.customerName ?? "");
      setCustomerPartnerSelectValue("");
    }
    const nextArrayType =
      existing.arrayType === "QVGA" ||
      existing.arrayType === "VGA" ||
      existing.arrayType === "SXGA" ||
      existing.arrayType === "CUSTOM"
        ? existing.arrayType
        : "QVGA";
    setArrayType(nextArrayType);
    setArrayWidth(
      existing.arrayWidth != null
        ? String(existing.arrayWidth)
        : nextArrayType === "CUSTOM"
          ? ""
          : ARRAY_TYPE_PRESET[nextArrayType].width
    );
    setArrayHeight(
      existing.arrayHeight != null
        ? String(existing.arrayHeight)
        : nextArrayType === "CUSTOM"
          ? ""
          : ARRAY_TYPE_PRESET[nextArrayType].height
    );
    setPitch(existing.pitch ?? "");
    setCooler(existing.cooler ?? "");
    setProjectName(existing.projectName ?? "");
    setProjectCode(existing.projectCode ?? "");
    setFNumber(existing.fNumber ?? "");
    setCsh(existing.csh ?? "");
    setFeedthruType(existing.feedthruType ?? "");
    setRoicType(existing.roicType ?? "");
    setFilterCut(existing.filterCut ?? "");
    setSpecialNote(existing.specialNote ?? "");
    setDeliveryTypes(normalizeDeliveryTypes(existing.deliveryType));
    setIsMassProduction(Boolean(existing.isMassProduction));
    setRemark(existing.remark ?? "");
    setIsActive(existing.isActive !== false);
  }, [existing]);

  useEffect(() => {
    if (!customerName.trim()) return;
    if (customerPartnerSelectValue.trim()) return;
    const match = (customerPartners as Partner[]).find(
      (p) => p.name?.trim() === customerName.trim()
    );
    if (!match?.id) return;
    setCustomerPartnerSelectValue(String(match.id));
  }, [customerPartners, customerName, customerPartnerSelectValue]);

  const handleArrayTypeChange = (next: string) => {
    if (next !== "QVGA" && next !== "VGA" && next !== "SXGA" && next !== "CUSTOM") {
      return;
    }
    setArrayType(next);
    if (next === "CUSTOM") return;
    const preset = ARRAY_TYPE_PRESET[next];
    setArrayWidth(preset.width);
    setArrayHeight(preset.height);
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const sid = parseInt(detectorSeriesId, 10);
      if (!Number.isFinite(sid) || sid <= 0) {
        throw new Error("검출기 시리즈를 선택하세요.");
      }
      const dt = detectorType.trim();
      if (!dt) {
        throw new Error("검출기 타입은 필수입니다.");
      }
      const activeDetectorTypes = detectorTypeCodes.filter(
        (c) => c.isActive !== false
      );
      if (activeDetectorTypes.length > 0) {
        const ok = activeDetectorTypes.some(
          (c) => String(c.code ?? "").trim().toUpperCase() === dt.toUpperCase()
        );
        if (!ok) {
          throw new Error(
            "검출기 타입은 DETECTOR_TYPE 공통코드(활성)에서 선택해야 합니다."
          );
        }
      }
      const ccRaw = countryCode.trim().toUpperCase();
      const countryPayload = ccRaw === "" ? null : ccRaw;
      const selectedLegacy = tryDecodeLegacyCustomer(customerPartnerSelectValue);
      const selectedPartner = (customerPartners as Partner[]).find(
        (p) => String(p.id) === customerPartnerSelectValue
      );
      const customerNamePayload =
        selectedPartner?.name?.trim() ||
        selectedLegacy ||
        customerName.trim();
      const partnerIdPayload = selectedPartner?.id
        ? String(selectedPartner.id)
        : null;

      if (isNew) {
        const body: CreateDetectorPayload = {
          detectorSeriesId: sid,
          partnerId: partnerIdPayload,
          detectorType: dt,
          countryCode: countryPayload,
          customerName: emptyToNull(customerNamePayload),
          arrayType,
          arrayWidth: arrayWidth.trim() ? Number(arrayWidth) : null,
          arrayHeight: arrayHeight.trim() ? Number(arrayHeight) : null,
          pitch: emptyToNull(pitch),
          cooler: emptyToNull(cooler),
          projectName: emptyToNull(projectName),
          projectCode: emptyToNull(projectCode),
          fNumber: emptyToNull(fNumber),
          csh: emptyToNull(csh),
          feedthruType: emptyToNull(feedthruType),
          roicType: emptyToNull(roicType),
          filterCut: emptyToNull(filterCut),
          specialNote: emptyToNull(specialNote),
          deliveryType: deliveryTypesToPayload(deliveryTypes),
          isMassProduction,
          remark: emptyToNull(remark),
          isActive,
        };
        return createDetector(accessToken as string, body);
      }

      const body: UpdateDetectorPayload = {
        detectorSeriesId: sid,
        partnerId: partnerIdPayload,
        detectorType: dt,
        countryCode: countryPayload,
        customerName: emptyToNull(customerNamePayload),
        arrayType,
        arrayWidth: arrayWidth.trim() ? Number(arrayWidth) : null,
        arrayHeight: arrayHeight.trim() ? Number(arrayHeight) : null,
        pitch: emptyToNull(pitch),
        cooler: emptyToNull(cooler),
        projectName: emptyToNull(projectName),
        projectCode: emptyToNull(projectCode),
        fNumber: emptyToNull(fNumber),
        csh: emptyToNull(csh),
        feedthruType: emptyToNull(feedthruType),
        roicType: emptyToNull(roicType),
        filterCut: emptyToNull(filterCut),
        specialNote: emptyToNull(specialNote),
        deliveryType: deliveryTypesToPayload(deliveryTypes),
        isMassProduction,
        remark: emptyToNull(remark),
        isActive,
      };
      return updateDetector(accessToken as string, idNum, body);
    },
    onSuccess: (saved) => {
      notify.success(isNew ? "검출기를 등록했습니다." : "검출기를 저장했습니다.");
      queryClient.invalidateQueries({ queryKey: ["detectors"] });
      queryClient.invalidateQueries({ queryKey: ["detector", saved.id] });
      navigate(`/detectors/${saved.id}`, { replace: true });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "저장에 실패했습니다.";
      notify.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageProducts) {
      notify.error("제품 관리 권한(product.manage)이 없습니다.");
      return;
    }
    if (!arrayWidth.trim() || Number(arrayWidth) <= 0) {
      notify.error("배열 가로 해상도는 0보다 커야 합니다.");
      return;
    }
    if (!arrayHeight.trim() || Number(arrayHeight) <= 0) {
      notify.error("배열 세로 해상도는 0보다 커야 합니다.");
      return;
    }
    saveMutation.mutate();
  };

  const pending = saveMutation.isPending;

  if (!canManageProducts) {
    return (
      <DetailPageState
        title="검출기"
        description="검출기 마스터"
        pageTitle="검출기"
        invalidMessage="제품 관리 권한(product.manage)이 필요합니다."
      />
    );
  }

  if (!isNew && isDetailLoading) {
    return (
      <DetailPageState
        title="검출기 수정"
        description="검출기 마스터"
        pageTitle="검출기 수정"
        loadingMessage="불러오는 중..."
      />
    );
  }

  if (!isNew && loadError) {
    return (
      <DetailPageState
        title="검출기 수정"
        description="검출기 마스터"
        pageTitle="검출기 수정"
        errorMessage={
          loadError instanceof Error
            ? loadError.message
            : "검출기를 불러오지 못했습니다."
        }
      />
    );
  }

  return (
    <>
      <PageMeta
        title={isNew ? "검출기 등록" : "검출기 수정"}
        description="검출기 마스터"
      />
      <PageBreadcrumb pageTitle={isNew ? "검출기 등록" : "검출기 수정"} />
      <form onSubmit={handleSubmit}>
        <ComponentCard title={isNew ? "검출기 등록" : "검출기 수정"}>
          {isDetailLoading && !isNew ? (
            <p className="text-sm text-gray-500">불러오는 중…</p>
          ) : isCustomerLoading ? (
            <p className="text-sm text-gray-500">고객사를 불러오는 중…</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="detector-series" required>
                  검출기 시리즈
                </Label>
                <Select
                  id="detector-series"
                  options={seriesSelectOptions}
                  value={detectorSeriesId}
                  onChange={setDetectorSeriesId}
                  placeholder="시리즈 선택"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="detector-type" required>
                  검출기 타입
                </Label>
                <Select
                  id="detector-type"
                  options={detectorTypeSelectOptions}
                  value={detectorType}
                  onChange={setDetectorType}
                  placeholder={
                    detectorTypeSelectOptions.length === 0
                      ? "공통코드 로딩 중…"
                      : "DETECTOR_TYPE 선택"
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <SearchableSelectWithCreate
                  id="detector-country"
                  label="국가 코드"
                  value={countryCode}
                  onChange={(v) => setCountryCode(v.toUpperCase())}
                  options={countryOptions}
                  formatOptionLabel={renderPartnerOptionLabel}
                  placeholder="국가 선택"
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                />
              </div>
              <div className="sm:col-span-2">
                <SearchableSelectWithCreate
                  id="detector-customer"
                  label="고객사 (업체 선택)"
                  value={customerSelectValue}
                  onChange={(nextValue) => {
                    setCustomerPartnerSelectValue(nextValue);
                    if (!nextValue) {
                      setCustomerName("");
                      return;
                    }
                    const legacy = tryDecodeLegacyCustomer(nextValue);
                    if (legacy != null) {
                      setCustomerName(legacy);
                      return;
                    }
                    const partner = (customerPartners as Partner[]).find(
                      (p) => String(p.id) === nextValue
                    );
                    setCustomerName(partner?.name?.trim() ?? "");
                  }}
                  options={customerOptions}
                  formatOptionLabel={renderPartnerOptionLabel}
                  placeholder="고객사 검색 후 선택"
                  noOptionsMessage="고객사(CUSTOMER) 업체가 없습니다."
                  isCreatable
                  onCreateOption={(inputValue) => {
                    const normalized = inputValue.trim();
                    if (!normalized) return;
                    const legacyValue = legacyCustomerValue(normalized);
                    setCustomerPartnerSelectValue(legacyValue);
                    setCustomerName(normalized);
                  }}
                  addTrigger="none"
                  addButtonLabel=""
                  onAddClick={() => {}}
                />
              </div>
              <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="detector-array-type">배열 타입</Label>
                  <Select
                    id="detector-array-type"
                    options={ARRAY_TYPE_OPTIONS}
                    value={arrayType}
                    onChange={handleArrayTypeChange}
                    placeholder="배열 타입 선택"
                  />
                </div>
                <div>
                  <Label htmlFor="detector-array-width">배열 가로 해상도</Label>
                  <Input
                    id="detector-array-width"
                    type="number"
                    min="1"
                    value={arrayWidth}
                    onChange={(e) =>
                      setArrayWidth(e.target.value.replace(/[^\d]/g, ""))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="detector-array-height">배열 세로 해상도</Label>
                  <Input
                    id="detector-array-height"
                    type="number"
                    min="1"
                    value={arrayHeight}
                    onChange={(e) =>
                      setArrayHeight(e.target.value.replace(/[^\d]/g, ""))
                    }
                  />
                </div>
              </div>
              <div>
                <FormField
                  id="detector-pitch"
                  label="픽셀 피치"
                  reserveHelpSpace={false}
                  controlMarginClassName=""
                  control={
                    <InputAddonField
                      id="detector-pitch"
                      value={pitch}
                      onChange={(value) => setPitch(normalizeDecimalInput(value))}
                      placeholder="예: 17"
                      addon="μm"
                      addonPlacement="outside-right"
                      addonAriaLabel="pixel-pitch unit"
                    />
                  }
                />
              </div>
              <div>
                <Label htmlFor="detector-cooler">쿨러</Label>
                <Input
                  id="detector-cooler"
                  value={cooler}
                  onChange={(e) => setCooler(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="detector-project-name">프로젝트명</Label>
                <Input
                  id="detector-project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="detector-project-code">프로젝트 코드</Label>
                <Input
                  id="detector-project-code"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                />
              </div>
              <div>
                <FormField
                  id="detector-fnum"
                  label="F Number"
                  reserveHelpSpace={false}
                  controlMarginClassName=""
                  control={
                    <InputAddonField
                      id="detector-fnum"
                      value={fNumber}
                      onChange={(value) => setFNumber(normalizeDecimalInput(value))}
                      placeholder="예: 1.4"
                      addon="F/"
                      addonPlacement="outside-left"
                      addonAriaLabel="f-number prefix"
                    />
                  }
                />
              </div>
              <div>
                <Label htmlFor="detector-csh">CSH</Label>
                <Input
                  id="detector-csh"
                  value={csh}
                  onChange={(e) => setCsh(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="detector-feedthru">Feedthru 타입</Label>
                <Input
                  id="detector-feedthru"
                  value={feedthruType}
                  onChange={(e) => setFeedthruType(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="detector-roic">ROIC 타입</Label>
                <Select
                  id="detector-roic"
                  options={ROIC_TYPE_OPTIONS}
                  value={roicType}
                  onChange={setRoicType}
                  placeholder="ROIC 타입 선택"
                />
              </div>
              <div>
                <Label htmlFor="detector-filter">필터 컷</Label>
                <Input
                  id="detector-filter"
                  value={filterCut}
                  onChange={(e) => setFilterCut(e.target.value)}
                />
              </div>
              <div>
                <MultiSelect
                  label="납품 유형"
                  options={DELIVERY_TYPE_MULTI_OPTIONS}
                  value={deliveryTypes}
                  onChange={setDeliveryTypes}
                  placeholder="납품 유형 선택(복수)"
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="detector-special">특이 사항</Label>
                <TextArea
                  id="detector-special"
                  rows={2}
                  value={specialNote}
                  onChange={setSpecialNote}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="detector-remark">비고</Label>
                <TextArea
                  id="detector-remark"
                  rows={2}
                  value={remark}
                  onChange={setRemark}
                />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="detector-mass"
                  checked={isMassProduction}
                  onChange={setIsMassProduction}
                  label="양산 여부"
                />
              </div>
              <div className="sm:col-span-2 flex items-center pt-1">
                <Toggle
                  id="detector-active"
                  checked={isActive}
                  onChange={setIsActive}
                />
              </div>
            </div>
          )}
          <FormActionBar
            submitLabel={isNew ? "등록" : "저장"}
            isPending={pending}
            submitDisabled={!accessToken || (!isNew && isDetailLoading)}
            cancelTo={isNew ? "/detectors" : `/detectors/${idNum}`}
          />
        </ComponentCard>
      </form>
    </>
  );
}
