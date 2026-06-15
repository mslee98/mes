import { useState } from "react";
import toast from "react-hot-toast";
import ComponentCard from "../../components/common/ComponentCard";
import FormField from "../../components/form/FormField";
import Input from "../../components/form/input/InputField";
import TextArea from "../../components/form/input/TextArea";
import DatePicker from "../../components/form/date-picker";
import TimePickerInput from "../../components/form/TimePickerInput";
import Toggle from "../../components/form/Toggle";
import Radio from "../../components/form/input/Radio";
import Checkbox from "../../components/form/input/Checkbox";
import FormActionBar from "../../components/form/FormActionBar";
import { validateRequiredFields } from "../../lib/formValidation";
import { UiPlaygroundSubsection } from "./UiPlaygroundSection";
import { UiFormInputSection } from "./UiFormInputSection";

export function UiPlaygroundFormTab() {
  const [name, setName] = useState("");
  const [memo, setMemo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [active, setActive] = useState(true);
  const [timeOnSelect, setTimeOnSelect] = useState("09:30");
  const [timeOnSave, setTimeOnSave] = useState("14:00");
  const [demoMonth, setDemoMonth] = useState("");
  const [demoRadio, setDemoRadio] = useState("checked");
  const [demoCheckboxDefault, setDemoCheckboxDefault] = useState(false);
  const [demoCheckboxChecked, setDemoCheckboxChecked] = useState(true);

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
    <div className="space-y-6">
      <ComponentCard
        title="Form"
        desc="입력·선택·검증 메시지(서브텍스트) 패턴. 목록·테이블 셀 UI는 Table 탭을 참고하세요."
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-gray-600 dark:text-gray-300">
          <li>
            <strong>Input</strong> — <code>InputField</code> 컨트롤(높이 h-11,
            error/success 테두리·아이콘).
          </li>
          <li>
            <strong>서브텍스트 / Help text</strong> — 필드 아래 안내 문구. 폼·모달에서는{" "}
            <code>FormField</code>의 <code>helpText</code> +{" "}
            <code>reserveHelpSpace</code>로 통일합니다.
          </li>
          <li>
            <strong>Input hint</strong> — <code>InputField</code>의{" "}
            <code>hint</code> prop. 단순 데모·단일 필드용. 여러 필드를 쌓을 때는
            행간이 들쭉날쭉해지므로 FormField 패턴을 씁니다.
          </li>
        </ul>
      </ComponentCard>

      <UiPlaygroundSubsection title="Input · 서브텍스트 · Help text">
        <UiFormInputSection />
      </UiPlaygroundSubsection>

      <UiPlaygroundSubsection title="Selection">
        <ComponentCard
          title="Radio"
          desc="동일 name으로 그룹. 라벨은 Radio 컴포넌트에 포함."
        >
          <div className="space-y-4">
            <Radio
              id="ui-default-radio-1"
              name="ui-default-radio"
              value="default"
              checked={demoRadio === "default"}
              onChange={setDemoRadio}
              label="Default radio"
            />
            <Radio
              id="ui-default-radio-2"
              name="ui-default-radio"
              value="checked"
              checked={demoRadio === "checked"}
              onChange={setDemoRadio}
              label="Checked state"
            />
            <Radio
              id="ui-default-radio-3"
              name="ui-default-radio"
              value="disabled"
              checked={demoRadio === "disabled"}
              onChange={setDemoRadio}
              label="Disabled"
              disabled
            />
          </div>
        </ComponentCard>

        <ComponentCard
          title="Checkbox"
          desc="테이블 헤더 전체 선택 등에 indeterminate 사용."
        >
          <div className="space-y-4">
            <Checkbox
              id="ui-default-checkbox"
              checked={demoCheckboxDefault}
              onChange={setDemoCheckboxDefault}
              label="Default checkbox"
            />
            <Checkbox
              id="ui-checked-checkbox"
              checked={demoCheckboxChecked}
              onChange={setDemoCheckboxChecked}
              label="Checked state"
            />
            <Checkbox
              id="ui-disabled-checkbox"
              checked
              onChange={() => undefined}
              label="Disabled"
              disabled
            />
            <Checkbox
              id="ui-indeterminate-checkbox"
              checked={false}
              indeterminate
              onChange={() => undefined}
              label="Indeterminate (전체 선택 예시)"
            />
          </div>
        </ComponentCard>
      </UiPlaygroundSubsection>

      <UiPlaygroundSubsection title="기타 컨트롤">
        <ComponentCard title="Form Controls" desc="DatePicker·TextArea·Toggle 등. 텍스트 입력은 Input 섹션 패턴을 따릅니다.">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <FormField
                id="ui-name"
                label="이름"
                required
                control={
                  <Input
                    id="ui-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="이름 입력"
                  />
                }
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
            <div>
              <DatePicker
                id="ui-month-only"
                label="월만 선택"
                value={demoMonth ? `${demoMonth}-01` : ""}
                monthOnly
                onValueChange={(v) => setDemoMonth(String(v ?? "").slice(0, 7))}
                compact
              />
              <p className="mt-1.5 text-theme-xs text-gray-500 dark:text-gray-400">
                값:{" "}
                <code className="text-gray-800 dark:text-gray-200">
                  {demoMonth || "—"}
                </code>
              </p>
            </div>
            <div className="sm:col-span-2">
              <FormField
                id="ui-memo"
                label="메모"
                control={
                  <TextArea
                    id="ui-memo"
                    rows={4}
                    value={memo}
                    onChange={setMemo}
                    placeholder="컴포넌트 테스트용 텍스트"
                  />
                }
              />
            </div>
            <div className="sm:col-span-2">
              <Toggle
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
              setDemoMonth("");
              setTimeOnSelect("09:30");
              setTimeOnSave("14:00");
              setActive(true);
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
          title="TimePickerInput"
          desc='commitMode="onSelect"(기본) · "onSave". compact는 표·모달용.'
        >
          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <TimePickerInput
                id="ui-time-on-select"
                label="즉시 반영 (onSelect)"
                value={timeOnSelect}
                onChange={setTimeOnSelect}
                commitMode="onSelect"
              />
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                값: <code>{timeOnSelect || "—"}</code>
              </p>
            </div>
            <div>
              <TimePickerInput
                id="ui-time-on-save"
                label="저장 시 반영 (onSave)"
                value={timeOnSave}
                onChange={setTimeOnSave}
                commitMode="onSave"
                closeOnMinuteSelect={false}
              />
              <p className="mt-2 text-theme-xs text-gray-500 dark:text-gray-400">
                값: <code>{timeOnSave || "—"}</code>
              </p>
            </div>
            <div className="sm:col-span-2">
              <TimePickerInput
                id="ui-time-compact"
                label="compact"
                value={timeOnSelect}
                onChange={setTimeOnSelect}
                compact
              />
            </div>
          </div>
        </ComponentCard>
      </UiPlaygroundSubsection>
    </div>
  );
}
