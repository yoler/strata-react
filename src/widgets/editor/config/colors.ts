export type EditorColorItem = {
  label: string;
  value: string;
};

export const editorTextColors: EditorColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#6b7280" },
  { label: "Brown", value: "#92400e" },
  { label: "Orange", value: "#ea580c" },
  { label: "Yellow", value: "#ca8a04" },
  { label: "Green", value: "#16a34a" },
  { label: "Blue", value: "#2563eb" },
  { label: "Purple", value: "#7c3aed" },
  { label: "Pink", value: "#db2777" },
  { label: "Red", value: "#dc2626" },
];

export const editorBackgroundColors: EditorColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "var(--tt-highlight-gray)" },
  { label: "Brown", value: "var(--tt-highlight-brown)" },
  { label: "Orange", value: "var(--tt-highlight-orange)" },
  { label: "Yellow", value: "var(--tt-highlight-yellow)" },
  { label: "Green", value: "var(--tt-highlight-green)" },
  { label: "Blue", value: "var(--tt-highlight-blue)" },
  { label: "Purple", value: "var(--tt-highlight-purple)" },
  { label: "Pink", value: "var(--tt-highlight-pink)" },
  { label: "Red", value: "var(--tt-highlight-red)" },
];
