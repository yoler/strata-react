export type EditorColorItem = {
  label: string;
  labelKey: string;
  value: string;
};

export const editorTextColors: EditorColorItem[] = [
  { label: "Default", labelKey: "colors.default", value: "" },
  { label: "Gray", labelKey: "colors.gray", value: "#6b7280" },
  { label: "Brown", labelKey: "colors.brown", value: "#92400e" },
  { label: "Orange", labelKey: "colors.orange", value: "#ea580c" },
  { label: "Yellow", labelKey: "colors.yellow", value: "#ca8a04" },
  { label: "Green", labelKey: "colors.green", value: "#16a34a" },
  { label: "Blue", labelKey: "colors.blue", value: "#2563eb" },
  { label: "Purple", labelKey: "colors.purple", value: "#7c3aed" },
  { label: "Pink", labelKey: "colors.pink", value: "#db2777" },
  { label: "Red", labelKey: "colors.red", value: "#dc2626" },
];

export const editorBackgroundColors: EditorColorItem[] = [
  { label: "Default", labelKey: "colors.default", value: "" },
  { label: "Gray", labelKey: "colors.gray", value: "var(--tt-highlight-gray)" },
  { label: "Brown", labelKey: "colors.brown", value: "var(--tt-highlight-brown)" },
  { label: "Orange", labelKey: "colors.orange", value: "var(--tt-highlight-orange)" },
  { label: "Yellow", labelKey: "colors.yellow", value: "var(--tt-highlight-yellow)" },
  { label: "Green", labelKey: "colors.green", value: "var(--tt-highlight-green)" },
  { label: "Blue", labelKey: "colors.blue", value: "var(--tt-highlight-blue)" },
  { label: "Purple", labelKey: "colors.purple", value: "var(--tt-highlight-purple)" },
  { label: "Pink", labelKey: "colors.pink", value: "var(--tt-highlight-pink)" },
  { label: "Red", labelKey: "colors.red", value: "var(--tt-highlight-red)" },
];
