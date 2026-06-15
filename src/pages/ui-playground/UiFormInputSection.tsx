import { useState } from "react";
import ComponentCard from "../../components/common/ComponentCard";
import SegmentedControl from "../../components/common/SegmentedControl";
import FormField from "../../components/form/FormField";
import Input from "../../components/form/input/InputField";
import InputAddonField from "../../components/form/InputAddonField";
import Label from "../../components/form/Label";
import { EnvelopeIcon, UserIcon } from "../../icons";
import {
  fieldCheckToFormFieldProps,
  type UnitFieldCheckState,
} from "../../domains/production-plan/helpers/unitDuplicateCheck";

type DemoCheckStatus = UnitFieldCheckState["status"];

const DEMO_CHECK_OPTIONS: Array<{ value: DemoCheckStatus; label: string }> = [
  { value: "idle", label: "대기" },
  { value: "checking", label: "확인 중" },
  { value: "available", label: "사용 가능" },
  { value: "duplicate", label: "중복" },
  { value: "error", label: "오류" },
];

function demoCheckState(status: DemoCheckStatus): UnitFieldCheckState {
  switch (status) {
    case "checking":
      return { status: "checking" };
    case "available":
      return { status: "available", message: "LOT 사용 가능" };
    case "duplicate":
      return {
        status: "duplicate",
        message: "LOT 중복: 생산 유닛 · LT-20260504-001",
      };
    case "error":
      return { status: "error", message: "LOT 형식이 올바르지 않습니다." };
    default:
      return { status: "idle" };
  }
}

