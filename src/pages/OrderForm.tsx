import { useParams } from "react-router";
import { notify } from "../lib/notify";
import PageMeta from "../components/common/PageMeta";
import PageBreadcrumb from "../components/common/PageBreadCrumb";
import ConfirmLeaveModal from "../components/common/ConfirmLeaveModal";
import ConfirmModal from "../components/common/ConfirmModal";
import LoadingLottie from "../components/common/LoadingLottie";
import FormActionBar from "../components/form/FormActionBar";
import { useAuth } from "../hooks/useAuth";
import { useConfirmLeaveWithGoBack } from "../hooks/useConfirmLeave";
import OrderLineEditorSection from "../features/order-form/sections/OrderLineEditorSection";
import { OrderBasicInfoSection } from "../features/order-form/sections/OrderBasicInfoSection";
import { useOrderFormState } from "../features/order-form/hooks/useOrderFormState";
import { useOrderFormMutations } from "../features/order-form/hooks/useOrderFormMutations";
import { useOrderFormQueries } from "../features/order-form/hooks/useOrderFormQueries";
import { useOrderFormSelectOptions } from "../features/order-form/hooks/useOrderFormSelectOptions";
import { useOrderFormSubmit } from "../features/order-form/hooks/useOrderFormSubmit";
import type { PurchaseOrderFile } from "../api/purchaseOrder";

