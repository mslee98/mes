/**
 * ItemForm.tsx 전용 한글 문구.
 * 인코딩 깨짐 방지: 한글을 Unicode escape(\uXXXX)로만 정의합니다.
 * 원화/포맷팅 수정 시 이 파일은 건드리지 않으면 됩니다.
 */
export const itemFormStrings = {
  commentInitialSnapshot:
    "\uC218\uC815 \uC2DC \uBE44\uAD50\uC6A9 \uCD08\uAE30\uAC12 (isNew/item \uAE30\uC900\uC73C\uB85C \uB80C\uB354 \uC2DC\uC810\uC5D0 \uACC4\uC0B0)",
  commentSyncState:
    "\uC11C\uBC84\uC5D0\uC11C item \uB85C\uB4DC \uC2DC \uD328\uC2A4 \uC0AC\uD0C0 \uB3D9\uAE30\uD654",

  optionCategory: "\uBD84\uB958 \uC120\uD0A9",
  optionType: "\uC720\uD615 \uC120\uD0A9",
  optionUnit: "\uB2E8\uC704 \uC120\uD0A9",
  optionExistingValue: "\uAE30\uC874\uAC12",
  currencyKrwLabel: "\uC6D0 (KRW)",
  currencyKrwSymbol: "\uC6D0",
  selectCurrency: "\uD1B5\uD654 \uC120\uD0A9",

  toastCreateSuccess: "\uD488\uBAA9\uC774 \uB4F1\uB85D\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  toastUpdateSuccess: "\uD488\uBAA9\uC774 \uC218\uC815\uB418\uC5C8\uC2B5\uB2C8\uB2E4.",
  toastCreateError: "\uB4F1\uB85D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  toastUpdateError: "\uC218\uC815\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.",
  toastCodeRequired: "\uD488\uBAA9 \uCF54\uB4DC\uB97C \uC785\uB825\uD558\uC138\uC694.",
  toastNameRequired: "\uD488\uBAA9\uBA85\uC744 \uC785\uB825\uD558\uC138\uC694.",
  toastCategoryRequired: "\uD488\uBAA9 \uBD84\uB958\uB97C \uC120\uD0A9\uD558\uC138\uC694.",
  toastTypeRequired: "\uD488\uBAA9 \uC720\uD615\uC744 \uC120\uD0A9\uD558\uC138\uC694.",

  pageTitleCreate: "\uD488\uBAA9 \uB4F1\uB85D",
  pageTitleEdit: "\uD488\uBAA9 \uC218\uC815",
  loadingMessage: "\uD488\uBAA9 \uC815\uB82C\uC744 \uBD80\uB974\uB294 \uC911...",
  cardDesc:
    "\uD488\uBAA9 \uBD84\uB958\uC640 \uC720\uD615\uC744 \uC120\uD0A9\uD55C \uB2E4 \uCF54\uB4DC, \uD488\uBAA9\uBA85, \uB2E8\uAC00 \uB4E4\uC744 \uC785\uB825\uD558\uC138\uC694.",

  labelCode: "\uD488\uBAA9 \uCF54\uB4DC *",
  labelName: "\uD488\uBAA9\uBA85 *",
  labelCategory: "\uD488\uBAA9 \uBD84\uB958 *",
  labelType: "\uD488\uBAA9 \uC720\uD615 *",
  labelUnit: "\uB2E8\uC704",
  labelPrice: "\uB2E8\uAC00",
  labelSpec: "\uADDC\uD615",
  labelProductDiv: "\uC81C\uD488 \uAD6C\uBD84",
  labelActive: "\uD65C\uC131",

  placeholderCode: "\uD488\uBAA9 \uCF54\uB4DC",
  placeholderName: "\uD488\uBAA9\uBA85",
  placeholderSpec: "\uADDC\uD615",
  placeholderProductDiv: "\uC81C\uD488 \uAD6C\uBD84",

  buttonSaving: "\uC800\uC7A5 \uC911...",
  buttonCreate: "\uB4F1\uB85D",
  buttonUpdate: "\uC218\uC815",
  buttonCancel: "\uCDE8\uC18C",
} as const;
