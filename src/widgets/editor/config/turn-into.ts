import type { TurnIntoValue } from "../lib/turn-into";

export type TurnIntoOption = {
  label: string;
  value: TurnIntoValue;
};

export const TURN_INTO_OPTIONS: TurnIntoOption[] = [
  { label: "Text", value: "text" },
  { label: "Heading 1", value: "heading-1" },
  { label: "Heading 2", value: "heading-2" },
  { label: "Heading 3", value: "heading-3" },
  { label: "Bullet list", value: "bullet-list" },
  { label: "Numbered list", value: "numbered-list" },
  { label: "To-do list", value: "todo-list" },
  { label: "Quote", value: "quote" },
  { label: "Code block", value: "code-block" },
];