export default function OrderForm() {
  const { orderId } = useParams();
  const isNew = orderId == null || orderId === "new";
  const id = isNew ? "" : String(orderId ?? "").trim();
  const { accessToken, user } = useAuth();

  const queries = useOrderFormQueries({ isNew, orderId: id, accessToken });

  const selectOptions = useOrderFormSelectOptions({
    partners: queries.partners,
    countryCodes: queries.countryCodes,
    productList: queries.productList,
    lensList: queries.lensList,
    currencyCodes: queries.currencyCodes,
    unitCodes: queries.unitCodes,
  });

  const form = useOrderFormState({
    isNew,
    orderId: id,
    order: queries.order,
    resolvedOrderLineItems: queries.resolvedOrderLineItems,
    employeeDirectory: queries.employeeDirectory,
    usersForRequester: queries.usersForRequester,
    organizationTree: queries.organizationTree,
    productList: queries.productList,
    firstUnitValue: selectOptions.firstUnitValue,
    purchaseOrderTypeCodes: queries.purchaseOrderTypeCodes,
    purchaseOrderStatusCodes: queries.purchaseOrderStatusCodes,
    user,
  });

  const leaveConfirm = useConfirmLeaveWithGoBack(
    form.isDirty,
    isNew ? "/order" : `/order/${id}`
  );
  const { leaveModalOpen, onLeaveConfirm, onLeaveCancel, requestLeave, allowNextNavigation } =
    leaveConfirm;

  const mutations = useOrderFormMutations({
    orderId: id,
    accessToken,
    firstUnitValue: selectOptions.firstUnitValue,
    orderCurrencyCode: form.orderCurrencyCode,
    pendingFilesForCreate: form.pendingFilesForCreate,
    setPendingFilesForCreate: form.setPendingFilesForCreate,
    setItems: form.setItems,
    allowNextNavigation,
  });

  const { saveLine, handleSubmit } = useOrderFormSubmit({
    isNew,
    form,
    mutations,
    employeeDirectory: queries.employeeDirectory,
    purchaseOrderTypeCodes: queries.purchaseOrderTypeCodes,
    order: queries.order,
  });

  if (!isNew && queries.orderLoading && !queries.order) {
    return (
      <>
        <PageMeta title="발주 수정" description="발주 수정" />
        <PageBreadcrumb pageTitle="발주 수정" />
        <div className="flex min-h-[320px] items-center justify-center">
          <LoadingLottie />
        </div>
      </>
    );
  }

  const isPending =
    mutations.createMutation.isPending || mutations.updateMutation.isPending;
  const orderNoDisplay =
    !isNew && queries.order
      ? (queries.order.orderNo ?? `#${queries.order.id}`)
      : "자동 채번";

  const registrantDisplay = user
    ? user.name
      ? `${user.name} (사번 ${user.employeeNo})`
      : `사번 ${user.employeeNo}`
    : "—";

  return (
    <>
      <PageMeta
        title={isNew ? "발주 등록" : "발주 수정"}
        description={isNew ? "발주 등록" : "발주 수정"}
      />
      <PageBreadcrumb pageTitle={isNew ? "발주 등록" : "발주 수정"} />

      <form
        className="space-y-6"
        onSubmit={handleSubmit}
        key={isNew ? "new" : queries.order ? `edit-${queries.order.id}` : "loading"}
      >
        <OrderBasicInfoSection
          isNew={isNew}
          orderNoDisplay={orderNoDisplay}
          registrantDisplay={registrantDisplay}
          title={form.title}
          onTitleChange={form.setTitle}
          onTitleManualEdit={() => form.setIsTitleAutoFilled(false)}
          orderDate={form.orderDate}
          onOrderDateChange={form.setOrderDate}
          dueDate={form.dueDate}
          onDueDateChange={form.setDueDate}
          partnerId={form.partnerId}
          onPartnerIdChange={form.setPartnerId}
          partnerSelectOptions={selectOptions.partnerSelectOptions}
          requesterUserSelectValue={form.requesterUserSelectValue}
          onRequesterUserSelectValueChange={form.setRequesterUserSelectValue}
          requesterUserOptions={form.requesterUserOptions}
          employeeDirectoryLoading={queries.employeeDirectoryLoading}
          employeeDirectoryError={queries.employeeDirectoryError}
          vendorOrderNo={form.vendorOrderNo}
          onVendorOrderNoChange={form.setVendorOrderNo}
          vendorRequest={form.vendorRequest}
          onVendorRequestChange={form.setVendorRequest}
          specialNote={form.specialNote}
          onSpecialNoteChange={form.setSpecialNote}
          isPending={isPending}
          pendingFilesForCreate={form.pendingFilesForCreate}
          files={queries.files as PurchaseOrderFile[]}
          isFileUploadPending={mutations.fileUploadMutation.isPending}
          isFileDeletePending={mutations.fileDeleteMutation.isPending}
          uploadingExistingFileNames={form.uploadingExistingFileNames}
          recentlyUploadedFileNames={form.recentlyUploadedFileNames}
          onError={(message) => notify.error(message)}
          onSelectCreateFiles={form.addPendingFileForCreate}
          onRemoveCreateFile={form.removePendingFileForCreate}
          onUploadExistingFiles={(incomingFiles) => {
            if (incomingFiles.length === 0) return;
            const names = incomingFiles.map((file) => file.name);
            form.setUploadingExistingFileNames((prev) => [
              ...prev,
              ...names.filter((name) => !prev.includes(name)),
            ]);
            mutations.fileUploadMutation.mutate(incomingFiles, {
              onSuccess: () => {
                names.forEach((name) => form.markFileUploadCompleted(name));
              },
              onSettled: () => {
                form.setUploadingExistingFileNames((prev) =>
                  prev.filter((name) => !names.includes(name))
                );
              },
            });
          }}
          onDeleteExistingFile={(fileId) => form.setFileDeleteConfirmId(fileId)}
        />

        <OrderLineEditorSection
          isNew={isNew}
          lineLayoutEditable={isNew || form.canEditExistingOrder}
          items={form.items}
          editingLineIds={form.editingLineIds}
          productSelectOptions={selectOptions.productSelectOptions}
          lensSelectOptions={selectOptions.lensSelectOptions}
          detectorSelectOptions={queries.detectorSelectOptions}
          detectorLabelById={queries.detectorLabelById}
          unitOptions={selectOptions.unitOptions}
          currencyOptions={selectOptions.currencyOptions}
          exchangeRateCurrencyCode={form.exchangeRateCurrencyCode}
          exchangeRateInput={form.exchangeRateInput}
          onExchangeRateCurrencyChange={form.setExchangeRateCurrencyCode}
          onExchangeRateInputChange={form.setExchangeRateInput}
          isLineCreatePending={mutations.lineCreateMutation.isPending}
          isLineUpdatePending={mutations.lineUpdateMutation.isPending}
          isLineDeletePending={mutations.lineDeleteMutation.isPending}
          recentlySavedLineIds={form.recentlySavedLineIds}
          onAddItemRow={form.addItemRow}
          onSetLineProductId={form.setLineProductId}
          onSetLineLensId={form.setLineLensId}
          onSetLineDetectorId={form.setLineDetectorId}
          onUpdateItemRow={form.updateItemRow}
          onRemoveItemRow={form.removeItemRow}
          onSaveLine={saveLine}
          onCancelLineEdit={form.cancelLineEdit}
          onBeginLineEdit={form.beginLineEdit}
          onRemoveLine={form.removeLine}
        />

        <FormActionBar
          submitLabel={isNew ? "등록" : "수정"}
          pendingSubmitLabel="저장 중..."
          isPending={isPending}
          onCancel={requestLeave}
        >
          {isNew ? (
            <span className="text-theme-sm text-gray-500 dark:text-gray-400">
              발주번호·ID는 등록 완료 시 자동 부여됩니다.
            </span>
          ) : null}
        </FormActionBar>
      </form>

      <ConfirmModal
        isOpen={form.lineDeleteConfirmIndex != null}
        title="발주 라인을 삭제할까요?"
        message="삭제 후 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={mutations.lineDeleteMutation.isPending}
        onClose={() => form.setLineDeleteConfirmIndex(null)}
        onConfirm={() => {
          if (form.lineDeleteConfirmIndex == null) return;
          const row = form.items[form.lineDeleteConfirmIndex];
          if (!row) {
            form.setLineDeleteConfirmIndex(null);
            return;
          }
          if (!row.lineId) {
            form.removeItemRow(form.lineDeleteConfirmIndex);
            form.setLineDeleteConfirmIndex(null);
            return;
          }
          mutations.lineDeleteMutation.mutate(row.lineId, {
            onSettled: () => form.setLineDeleteConfirmIndex(null),
          });
        }}
      />

      <ConfirmModal
        isOpen={form.fileDeleteConfirmId != null}
        title="첨부파일을 삭제할까요?"
        message="삭제 후 되돌릴 수 없습니다."
        confirmText="삭제"
        cancelText="취소"
        confirmVariant="danger"
        isConfirming={mutations.fileDeleteMutation.isPending}
        onClose={() => form.setFileDeleteConfirmId(null)}
        onConfirm={() => {
          if (form.fileDeleteConfirmId == null) return;
          mutations.fileDeleteMutation.mutate(form.fileDeleteConfirmId, {
            onSettled: () => form.setFileDeleteConfirmId(null),
          });
        }}
      />

      <ConfirmLeaveModal
        isOpen={leaveModalOpen}
        onClose={onLeaveCancel}
        onConfirm={onLeaveConfirm}
      />
    </>
  );
}
