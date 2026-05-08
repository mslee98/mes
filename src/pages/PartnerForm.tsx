import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import Label from "../components/form/Label";
import FormField from "../components/form/FormField";
import Input from "../components/form/input/InputField";
import TextArea from "../components/form/input/TextArea";
import Select from "../components/form/Select";
import SelectInput from "../components/form/SelectInput";
import CountrySelect from "../components/form/CountrySelect";
import Toggle from "../components/form/Toggle";
import FormActionBar from "../components/form/FormActionBar";
import { Modal } from "../components/ui/modal";
import { ReactComponent as MailLineIcon } from "../icons/mail-line.svg?react";
import { InformationCircleIcon } from "../icons";
import { useAuth } from "../hooks/useAuth";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import {
  createPartner,
  getPartner,
  type Partner,
  updatePartner,
  type PartnerCreatePayload,
  type PartnerUpdatePayload,
} from "../api/purchaseOrder";
import {
  commonCodesToSelectOptions,
} from "../api/commonCode";
import {
  DEFAULT_PARTNER_COUNTRY_CODE,
  isPartnerCountryCode,
  PARTNER_COUNTRY_OPTIONS,
  type PartnerCountryCode,
} from "../lib/partnerCountryOptions";
import { validateRequiredFields } from "../lib/formValidation";

/** 업체 폼 「국가」 선택과 동기화할 기본 국가번호 */
const PARTNER_COUNTRY_TO_DIAL: Partial<Record<PartnerCountryCode, string>> = {
  KR: "+82",
  US: "+1",
  JP: "+81",
  CN: "+86",
  TW: "+886",
  HK: "+852",
  SG: "+65",
  MY: "+60",
  TH: "+66",
  VN: "+84",
  IN: "+91",
  ID: "+62",
  PH: "+63",
  AU: "+61",
  DE: "+49",
  FR: "+33",
  GB: "+44",
  IT: "+39",
  NL: "+31",
  CH: "+41",
  CA: "+1",
  PL: "+48",
  TR: "+90",
  AE: "+971",
};

const PARTNER_CODE_REGEX = /^[A-Z]{1,2}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_NATIONAL_REGEX = /^(02-\d{3,4}-\d{4}|0\d{2}-\d{3,4}-\d{4})$/;
const PARTNER_CODE_SINGLE_ALPHABET = Array.from({ length: 26 }, (_, i) =>
  String.fromCharCode(65 + i)
);
const PARTNER_CODE_DOUBLE_A_PREFIX = Array.from({ length: 26 }, (_, i) =>
  `A${String.fromCharCode(65 + i)}`
);
const PARTNER_CODE_SLOT_CANDIDATES = [
  ...PARTNER_CODE_SINGLE_ALPHABET,
  ...PARTNER_CODE_DOUBLE_A_PREFIX,
];
/** 공통코드 PARTNER_TYPE — 협력사 선택 시 부문(`PARTNER_SUPPLIER_SEGMENT`) 입력 */
const PARTNER_TYPE_SUPPLIER = "SUPPLIER";

/** 연락처 국가번호 — 업체 「국가」 선택지와 동일 목록 + 표시 라벨 */
const PHONE_COUNTRY_ROWS = PARTNER_COUNTRY_OPTIONS.filter((c) =>
  Boolean(PARTNER_COUNTRY_TO_DIAL[c.code as PartnerCountryCode])
).map((c) => {
  const countryCode = c.code as PartnerCountryCode;
  const dial = PARTNER_COUNTRY_TO_DIAL[countryCode]!;
  return {
    countryCode,
    dial,
    labelLine: `${countryCode} · ${dial}`,
  };
}).sort((a, b) => a.labelLine.localeCompare(b.labelLine, "ko"));

function uniqueDialsLongestFirst(): string[] {
  const set = new Set(
    Object.values(PARTNER_COUNTRY_TO_DIAL).filter(
      (d): d is string => typeof d === "string" && d.length > 0
    )
  );
  return [...set].sort((a, b) => b.length - a.length);
}

/** 동일 국가번호(+1 등)는 목록 순서대로 첫 매칭 국가 사용 */
function countryCodeForDial(dial: string): PartnerCountryCode {
  for (const row of PARTNER_COUNTRY_OPTIONS) {
    const cc = row.code as PartnerCountryCode;
    if (PARTNER_COUNTRY_TO_DIAL[cc] === dial) return cc;
  }
  return DEFAULT_PARTNER_COUNTRY_CODE;
}

