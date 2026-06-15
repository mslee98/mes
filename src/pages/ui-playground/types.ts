export type UiPlaygroundTab = "general" | "form" | "table";

export const UI_PLAYGROUND_TAB_OPTIONS: Array<{
  value: UiPlaygroundTab;
  label: string;
}> = [
  { value: "general", label: "General" },
  { value: "form", label: "Form" },
  { value: "table", label: "Table" },
];
