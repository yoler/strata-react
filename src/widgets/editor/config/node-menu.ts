export type MenuNodeKind =
  | "text"
  | "heading"
  | "blockquote"
  | "bulletList"
  | "orderedList"
  | "taskList"
  | "codeBlock"
  | "image"
  | "imageUpload"
  | "video"
  | "divider"
  | "table";

export const MENU_TITLE_KEY_BY_KIND: Record<MenuNodeKind, string> = {
  text: "blocks.text",
  heading: "blocks.heading",
  blockquote: "blocks.blockquote",
  bulletList: "blocks.bullet-list",
  orderedList: "blocks.numbered-list",
  taskList: "blocks.todo-list",
  codeBlock: "blocks.code-block",
  image: "blocks.image",
  imageUpload: "blocks.image",
  video: "blocks.video",
  divider: "blocks.divider",
  table: "blocks.table",
};

const NODE_KIND_BY_TYPE: Record<string, MenuNodeKind> = {
  paragraph: "text",
  heading: "heading",
  blockquote: "blockquote",
  bulletList: "bulletList",
  orderedList: "orderedList",
  taskList: "taskList",
  codeBlock: "codeBlock",
  image: "image",
  imageUpload: "imageUpload",
  videoEmbed: "video",
  videoEmbedInput: "video",
  horizontalRule: "divider",
  table: "table",
};

export function getMenuNodeKind(typeName: string) {
  return NODE_KIND_BY_TYPE[typeName] ?? null;
}