function splitPartnerPhone(full: string): {
  countryCode: PartnerCountryCode;
  national: string;
} {
  const t = full.trim();
  if (!t)
    return { countryCode: DEFAULT_PARTNER_COUNTRY_CODE, national: "" };
  for (const dial of uniqueDialsLongestFirst()) {
    if (t.startsWith(dial)) {
      return {
        countryCode: countryCodeForDial(dial),
        national: t.slice(dial.length).trim(),
      };
    }
  }
  return {
    countryCode: DEFAULT_PARTNER_COUNTRY_CODE,
    national: t,
  };
}

function formatPartnerNationalPhone(raw: string): string {
  const numbersOnly = raw.replace(/\D/g, "");
  if (!numbersOnly) return "";

  // 서울 지역번호(02): 02-XXX(X)-XXXX
  if (numbersOnly.startsWith("02")) {
    const digits = numbersOnly.slice(0, 10);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}-${digits.slice(2)}`;
    if (digits.length <= 9)
      return `${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5)}`;
    return `${digits.slice(0, 2)}-${digits.slice(2, 6)}-${digits.slice(6)}`;
  }

  // 그 외(010/070/042 등): 0XX-XXX(X)-XXXX
  const digits = numbersOnly.slice(0, 11);
  if (!digits) return "";
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length <= 10)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function PartnerForm() {
  const { partnerId } = useParams();
  const isNew = !partnerId;
  const id = String(partnerId ?? "").trim();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [countryCode, setCountryCode] = useState<string>(
    DEFAULT_PARTNER_COUNTRY_CODE
  );
  const [partnerType, setPartnerType] = useState("");
  const [supplierSegment, setSupplierSegment] = useState("");
  const [businessRegistrationNo, setBusinessRegistrationNo] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [phoneCountryCode, setPhoneCountryCode] =
    useState<PartnerCountryCode>(DEFAULT_PARTNER_COUNTRY_CODE);
  const [phoneNational, setPhoneNational] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [memo, setMemo] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [isCodeRuleModalOpen, setIsCodeRuleModalOpen] = useState(false);

  const { partnerTypeCodes, supplierSegmentCodes } = usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );
  const {
    data: existing,
    isLoading: isLoadLoading,
    error: loadError,
  } = useQuery({
    queryKey: ["partner", id],
    queryFn: () => getPartner(id, accessToken as string),
    enabled: !isNew && !!accessToken && !isAuthLoading && id !== "",
  });
  const selectedTypeCode = partnerType.trim();
  const selectedSegmentCode = supplierSegment.trim();
  const isCodeRuleTargetReady =
    selectedTypeCode !== "" &&
    (selectedTypeCode !== PARTNER_TYPE_SUPPLIER || selectedSegmentCode !== "");
  const { data: codeRulePartners = [], isLoading: isCodeRuleLoading } =
    usePartnersQuery(
      accessToken,
      {
        type: selectedTypeCode || undefined,
        supplierSegmentCode:
          selectedTypeCode === PARTNER_TYPE_SUPPLIER
            ? selectedSegmentCode || undefined
            : undefined,
      },
      {
        enabled:
          !!accessToken &&
          !isAuthLoading &&
          isCodeRuleModalOpen &&
          isCodeRuleTargetReady,
      }
    );

  useEffect(() => {
    if (!existing) return;
    queueMicrotask(() => {
      setCode(String(existing.code ?? "").trim().toUpperCase());
      setName(existing.name ?? "");
      const cc = String(existing.countryCode ?? "").trim();
      setCountryCode(
        cc && isPartnerCountryCode(cc) ? cc : DEFAULT_PARTNER_COUNTRY_CODE
      );
      setPartnerType(String(existing.type ?? "").trim());
      const segRaw =
        existing.supplierSegment ??
        (existing as { supplier_segment?: string | null }).supplier_segment;
      setSupplierSegment(
        segRaw != null && String(segRaw).trim() !== ""
          ? String(segRaw).trim()
          : ""
      );
      setBusinessRegistrationNo(
        String(existing.businessRegistrationNo ?? "").trim()
      );
      setContactPerson(String(existing.contactPerson ?? "").trim());
      const phoneSrc =
        existing.contactPhone ??
        (existing.contact != null && String(existing.contact).trim() !== ""
          ? existing.contact
          : "");
      const parsed = splitPartnerPhone(String(phoneSrc).trim());
      setPhoneCountryCode(parsed.countryCode);
      setPhoneNational(parsed.national);
      setContactEmail(String(existing.contactEmail ?? "").trim());
      setAddress(String(existing.address ?? "").trim());
      setMemo(String(existing.memo ?? "").trim());
      setIsActive(existing.isActive !== false);
    });
  }, [existing]);

  const partnerTypeOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(partnerTypeCodes);
    return [{ value: "", label: "선택" }, ...base];
  }, [partnerTypeCodes]);
  const supplierSegmentOptions = useMemo(() => {
    const base = commonCodesToSelectOptions(supplierSegmentCodes);
    return [{ value: "", label: "선택" }, ...base];
  }, [supplierSegmentCodes]);

  /** 발주 라인 「통화·단가」와 동일 패턴의 좌측 국가·번호 / 우측 번호 입력 */
  const phoneSelectOptions = useMemo(
    () =>
      PHONE_COUNTRY_ROWS.map((row) => ({
        value: row.countryCode,
        label: row.labelLine,
        symbol: row.dial,
      })),
    []
  );
  /** 신규 등록: 번호 미입력 시 연락처 국가를 업체 「국가」와 맞춤 */
  useEffect(() => {
    if (!isNew || !isPartnerCountryCode(countryCode)) return;
    if (phoneNational.trim() !== "") return;
    if (PARTNER_COUNTRY_TO_DIAL[countryCode]) {
      queueMicrotask(() => setPhoneCountryCode(countryCode));
    }
  }, [countryCode, isNew, phoneNational]);

  const phoneDialActive =
    PARTNER_COUNTRY_TO_DIAL[phoneCountryCode] ??
    PARTNER_COUNTRY_TO_DIAL[DEFAULT_PARTNER_COUNTRY_CODE]!;

  const createMutation = useMutation({
    mutationFn: (payload: PartnerCreatePayload) =>
      createPartner(payload, accessToken as string),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      notify.success("업체를 등록했습니다.");
      navigate(`/partners/${created.id}`);
    },
    onError: (e: Error) => notify.error(e.message || "등록에 실패했습니다."),
  });

  const updateMutation = useMutation({
    mutationFn: (payload: PartnerUpdatePayload) =>
      updatePartner(id, payload, accessToken as string),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partners"] });
      queryClient.invalidateQueries({ queryKey: ["partner", id] });
      notify.success("업체를 수정했습니다.");
      navigate(`/partners/${id}`);
    },
    onError: (e: Error) => notify.error(e.message || "수정에 실패했습니다."),
  });

  const validateAndBuildPayload = () => {
    if (
      !validateRequiredFields(
        [{ value: name, message: "업체명을 입력하세요." }],
        notify.error
      )
    ) {
      return null;
    }
    const cc = countryCode.trim();
    if (!cc || !isPartnerCountryCode(cc)) {
      notify.error("국가를 선택하세요.");
      return null;
    }
    const pt = partnerType.trim();
    if (
      !validateRequiredFields(
        [{ value: pt, message: "업체 유형(고객 유형)을 선택하세요." }],
        notify.error
      )
    ) {
      return null;
    }
    if (pt === PARTNER_TYPE_SUPPLIER) {
      const seg = supplierSegment.trim();
      if (!seg) {
        notify.error("협력사 부문을 선택하세요.");
        return null;
      }
    }
    const normalizedCode = code.trim().toUpperCase();
    if (!PARTNER_CODE_REGEX.test(normalizedCode)) {
      notify.error("업체 코드는 대문자 1~2자리만 가능합니다. (예: A, ZZ)");
      return null;
    }
    const contactPhoneCombined =
      [phoneDialActive, phoneNational.trim()].filter(Boolean).join(" ").trim() ||
      null;
    const phoneValue = phoneNational.trim();
    if (phoneValue && !PHONE_NATIONAL_REGEX.test(phoneValue)) {
      notify.error(
        "담당자 연락처는 010-1234-5678 또는 042-123-4567 형식으로 입력하세요."
      );
      return null;
    }
    const contactCombined =
      [contactPerson.trim(), contactPhoneCombined ?? ""]
        .filter((v) => String(v).trim() !== "")
        .join(" ")
        .trim() || null;
    const emailValue = contactEmail.trim();
    if (emailValue && !EMAIL_REGEX.test(emailValue)) {
      notify.error("담당자 이메일 형식이 올바르지 않습니다.");
      return null;
    }
    return {
      code: normalizedCode,
      name: name.trim(),
      defenseMarket: "CIVILIAN",
      countryCode: cc,
      type: pt,
      supplierSegmentCode:
        pt === PARTNER_TYPE_SUPPLIER ? supplierSegment.trim() : null,
      supplierSegment:
        pt === PARTNER_TYPE_SUPPLIER ? supplierSegment.trim() : null,
      businessRegistrationNo: businessRegistrationNo.trim() || null,
      contactPerson: contactPerson.trim() || null,
      contactPhone: contactPhoneCombined,
      contactEmail: emailValue || null,
      contact: contactCombined,
      address: address.trim() || null,
      memo: memo.trim() || null,
    };
  };

  const handlePartnerTypeChange = (next: string) => {
    setPartnerType(next);
    if (next !== PARTNER_TYPE_SUPPLIER) {
      setSupplierSegment("");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = validateAndBuildPayload();
    if (!payload) return;
    if (isNew) {
      createMutation.mutate(payload);
      return;
    }
    updateMutation.mutate({
      ...payload,
      isActive,
    });
  };

  if (!isNew && !id) {
    return (
      <DetailPageState
        title="업체 수정"
        description="거래처 마스터"
        pageTitle="업체 수정"
        invalidMessage="잘못된 업체 ID입니다."
      />
    );
  }

  if (!isNew && (isAuthLoading || isLoadLoading)) {
    return (
      <DetailPageState
        title="업체 수정"
        description="거래처 마스터"
        pageTitle="업체 수정"
        loadingMessage="불러오는 중..."
      />
    );
  }

  if (!isNew && loadError) {
    return (
      <DetailPageState
        title="업체 수정"
        description="거래처 마스터"
        pageTitle="업체 수정"
        errorMessage={
          loadError instanceof Error
            ? loadError.message
            : "업체 정보를 불러오지 못했습니다."
        }
      />
    );
  }

  const pending = createMutation.isPending || updateMutation.isPending;
  const selectedPartnerTypeLabel =
    partnerTypeOptions.find((opt) => opt.value === partnerType)?.label ?? "-";
  const selectedSupplierSegmentLabel =
    supplierSegmentOptions.find((opt) => opt.value === supplierSegment)?.label ??
    "-";
  const isCodeInputReady =
    partnerType.trim() !== "" &&
    (partnerType !== PARTNER_TYPE_SUPPLIER || supplierSegment.trim() !== "");
  const codeSlotRows = (() => {
    const filteredPartners = (codeRulePartners as Partner[]).filter((partner) => {
      const partnerTypeCode = String(partner.type ?? "")
        .trim()
        .toUpperCase();
      const partnerSegmentCode = String(
        partner.supplierSegmentCode ?? partner.supplierSegment ?? ""
      )
        .trim()
        .toUpperCase();
      const currentTypeCode = selectedTypeCode.toUpperCase();
      const currentSegmentCode = selectedSegmentCode.toUpperCase();

      if (partnerTypeCode !== currentTypeCode) return false;
      if (currentTypeCode === PARTNER_TYPE_SUPPLIER) {
        return partnerSegmentCode === currentSegmentCode;
      }
      return true;
    });

    const namesByCode = new Map<string, string[]>();
    filteredPartners.forEach((partner) => {
      const code = String(partner.code ?? "")
        .trim()
        .toUpperCase();
      if (!PARTNER_CODE_SLOT_CANDIDATES.includes(code)) return;
      const current = namesByCode.get(code) ?? [];
      current.push(String(partner.name ?? "").trim() || "(이름 없음)");
      namesByCode.set(code, current);
    });
    return PARTNER_CODE_SLOT_CANDIDATES.map((code) => {
      const names = namesByCode.get(code) ?? [];
      return {
        code,
        names,
        label: names.length > 0 ? names.join(", ") : "-",
      };
    });
  })();
  const codePlaceholder = isCodeInputReady
    ? "예: A, ZZ"
    : partnerType !== PARTNER_TYPE_SUPPLIER
      ? "업체 유형을 먼저 선택하세요"
      : "협력사 부문까지 선택하세요";
  const codeGuideText = isCodeInputReady
    ? `현재 선택 기준: ${selectedPartnerTypeLabel}${
        partnerType === PARTNER_TYPE_SUPPLIER
          ? ` / ${selectedSupplierSegmentLabel}`
          : ""
      } · 대문자 영문 1~2자리`
    : "코드 체계 확인을 위해 업체 유형(협력사인 경우 부문까지)을 먼저 선택하세요.";

  const normalizedContactEmail = contactEmail.trim();
  const hasContactEmail = normalizedContactEmail.length > 0;
  const isValidContactEmail =
    !hasContactEmail || EMAIL_REGEX.test(normalizedContactEmail);
  const emailHint = hasContactEmail
    ? isValidContactEmail
      ? "올바른 이메일 형식입니다."
      : "이메일 형식이 올바르지 않습니다."
    : undefined;

  return (
    <>
      <PageMeta
        title={isNew ? "업체 등록" : "업체 수정"}
        description="거래처 마스터"
      />
      <PageBreadcrumb pageTitle={isNew ? "업체 등록" : "업체 수정"} />
      <form onSubmit={handleSubmit} className="space-y-6">
        <ComponentCard
          collapsible
          title={isNew ? "업체 기본 정보" : "업체 기본 정보 수정"}
          desc="코드·유형·담당·연락처를 한 화면에서 입력합니다."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2 rounded-xl border border-gray-200 bg-gray-50/90 p-4 dark:border-white/10 dark:bg-white/[0.03]">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0 sm:col-span-2">
                  <Label htmlFor="partner-partner-type" required>
                    업체 유형
                  </Label>
                  <Select
                    id="partner-partner-type"
                    className="mt-1"
                    value={partnerType}
                    onChange={handlePartnerTypeChange}
                    options={partnerTypeOptions}
                    size="md"
                  />
                  <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                    고객사(CUSTOMER) 또는 협력사(SUPPLIER)
                  </p>
                </div>
                {partnerType === PARTNER_TYPE_SUPPLIER ? (
                  <div className="min-w-0 sm:col-span-2 border-l-4 border-brand-500 pl-4">
                    <Label htmlFor="partner-supplier-segment" required>
                      협력사 부문
                    </Label>
                    <Select
                      id="partner-supplier-segment"
                      className="mt-1"
                      value={supplierSegment}
                      onChange={setSupplierSegment}
                      options={supplierSegmentOptions}
                      size="md"
                    />
                  </div>
                ) : null}
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="partner-code" required>
                  업체 코드
                </Label>
                <button
                  type="button"
                  onClick={() => setIsCodeRuleModalOpen(true)}
                  className="inline-flex items-center gap-1 text-theme-xs font-medium text-gray-500 hover:text-brand-600 dark:text-gray-400 dark:hover:text-brand-400"
                  aria-label="업체 코드 규칙 보기"
                >
                  <InformationCircleIcon className="h-4 w-4" aria-hidden />
                  코드 조회
                </button>
              </div>
              <Input
                id="partner-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={codePlaceholder}
                maxLength={2}
                className="mt-1"
                disabled={!isCodeInputReady}
              />
              <p className="mt-1 text-theme-xs text-gray-500 dark:text-gray-400">
                {codeGuideText}
              </p>
            </div>
            <div className="min-w-0">
              <Label htmlFor="partner-name" required>
                업체명
              </Label>
              <Input
                id="partner-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="partner-form-country"
                label="업체 국가"
                required
                reserveHelpSpace
                control={
                  <CountrySelect
                    id="partner-form-country"
                    label=""
                    showLabel={false}
                    value={countryCode}
                    onChange={setCountryCode}
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="partner-address"
                label="주소"
                reserveHelpSpace
                control={
                  <Input
                    id="partner-address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="선택"
                  />
                }
              />
            </div>

            <div className="min-w-0">
              <FormField
                id="partner-business-no"
                label="사업자등록번호"
                reserveHelpSpace
                control={
                  <Input
                    id="partner-business-no"
                    value={businessRegistrationNo}
                    onChange={(e) => setBusinessRegistrationNo(e.target.value)}
                    placeholder="선택"
                  />
                }
              />
            </div>
            <div className="min-w-0">
              <FormField
                id="partner-contact-person"
                label="담당자명"
                reserveHelpSpace
                control={
                  <Input
                    id="partner-contact-person"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="선택"
                  />
                }
              />
            </div>

            <div className="min-w-0">
              <FormField
                id="partner-contact-email-input"
                label="담당자 이메일"
                reserveHelpSpace
                helpText={emailHint}
                control={
                  <div className="relative">
                    <span
                      className="pointer-events-none absolute top-1/2 left-0 z-10 flex h-11 -translate-y-1/2 items-center border-r border-gray-200 px-3.5 py-3 text-gray-500 dark:border-gray-800 dark:text-gray-400"
                      aria-hidden
                    >
                      <MailLineIcon className="h-5 w-5 shrink-0 text-[#667085] dark:text-gray-400" />
                    </span>
                    <Input
                      id="partner-contact-email-input"
                      type="email"
                      autoComplete="email"
                      value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)}
                      placeholder="info@gmail.com"
                      className="pl-[62px]"
                      error={hasContactEmail && !isValidContactEmail}
                      success={hasContactEmail && isValidContactEmail}
                    />
                  </div>
                }
              />
            </div>

            <div className="min-w-0">
              <FormField
                id="partner-phone-input"
                label="담당자 연락처"
                reserveHelpSpace
                control={
                  <div className="flex justify-start">
                    <SelectInput
                      id="partner-phone"
                      size="md"
                      selectOptions={phoneSelectOptions}
                      selectValue={phoneCountryCode}
                      onSelectChange={(v) => {
                        if (isPartnerCountryCode(v)) setPhoneCountryCode(v);
                      }}
                      inputValue={phoneNational}
                      onInputChange={(v) => setPhoneNational(formatPartnerNationalPhone(v))}
                      inputType="tel"
                      inputTextAlign="left"
                      inputPlaceholder="010-1234-5678"
                      inputSuffix=""
                      selectPlaceholder=""
                      withShadow
                      showDivider
                      className="w-full"
                      selectClassName="min-w-[8rem] max-w-[12rem] pl-3 pr-8"
                    />
                  </div>
                }
              />
            </div>

            <div className="sm:col-span-2">
              <Label htmlFor="partner-memo">메모</Label>
              <TextArea
                id="partner-memo"
                value={memo}
                onChange={setMemo}
                rows={3}
                placeholder="선택"
              />
            </div>
            {!isNew ? (
              <div className="sm:col-span-2 flex items-center pt-1">
                <Toggle
                  id="partner-active-toggle"
                  checked={isActive}
                  onChange={setIsActive}
                />
              </div>
            ) : null}
          </div>
          <FormActionBar
            submitLabel="저장"
            isPending={pending}
            submitDisabled={!accessToken}
            cancelTo={isNew ? "/partners" : `/partners/${id}`}
          />
        </ComponentCard>
      </form>

      <Modal
        isOpen={isCodeRuleModalOpen}
        onClose={() => setIsCodeRuleModalOpen(false)}
        className="mx-4 w-full max-w-3xl p-6 sm:p-7"
      >
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          업체 코드 현황
        </h3>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
          현재 선택한 업체 유형/협력사 부문 기준으로 코드 정의 기준을 안내합니다.
        </p>

        <div className="mt-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm dark:border-gray-800 dark:bg-gray-800/40 sm:grid-cols-2">
          <div>
            <p className="text-gray-500 dark:text-gray-400">업체 유형</p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {selectedPartnerTypeLabel}
            </p>
          </div>
          <div>
            <p className="text-gray-500 dark:text-gray-400">협력사 부문</p>
            <p className="mt-1 font-medium text-gray-900 dark:text-white">
              {partnerType === PARTNER_TYPE_SUPPLIER
                ? selectedSupplierSegmentLabel
                : "해당 없음"}
            </p>
          </div>
        </div>

        {!isCodeInputReady ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-700/40 dark:bg-amber-500/10 dark:text-amber-300">
            정확한 규칙 안내를 위해 업체 유형(협력사인 경우 부문까지)을 먼저
            선택하세요.
          </div>
        ) : null}

        <div className="mt-5 max-h-96 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/60">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  적용 대상
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  업체명
                </th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">
                  적용
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {!isCodeInputReady ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    코드 슬롯을 보려면 업체 유형/협력사 부문을 먼저 선택하세요.
                  </td>
                </tr>
              ) : isCodeRuleLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-500 dark:text-gray-400"
                  >
                    코드 슬롯을 조회하는 중...
                  </td>
                </tr>
              ) : codeSlotRows.map((row) => (
                <tr
                  key={row.code}
                  className={
                    row.names.length > 0
                      ? "bg-red-50/70 dark:bg-red-500/10"
                      : "bg-green-50/70 dark:bg-green-500/10"
                  }
                >
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                    {row.code}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-200">
                    {row.label}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={row.names.length > 0}
                      onClick={() => {
                        setCode(row.code);
                        setIsCodeRuleModalOpen(false);
                      }}
                      className="rounded-md bg-brand-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 dark:disabled:bg-gray-700 dark:disabled:text-gray-400"
                    >
                      사용
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => setIsCodeRuleModalOpen(false)}
            className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            확인
          </button>
        </div>
      </Modal>
    </>
  );
}
