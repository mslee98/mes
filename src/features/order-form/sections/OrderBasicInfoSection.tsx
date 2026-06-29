import ComponentCard from "../../../components/common/ComponentCard";
import Input from "../../../components/form/input/InputField";
import TextArea from "../../../components/form/input/TextArea";
import Label from "../../../components/form/Label";
import DatePicker from "../../../components/form/date-picker";
import SearchableSelectWithCreate from "../../../components/form/SearchableSelectWithCreate";
import { renderPartnerOptionLabel } from "../../../components/form/PartnerOptionLabel";
import OrderAttachmentSection from "./OrderAttachmentSection";
import type { PurchaseOrderFile } from "../../../api/purchaseOrder";
import type { SearchableSelectOption } from "../../../components/form/SearchableSelectWithCreate";

type OrderBasicInfoSectionProps = {
  isNew: boolean;
  orderNoDisplay: string;
  registrantDisplay: string;
  title: string;
  onTitleChange: (value: string) => void;
  onTitleManualEdit: () => void;
  orderDate: string;
  onOrderDateChange: (value: string) => void;
  dueDate: string;
  onDueDateChange: (value: string) => void;
  partnerId: string;
  onPartnerIdChange: (value: string) => void;
  partnerSelectOptions: SearchableSelectOption[];
  requesterUserSelectValue: string;
  onRequesterUserSelectValueChange: (value: string) => void;
  requesterUserOptions: SearchableSelectOption[];
  employeeDirectoryLoading: boolean;
  employeeDirectoryError: boolean;
  vendorOrderNo: string;
  onVendorOrderNoChange: (value: string) => void;
  vendorRequest: string;
  onVendorRequestChange: (value: string) => void;
  specialNote: string;
  onSpecialNoteChange: (value: string) => void;
  isPending: boolean;
  pendingFilesForCreate: File[];
  files: PurchaseOrderFile[];
  isFileUploadPending: boolean;
  isFileDeletePending: boolean;
  uploadingExistingFileNames: string[];
  recentlyUploadedFileNames: string[];
  onError: (message: string) => void;
  onSelectCreateFiles: (files: File[]) => void;
  onRemoveCreateFile: (index: number) => void;
  onUploadExistingFiles: (files: File[]) => void;
  onDeleteExistingFile: (fileId: number) => void;
};

export function OrderBasicInfoSection({
  isNew,
  orderNoDisplay,
  registrantDisplay,
  title,
  onTitleChange,
  onTitleManualEdit,
  orderDate,
  onOrderDateChange,
  dueDate,
  onDueDateChange,
  partnerId,
  onPartnerIdChange,
  partnerSelectOptions,
  requesterUserSelectValue,
  onRequesterUserSelectValueChange,
  requesterUserOptions,
  employeeDirectoryLoading,
  employeeDirectoryError,
  vendorOrderNo,
  onVendorOrderNoChange,
  vendorRequest,
  onVendorRequestChange,
  specialNote,
  onSpecialNoteChange,
  isPending,
  pendingFilesForCreate,
  files,
  isFileUploadPending,
  isFileDeletePending,
  uploadingExistingFileNames,
  recentlyUploadedFileNames,
  onError,
  onSelectCreateFiles,
  onRemoveCreateFile,
  onUploadExistingFiles,
  onDeleteExistingFile,
}: OrderBasicInfoSectionProps) {
  return (
    <ComponentCard
      collapsible
      title={isNew ? "발주 기본 정보" : "발주 기본 정보 수정"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="order-display-id" required>
            발주 ID
          </Label>
          <Input
            id="order-display-id"
            value={orderNoDisplay}
            readOnly
            disabled
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="order-registrant" required>
            등록자
          </Label>
          <Input
            id="order-registrant"
            value={registrantDisplay}
            readOnly
            disabled
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title" required>
            제목
          </Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => {
              onTitleManualEdit();
              onTitleChange(e.target.value);
            }}
            placeholder="발주 제목"
            className="mt-1"
          />
        </div>

        <DatePicker
          id="order-orderDate"
          label="발주일자"
          required
          placeholder="년-월-일"
          value={orderDate}
          onValueChange={onOrderDateChange}
        />
        <DatePicker
          id="order-dueDate"
          label="고객요청납기일"
          required
          placeholder="년-월-일"
          value={dueDate}
          onValueChange={onDueDateChange}
        />

        <div className="sm:col-span-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <SearchableSelectWithCreate
              id="order-partner"
              label="고객명"
              required
              value={partnerId}
              onChange={onPartnerIdChange}
              options={partnerSelectOptions}
              formatOptionLabel={renderPartnerOptionLabel}
              placeholder="검색하여 업체 선택"
              addTrigger="none"
              addButtonLabel=""
              onAddClick={() => {}}
            />
          </div>

          <div className="min-w-0">
            <SearchableSelectWithCreate
              id="order-requesterUser"
              label="영업 담당자"
              required
              value={requesterUserSelectValue}
              onChange={onRequesterUserSelectValueChange}
              options={requesterUserOptions}
              placeholder={
                employeeDirectoryLoading
                  ? "전체 직원 목록 불러오는 중…"
                  : "담당자 검색·선택"
              }
              noOptionsMessage="표시할 활성 직원이 없습니다."
              addTrigger="none"
              addButtonLabel=""
              onAddClick={() => {}}
              isDisabled={employeeDirectoryLoading}
            />
            {employeeDirectoryError ? (
              <p className="mt-1 text-theme-xs text-red-600 dark:text-red-400">
                담당자 목록을 불러오지 못했습니다.
              </p>
            ) : null}
          </div>
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="vendorOrderNo">고객발주번호</Label>
          <Input
            id="vendorOrderNo"
            value={vendorOrderNo}
            onChange={(e) => onVendorOrderNoChange(e.target.value)}
            placeholder="고객에서 부여한 발주번호"
            className="mt-1"
          />
        </div>
        <div className="sm:col-span-2">
          <Label
            htmlFor="vendorRequest"
            className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
          >
            고객요청사항
          </Label>
          <TextArea
            id="vendorRequest"
            rows={4}
            value={vendorRequest}
            onChange={onVendorRequestChange}
            placeholder="고객 요청 내용을 입력하세요."
          />
        </div>
        <div className="sm:col-span-2">
          <Label
            htmlFor="specialNote"
            className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90"
          >
            특이사항
          </Label>
          <TextArea
            id="specialNote"
            rows={4}
            value={specialNote}
            onChange={onSpecialNoteChange}
            placeholder="특이사항을 입력하세요."
          />
        </div>
        <div className="sm:col-span-2">
          <Label className="mb-2.5 block text-sm font-medium text-gray-800 dark:text-white/90">
            첨부파일
          </Label>
          <OrderAttachmentSection
            isNew={isNew}
            isPending={isPending}
            pendingFilesForCreate={pendingFilesForCreate}
            files={files}
            isFileUploadPending={isFileUploadPending}
            isFileDeletePending={isFileDeletePending}
            uploadingExistingFileNames={uploadingExistingFileNames}
            recentlyUploadedFileNames={recentlyUploadedFileNames}
            onError={onError}
            onSelectCreateFiles={onSelectCreateFiles}
            onRemoveCreateFile={onRemoveCreateFile}
            onUploadExistingFiles={onUploadExistingFiles}
            onDeleteExistingFile={onDeleteExistingFile}
          />
        </div>
      </div>
    </ComponentCard>
  );
}
