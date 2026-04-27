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

export const MENU_TITLE_BY_KIND: Record<MenuNodeKind, string> = {
  text: "Text",
  heading: "Heading",
  blockquote: "Blockquote",
  bulletList: "Bullet list",
  orderedList: "Numbered list",
  taskList: "To-do list",
  codeBlock: "Code Block",
  image: "Image",
  imageUpload: "Image",
  video: "Video",
  divider: "Separator",
  table: "Table",
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
