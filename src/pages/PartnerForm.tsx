import { useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import DetailPageState from "../components/common/DetailPageState";
import FormActionBar from "../components/form/FormActionBar";
import ConfirmLeaveModal from "../components/common/ConfirmLeaveModal";
import { useAuth } from "../hooks/useAuth";
import { useConfirmLeaveWithGoBack } from "../hooks/useConfirmLeave";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { PartnerBasicInfoSection } from "../features/partner-form/sections/PartnerBasicInfoSection";
import { PartnerContactSection } from "../features/partner-form/sections/PartnerContactSection";
import { PartnerCodeRuleModal } from "../features/partner-form/sections/PartnerCodeRuleModal";
import { usePartnerFormState } from "../features/partner-form/hooks/usePartnerFormState";
import { usePartnerCodeRule } from "../features/partner-form/hooks/usePartnerCodeRule";
import { usePartnerFormMutations } from "../features/partner-form/hooks/usePartnerFormMutations";
import { validatePartnerForm } from "../features/partner-form/utils/validatePartnerForm";

export default function PartnerForm() {
  const { partnerId } = useParams();
  const isNew = !partnerId;
  const id = String(partnerId ?? "").trim();
  const { accessToken, isLoading: isAuthLoading } = useAuth();

  const form = usePartnerFormState({
    isNew,
    partnerId: id,
    accessToken,
    isAuthLoading,
  });

  const { partnerTypeCodes, supplierSegmentCodes } = usePartnerCommonCodes(
    accessToken,
    !!accessToken && !isAuthLoading
  );

  const codeRule = usePartnerCodeRule({
    accessToken,
    isAuthLoading,
    partnerType: form.fields.partnerType,
    supplierSegment: form.fields.supplierSegment,
    partnerTypeCodes,
    supplierSegmentCodes,
  });

  const { submitPayload, isPending } = usePartnerFormMutations({
    isNew,
    partnerId: id,
    accessToken,
  });

  const { leaveModalOpen, onLeaveConfirm, onLeaveCancel, requestLeave } =
    useConfirmLeaveWithGoBack(form.isDirty, form.leavePath);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = validatePartnerForm(form.fields, notify.error);
    if (!result.ok) return;
    submitPayload(result.payload, form.fields.isActive);
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

  if (!isNew && (isAuthLoading || form.isLoadLoading)) {
    return (
      <DetailPageState
        title="업체 수정"
        description="거래처 마스터"
        pageTitle="업체 수정"
        loadingMessage="불러오는 중..."
      />
    );
  }

  if (!isNew && form.loadError) {
    return (
      <DetailPageState
        title="업체 수정"
        description="거래처 마스터"
        pageTitle="업체 수정"
        errorMessage={
          form.loadError instanceof Error
            ? form.loadError.message
            : "업체 정보를 불러오지 못했습니다."
        }
      />
    );
  }

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
            <PartnerBasicInfoSection
              isNew={isNew}
              code={form.fields.code}
              onCodeChange={form.setCode}
              name={form.fields.name}
              onNameChange={form.setName}
              countryCode={form.fields.countryCode}
              onCountryCodeChange={form.setCountryCode}
              partnerType={form.fields.partnerType}
              onPartnerTypeChange={form.setPartnerType}
              supplierSegment={form.fields.supplierSegment}
              onSupplierSegmentChange={form.setSupplierSegment}
              businessRegistrationNo={form.fields.businessRegistrationNo}
              onBusinessRegistrationNoChange={form.setBusinessRegistrationNo}
              address={form.fields.address}
              onAddressChange={form.setAddress}
              memo={form.fields.memo}
              onMemoChange={form.setMemo}
              isActive={form.fields.isActive}
              onIsActiveChange={form.setIsActive}
              partnerTypeOptions={codeRule.partnerTypeOptions}
              supplierSegmentOptions={codeRule.supplierSegmentOptions}
              isCodeInputReady={codeRule.isCodeInputReady}
              codePlaceholder={codeRule.codePlaceholder}
              codeGuideText={codeRule.codeGuideText}
              onOpenCodeRuleModal={() => codeRule.setIsCodeRuleModalOpen(true)}
            />
            <PartnerContactSection
              contactPerson={form.fields.contactPerson}
              onContactPersonChange={form.setContactPerson}
              phoneCountryCode={form.fields.phoneCountryCode}
              onPhoneCountryCodeChange={form.setPhoneCountryCode}
              phoneNational={form.fields.phoneNational}
              onPhoneNationalChange={form.setPhoneNational}
              contactEmail={form.fields.contactEmail}
              onContactEmailChange={form.setContactEmail}
            />
          </div>
          <FormActionBar
            submitLabel="저장"
            isPending={isPending}
            submitDisabled={!accessToken}
            onCancel={requestLeave}
          />
        </ComponentCard>
      </form>

      <PartnerCodeRuleModal
        isOpen={codeRule.isCodeRuleModalOpen}
        onClose={() => codeRule.setIsCodeRuleModalOpen(false)}
        partnerType={form.fields.partnerType}
        selectedPartnerTypeLabel={codeRule.selectedPartnerTypeLabel}
        selectedSupplierSegmentLabel={codeRule.selectedSupplierSegmentLabel}
        isCodeInputReady={codeRule.isCodeInputReady}
        isCodeRuleLoading={codeRule.isCodeRuleLoading}
        codeSlotRows={codeRule.codeSlotRows}
        onSelectCode={form.setCode}
      />

      <ConfirmLeaveModal
        isOpen={leaveModalOpen}
        onClose={onLeaveCancel}
        onConfirm={onLeaveConfirm}
      />
    </>
  );
}
