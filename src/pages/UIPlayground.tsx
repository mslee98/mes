import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ComponentCard from "../components/common/ComponentCard";
import Badge from "../components/ui/badge/Badge";
import Button from "../components/ui/button/Button";
import Label from "../components/form/Label";
import Input from "../components/form/input/InputField";
import InputAddonField from "../components/form/InputAddonField";
import TextArea from "../components/form/input/TextArea";
import DatePicker from "../components/form/date-picker";
import ActiveToggle from "../components/form/ActiveToggle";
import FormActionBar from "../components/form/FormActionBar";
import { EnvelopeIcon, UserIcon } from "../icons";
import { useAuth } from "../hooks/useAuth";
import { usePartnersQuery } from "../hooks/usePartnersQuery";
import { usePartnerCommonCodes } from "../hooks/usePartnerCommonCodes";
import { PARTNER_TYPE_SUPPLIER, PARTNER_SUPPLIER_SEGMENT_OTHER } from "../lib/partnerPredicates";
import { partnerSelectLabel } from "../lib/partnerDisplay";
import { validateRequiredFields } from "../lib/formValidation";

export default function UIPlayground() {
  const { accessToken, isLoading: isAuthLoading } = useAuth();
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [weight, setWeight] = useState("");

  const queryEnabled = !!accessToken && !isAuthLoading;
  const { countryCodes } = usePartnerCommonCodes(accessToken, queryEnabled);
  const {
    data: otherSuppliers = [],
    isLoading: isPartnerQueryLoading,
    error: partnerQueryError,
  } = usePartnersQuery(
    accessToken,
    {
      type: PARTNER_TYPE_SUPPLIER,
      supplierSegmentCode: PARTNER_SUPPLIER_SEGMENT_OTHER,
    },
    { enabled: queryEnabled }
  );

  const supplierPreview = useMemo(
    () =>
      otherSuppliers
        .slice(0, 5)
        .map((partner) => partnerSelectLabel(partner, countryCodes)),
    [otherSuppliers, countryCodes]
  );

  const runValidationDemo = () => {
    const valid = validateRequiredFields(
      [
        { value: name, message: "이름은 필수입니다." },
        { value: dueDate, message: "예정일은 필수입니다." },
      ],
      toast.error
    );
    if (valid) {
      toast.success("검증 통과");
    }
  };

  return (
    <>
      <PageMeta title="UI 디자인 시스템" description="UI 디자인 시스템" />
      <PageBreadcrumb pageTitle="UI 디자인 시스템" />

      <div className="space-y-6">
        <ComponentCard
          title="개요"
          desc="공통 UI, 콘텐츠 검증, 공통 쿼리 패턴을 한 화면에서 확인하는 페이지입니다."
        >
          <p className="text-sm text-gray-600 dark:text-gray-300">
            URL: <code>/ui</code>
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            최근 공통화 항목: <code>ActiveToggle</code>, <code>FormActionBar</code>,{" "}
            <code>validateRequiredFields</code>, <code>usePartnersQuery</code>
          </p>
        </ComponentCard>

        <ComponentCard title="Badge">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color="primary">Primary</Badge>
            <Badge color="success">Success</Badge>
            <Badge color="error">Error</Badge>
            <Badge color="warning">Warning</Badge>
            <Badge color="info">Info</Badge>
            <Badge variant="solid" color="dark">
              Solid
            </Badge>
          </div>
        </ComponentCard>

        <ComponentCard title="Button">
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primary</Button>
            <Button variant="outline">Outline</Button>
            <Button size="sm">Small</Button>
            <Button disabled>Disabled</Button>
          </div>
        </ComponentCard>

        <ComponentCard title="Form Controls">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="ui-name" required>
                이름
              </Label>
              <Input
                id="ui-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="이름 입력"
                className="mt-1"
              />
            </div>
            <div>
              <DatePicker
                id="ui-due-date"
                label="예정일"
                value={dueDate}
                onValueChange={setDueDate}
                placeholder="년-월-일"
              />
            </div>
            <div className="sm:col-span-2">
              <Label
                htmlFor="ui-memo"
                className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
              >
                메모
              </Label>
              <TextArea
                id="ui-memo"
                rows={4}
                value={memo}
                onChange={setMemo}
                placeholder="컴포넌트 테스트용 텍스트"
              />
            </div>
            <div className="sm:col-span-2">
              <ActiveToggle
                id="ui-active-toggle"
                checked={active}
                onChange={setActive}
              />
            </div>
          </div>

          <FormActionBar
            className="mt-4"
            submitLabel="검증 실행"
            submitDisabled={false}
            onCancel={() => {
              setName("");
              setMemo("");
              setDueDate("");
              setActive(true);
              setEmail("");
              setUsername("");
              setWebsite("");
              setWeight("");
            }}
            cancelLabel="초기화"
          >
            <button
              type="button"
              onClick={runValidationDemo}
              className="rounded-lg border border-brand-200 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300 dark:hover:bg-brand-500/10"
            >
              validateRequiredFields 데모 실행
            </button>
          </FormActionBar>
        </ComponentCard>

        <ComponentCard
          title="Input Addons (좌/우 아이콘·텍스트)"
          desc="좌측/우측에 SVG 아이콘 또는 텍스트를 붙여 입력 맥락을 명확히 하는 패턴입니다."
        >
          <div className="space-y-5">
            <div>
              <Label htmlFor="ui-input-email">이메일 (좌측 SVG)</Label>
              <InputAddonField
                id="ui-input-email"
                value={email}
                onChange={setEmail}
                placeholder="name@example.com"
                addon={<EnvelopeIcon className="size-5" />}
                addonPlacement="inside-left"
                addonAriaLabel="email icon"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-username">Username (좌측 SVG)</Label>
              <InputAddonField
                id="ui-input-username"
                value={username}
                onChange={setUsername}
                placeholder="elonmusk"
                addon={<UserIcon className="size-4" />}
                addonPlacement="outside-left"
                addonAriaLabel="username icon"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-website">Website (좌측 텍스트)</Label>
              <InputAddonField
                id="ui-input-website"
                value={website}
                onChange={setWebsite}
                placeholder="flowbite.com"
                addon="https://"
                addonPlacement="outside-left"
                addonAriaLabel="website prefix"
              />
            </div>

            <div>
              <Label htmlFor="ui-input-weight">Weight (우측 텍스트)</Label>
              <InputAddonField
                id="ui-input-weight"
                value={weight}
                onChange={setWeight}
                placeholder="12.5"
                addon="kg"
                addonPlacement="outside-right"
                addonAriaLabel="weight unit"
              />
            </div>
          </div>
        </ComponentCard>

        <ComponentCard
          title="공통 Query 패턴"
          desc="`usePartnersQuery` + `usePartnerCommonCodes` 조합으로 렌즈 제조사(OTHER 협력사) 목록을 불러오는 예시입니다."
        >
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge color="info">queryKey: partners + params</Badge>
              <Badge color={isPartnerQueryLoading ? "warning" : "success"}>
                {isPartnerQueryLoading ? "조회중" : "조회완료"}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              조건: <code>type=SUPPLIER</code>,{" "}
              <code>supplierSegmentCode=OTHER</code>
            </p>
            {partnerQueryError ? (
              <p className="text-red-600">
                {partnerQueryError instanceof Error
                  ? partnerQueryError.message
                  : "파트너 쿼리 조회 실패"}
              </p>
            ) : (
              <>
                <p className="text-gray-700 dark:text-gray-200">
                  조회 건수: <strong>{otherSuppliers.length}</strong>
                </p>
                <ul className="list-disc space-y-1 pl-5 text-gray-600 dark:text-gray-300">
                  {supplierPreview.length > 0 ? (
                    supplierPreview.map((label) => <li key={label}>{label}</li>)
                  ) : (
                    <li>표시할 데이터가 없습니다.</li>
                  )}
                </ul>
              </>
            )}
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
