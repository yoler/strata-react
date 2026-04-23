import type { JSONContent as TiptapJSONContent } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import type { Editor } from "@tiptap/react";

export type TurnIntoValue =
  | "text"
  | "heading-1"
  | "heading-2"
  | "heading-3"
  | "bullet-list"
  | "numbered-list"
  | "todo-list"
  | "quote"
  | "code-block";

export type ContainerBlockKind = "blockquote" | "bulletList" | "orderedList" | "taskList";

export type ContainerBlockTarget = {
  kind: ContainerBlockKind;
  node: ProseMirrorNode;
  pos: number;
};

type JSONContent = TiptapJSONContent & {
  type: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: Array<Record<string, unknown>>;
  text?: string;
};

const containerBlockKinds = new Set<ContainerBlockKind>(["blockquote", "bulletList", "orderedList", "taskList"]);

export function isContainerBlockKind(kind: string): kind is ContainerBlockKind {
  return containerBlockKinds.has(kind as ContainerBlockKind);
}

export function getSelectionContainerBlockTarget(editor: Editor): ContainerBlockTarget | null {
  const { $from, $to } = editor.state.selection;
  const maxDepth = Math.min($from.depth, $to.depth);

  for (let depth = maxDepth; depth > 0; depth -= 1) {
    const kind = $from.node(depth).type.name;

    if (!isContainerBlockKind(kind)) {
      continue;
    }

    if ($from.before(depth) !== $to.before(depth)) {
      continue;
    }

    return {
      kind,
      node: $from.node(depth),
      pos: $from.before(depth),
    };
  }

  return null;
}

function extractContainerTextblocks(target: ContainerBlockTarget): JSONContent[] {
  const blocks: JSONContent[] = [];

  if (target.kind === "blockquote") {
    target.node.forEach((childNode) => {
      if (childNode.isTextblock) {
        blocks.push((childNode.toJSON() as JSONContent) ?? { type: "paragraph" });
      }
    });

    return blocks;
  }

  target.node.forEach((childNode) => {
    childNode.forEach((grandChildNode) => {
      if (grandChildNode.isTextblock) {
        blocks.push((grandChildNode.toJSON() as JSONContent) ?? { type: "paragraph" });
      }
    });
  });

  return blocks;
}

export function buildContainerReplacement(
  target: ContainerBlockTarget,
  type: TurnIntoValue,
): JSONContent | JSONContent[] | null {
  const blocks = extractContainerTextblocks(target).map((block) => ({
    ...block,
    type: "paragraph",
  }));

  if (!blocks.length) {
    blocks.push({ type: "paragraph" });
  }

  switch (type) {
    case "text":
      return blocks;
    case "heading-1":
      return blocks.map((block) => ({ ...block, type: "heading", attrs: { level: 1 } }));
    case "heading-2":
      return blocks.map((block) => ({ ...block, type: "heading", attrs: { level: 2 } }));
    case "heading-3":
      return blocks.map((block) => ({ ...block, type: "heading", attrs: { level: 3 } }));
    case "bullet-list":
      return {
        type: "bulletList",
        content: blocks.map((block) => ({
          type: "listItem",
          content: [block],
        })),
      };
    case "numbered-list":
      return {
        type: "orderedList",
        content: blocks.map((block) => ({
          type: "listItem",
          content: [block],
        })),
      };
    case "todo-list":
      return {
        type: "taskList",
        content: blocks.map((block) => ({
          type: "taskItem",
          attrs: { checked: false },
          content: [block],
        })),
      };
    case "quote":
      return {
        type: "blockquote",
        content: blocks,
      };
    case "code-block":
      return {
        type: "codeBlock",
        attrs: { language: "plaintext" },
        content: [
          {
            type: "text",
            text: blocks.map((block) => block.content?.map((child) => child.text ?? "").join("") ?? "").join("\n"),
          },
        ],
      };
    default:
      return null;
  }
}

export function replaceContainerBlock(editor: Editor, target: ContainerBlockTarget, type: TurnIntoValue) {
  const replacement = buildContainerReplacement(target, type);

  if (!replacement) {
    return false;
  }

  return editor
    .chain()
    .focus()
    .deleteRange({ from: target.pos, to: target.pos + target.node.nodeSize })
    .insertContentAt(target.pos, replacement)
    .run();
}
