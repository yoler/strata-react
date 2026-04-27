import type { TurnIntoValue } from "../lib/turn-into";

export type TurnIntoOption = {
  label: string;
  labelKey: string;
  value: TurnIntoValue;
};

export const TURN_INTO_OPTIONS: TurnIntoOption[] = [
  { label: "Text", labelKey: "blocks.text", value: "text" },
  { label: "Heading 1", labelKey: "blocks.heading-1", value: "heading-1" },
  { label: "Heading 2", labelKey: "blocks.heading-2", value: "heading-2" },
  { label: "Heading 3", labelKey: "blocks.heading-3", value: "heading-3" },
  { label: "Bullet list", labelKey: "blocks.bullet-list", value: "bullet-list" },
  { label: "Numbered list", labelKey: "blocks.numbered-list", value: "numbered-list" },
  { label: "To-do list", labelKey: "blocks.todo-list", value: "todo-list" },
  { label: "Quote", labelKey: "blocks.quote", value: "quote" },
  { label: "Code block", labelKey: "blocks.code-block", value: "code-block" },
];