export function UiFormInputSection() {
  const [lotDemo, setLotDemo] = useState("LT-20260504-001");
  const [lotCheckStatus, setLotCheckStatus] = useState<DemoCheckStatus>("idle");
  const [legacyEmail, setLegacyEmail] = useState("");
  const [legacyError, setLegacyError] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [website, setWebsite] = useState("");
  const [weight, setWeight] = useState("");

  const lotFieldProps = fieldCheckToFormFieldProps(demoCheckState(lotCheckStatus));

return (
    <>
      <ComponentCard
        title="용어 정리: Input · 서브텍스트 · Help text"
        desc="폼 필드 UI를 설계·구현할 때 쓰는 이름과 담당 컴포넌트입니다."
      >
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-gray-700 dark:text-gray-300">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                  용어
                </th>
                <th className="py-2 pr-4 font-medium text-gray-900 dark:text-white">
                  구현
                </th>
                <th className="py-2 font-medium text-gray-900 dark:text-white">
                  용도
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-white/[0.06]">
              <tr>
                <td className="py-2.5 pr-4 font-medium">Input</td>
                <td className="py-2.5 pr-4">
                  <code>InputField</code>
                </td>
                <td className="py-2.5">
                  텍스트 입력 컨트롤(h-11). <code>error</code> /{" "}
                  <code>success</code>로 테두리·우측 아이콘.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">서브텍스트</td>
                <td className="py-2.5 pr-4">
                  <code>FormField</code> → <code>helpText</code>
                </td>
                <td className="py-2.5">
                  필드 아래 보조 문구(정책 안내, 중복 검사, 검증 메시지).{" "}
                  <code>helpTone</code>: default · error · success.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">Help text 슬롯</td>
                <td className="py-2.5 pr-4">
                  <code>reserveHelpSpace</code> (기본 true)
                </td>
                <td className="py-2.5">
                  메시지가 없어도 한 줄 높이를 비워 두어 필드 간{" "}
                  <strong>행간을 동일</strong>하게 유지(CLS·레이아웃 안정).
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium">Input hint</td>
                <td className="py-2.5 pr-4">
                  <code>InputField</code> → <code>hint</code>
                </td>
                <td className="py-2.5">
                  Input 내부 하단 문구. 단일 필드·플레이그라운드용. 여러 필드를
                  세로로 쌓을 때는 FormField 패턴 권장.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-theme-xs text-gray-500 dark:text-gray-400">
          매핑 헬퍼: <code>fieldCheckToFormFieldProps</code> (중복 검사 상태 →
          helpText + Input error/success). API 호출은 blur·저장 시점 권장.
        </p>
      </ComponentCard>

      <ComponentCard
        title="FormField + Input (권장)"
        desc="서브텍스트는 FormField helpText에만 둡니다. reserveHelpSpace(기본 true)로 필드마다 help 슬롯 높이를 맞추고, Input은 error/success(테두리·아이콘)만 담당합니다. 생산 계획 Unit 수정 모달과 동일한 패턴입니다."
      >
        <div className="mb-4 max-w-md">
          <p className="mb-2 text-theme-xs font-medium text-gray-500 dark:text-gray-400">
            LOT 중복 검사 상태 (데모)
          </p>
          <SegmentedControl
            ariaLabel="LOT 필드 검사 상태"
            value={lotCheckStatus}
            onChange={setLotCheckStatus}
            options={DEMO_CHECK_OPTIONS}
            equalWidth
          />
        </div>

        <div className="max-w-md space-y-4">
          <FormField
            id="ui-form-lot"
            label="LOT 번호"
            helpText={lotFieldProps.helpText}
            helpTone={lotFieldProps.helpTone}
            control={
              <Input
                id="ui-form-lot"
                value={lotDemo}
                onChange={(e) => setLotDemo(e.target.value)}
                error={lotFieldProps.error}
                success={lotFieldProps.success}
                className="font-mono"
                placeholder="LT-yyyyMMdd-…"
              />
            }
          />

          <FormField
            id="ui-form-operator"
            label="생산 담당자"
            helpText={undefined}
            control={
              <Input
                id="ui-form-operator"
                value="홍길동"
                readOnly
                disabled
                placeholder="셀렉트·검색 필드는 별도 컴포넌트"
              />
            }
          />

          <FormField
            id="ui-form-detector-sn"
            label="검출기 S/N"
            helpText="출고 전에만 수정할 수 있습니다."
            control={
              <Input
                id="ui-form-detector-sn"
                value=""
                disabled
                className="font-mono"
                placeholder="검출기 시리얼"
              />
            }
          />

          <FormField
            id="ui-form-product-sn"
            label="제품 S/N"
            helpText="제품 S/N이 등록된 경우에만 수정할 수 있습니다."
            control={
              <Input
                id="ui-form-product-sn"
                value="ICE6401234"
                disabled
                className="font-mono"
              />
            }
          />
        </div>
      </ComponentCard>

      <ComponentCard
        title="행간 비교: Input hint vs FormField help"
        desc="Input에 hint를 직접 넣으면 필드마다 서브텍스트 유무에 따라 세로 간격이 달라집니다. 폼·모달에서는 FormField help 슬롯을 사용하세요."
      >
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-4">
            <p className="text-theme-xs font-medium text-amber-700 dark:text-amber-400/90">
              비권장 — Input hint
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="ui-compare-hint-a">필드 A</Label>
                <Input
                  id="ui-compare-hint-a"
                  value="값 있음"
                  readOnly
                  hint="항상 표시되는 힌트"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="ui-compare-hint-b">필드 B</Label>
                <Input
                  id="ui-compare-hint-b"
                  value=""
                  readOnly
                  placeholder="힌트 없음"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-theme-xs font-medium text-success-600 dark:text-success-500">
              권장 — FormField help
            </p>
            <div className="space-y-4">
              <FormField
                id="ui-compare-form-a"
                label="필드 A"
                helpText="항상 표시되는 안내"
                control={
                  <Input id="ui-compare-form-a" value="값 있음" readOnly />
                }
              />
              <FormField
                id="ui-compare-form-b"
                label="필드 B"
                control={<Input id="ui-compare-form-b" value="" readOnly />}
              />
            </div>
          </div>
        </div>
      </ComponentCard>

      <ComponentCard
        title="InputField 단독 상태"
        desc="라벨만 붙인 단순 입력·플레이그라운드용. 검증 메시지·중복 안내가 있는 폼 필드는 위 FormField 패턴을 사용합니다."
      >
        <div className="max-w-md space-y-5">
          <div>
            <Label htmlFor="ui-input-basic">기본</Label>
            <Input
              id="ui-input-basic"
              placeholder="텍스트 입력"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ui-input-legacy-email">Error (Input hint)</Label>
            <Input
              id="ui-input-legacy-email"
              type="email"
              value={legacyEmail}
              error={legacyError}
              onChange={(e) => {
                const value = e.target.value;
                setLegacyEmail(value);
                setLegacyError(
                  value.length > 0 &&
                    !/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
                      value
                    )
                );
              }}
              placeholder="name@example.com"
              hint={
                legacyError ? "올바른 이메일 형식이 아닙니다." : undefined
              }
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="ui-input-disabled">Disabled</Label>
            <Input
              id="ui-input-disabled"
              value="disabled@example.com"
              disabled
              className="mt-1"
            />
          </div>
        </div>
      </ComponentCard>

      <ComponentCard
        title="Input Addons (좌/우 아이콘·텍스트)"
        desc="좌측/우측에 SVG 아이콘 또는 텍스트를 붙여 입력 맥락을 명확히 하는 패턴입니다."
      >
        <div className="max-w-md space-y-5">
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
    </>
  );
}
