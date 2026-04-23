import type { Editor } from "@tiptap/core";
import { DragHandle as TiptapDragHandle } from "@tiptap/extension-drag-handle-react";
import { NodeSelection, TextSelection, type Command } from "@tiptap/pm/state";
import { CellSelection, deleteCellSelection, setCellAttr, TableMap } from "@tiptap/pm/tables";
import { AlignCenter, AlignLeft, AlignRight, Code, Copy, Download, Eraser, GripVertical, Heading1, Heading2, Heading3, List, ListOrdered, ListTodo, Maximize2, PaintBucket, Pilcrow, Plus, Quote, Repeat, RotateCcw, Trash2 } from "lucide-react";
import { useCallback, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { isContainerBlockKind, replaceContainerBlock, type TurnIntoValue } from "../lib/turn-into";

type ColorItem = {
  label: string;
  value: string;
};

type MenuNodeKind =
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

type MenuTarget = {
  kind: MenuNodeKind;
  node: NonNullable<ReturnType<Editor["state"]["doc"]["nodeAt"]>>;
  pos: number;
};

type OpenSubMenu = "block-color" | "block-turn-into" | "table-alignment" | "table-color" | null;

const tableTextColors: ColorItem[] = [
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

const tableBackgroundColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Brown", value: "#f3e8dc" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
];

const blockTextColors: ColorItem[] = [
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

const blockHighlightColors: ColorItem[] = [
  { label: "Default", value: "" },
  { label: "Gray", value: "#f3f4f6" },
  { label: "Brown", value: "#f3e8dc" },
  { label: "Orange", value: "#ffedd5" },
  { label: "Yellow", value: "#fef9c3" },
  { label: "Green", value: "#dcfce7" },
  { label: "Blue", value: "#dbeafe" },
  { label: "Purple", value: "#ede9fe" },
  { label: "Pink", value: "#fce7f3" },
  { label: "Red", value: "#fee2e2" },
];

const turnIntoItems = [
  { label: "Text", value: "text", icon: Pilcrow },
  { label: "Heading 1", value: "heading-1", icon: Heading1 },
  { label: "Heading 2", value: "heading-2", icon: Heading2 },
  { label: "Heading 3", value: "heading-3", icon: Heading3 },
  { label: "Bullet list", value: "bullet-list", icon: List },
  { label: "Numbered list", value: "numbered-list", icon: ListOrdered },
  { label: "To-do list", value: "todo-list", icon: ListTodo },
  { label: "Quote", value: "quote", icon: Quote },
  { label: "Code block", value: "code-block", icon: Code },
] as const;

const menuTitleMap: Record<MenuNodeKind, string> = {
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

export function DragHandle({ editor }: { editor: Editor }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<OpenSubMenu>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [currentTargetState, setCurrentTargetState] = useState<MenuTarget | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const isGripPressingRef = useRef(false);
  const currentNodePosRef = useRef<number>(-1);
  const currentNodeRef = useRef<NonNullable<ReturnType<Editor["state"]["doc"]["nodeAt"]>> | null>(null);

  const releaseEditorFocusForModalMenu = useCallback(() => {
    const activeElement = document.activeElement;

    if (!(activeElement instanceof HTMLElement)) {
      return;
    }

    try {
      if (editor.view.dom.contains(activeElement)) {
        activeElement.blur();
      }
    } catch {
      // The editor can be temporarily unavailable during teardown; focus cleanup is best-effort.
    }
  }, [editor]);

  const setMenuVisibility = (open: boolean) => {
    if (open) {
      releaseEditorFocusForModalMenu();
    }

    if (!open) {
      setOpenSubMenu(null);
    }

    if (!open) {
      if (isGripPressingRef.current) {
        setMenuOpen(false);
        return;
      }

      const current = getCurrentTarget();
      const { doc, selection, tr } = editor.state;

      if (selection instanceof CellSelection && current?.kind === "table") {
        const map = TableMap.get(current.node);
        const firstCell = current.pos + 1 + map.map[0];
        editor.view.dispatch(tr.setSelection(TextSelection.near(doc.resolve(firstCell + 1), 1)));
      } else if (selection instanceof NodeSelection && current) {
        const afterPos = Math.min(current.pos + current.node.nodeSize, doc.content.size);
        editor.view.dispatch(tr.setSelection(TextSelection.near(doc.resolve(afterPos), 1)));
      }
    }

    setMenuOpen(open);
  };

  const getCurrentNode = () => {
    const pos = currentNodePosRef.current;
    const node = currentNodeRef.current;

    if (pos < 0 || !node) {
      return null;
    }

    return { node, pos };
  };

  const getCurrentTarget = (): MenuTarget | null => {
    const current = getCurrentNode();

    if (!current) {
      return null;
    }

    const currentTypeName = current.node.type.name;

    if (currentTypeName === "table") return { kind: "table", node: current.node, pos: current.pos };
    if (currentTypeName === "image") return { kind: "image", node: current.node, pos: current.pos };
    if (currentTypeName === "imageUpload") return { kind: "imageUpload", node: current.node, pos: current.pos };
    if (currentTypeName === "videoEmbed" || currentTypeName === "videoEmbedInput") return { kind: "video", node: current.node, pos: current.pos };
    if (currentTypeName === "codeBlock") return { kind: "codeBlock", node: current.node, pos: current.pos };
    if (currentTypeName === "blockquote") return { kind: "blockquote", node: current.node, pos: current.pos };
    if (currentTypeName === "taskList") return { kind: "taskList", node: current.node, pos: current.pos };
    if (currentTypeName === "bulletList") return { kind: "bulletList", node: current.node, pos: current.pos };
    if (currentTypeName === "orderedList") return { kind: "orderedList", node: current.node, pos: current.pos };
    if (currentTypeName === "heading") return { kind: "heading", node: current.node, pos: current.pos };
    if (currentTypeName === "horizontalRule") return { kind: "divider", node: current.node, pos: current.pos };
    if (currentTypeName === "paragraph") return { kind: "text", node: current.node, pos: current.pos };

    const resolvedPos = editor.state.doc.resolve(Math.min(current.pos + 1, editor.state.doc.content.size));

    for (let depth = resolvedPos.depth; depth > 0; depth -= 1) {
      const node = resolvedPos.node(depth);
      const pos = resolvedPos.before(depth);
      const typeName = node.type.name;

      if (typeName === "table") return { kind: "table", node, pos };
      if (typeName === "image") return { kind: "image", node, pos };
      if (typeName === "imageUpload") return { kind: "imageUpload", node, pos };
      if (typeName === "videoEmbed" || typeName === "videoEmbedInput") return { kind: "video", node, pos };
      if (typeName === "codeBlock") return { kind: "codeBlock", node, pos };
      if (typeName === "blockquote") return { kind: "blockquote", node, pos };
      if (typeName === "taskList") return { kind: "taskList", node, pos };
      if (typeName === "bulletList") return { kind: "bulletList", node, pos };
      if (typeName === "orderedList") return { kind: "orderedList", node, pos };
      if (typeName === "heading") return { kind: "heading", node, pos };
      if (typeName === "horizontalRule") return { kind: "divider", node, pos };
      if (typeName === "paragraph") return { kind: "text", node, pos };
    }

    return { kind: "text", node: current.node, pos: current.pos };
  };

  const getCurrentTable = () => {
    const current = getCurrentTarget();

    if (current?.kind !== "table") {
      return null;
    }

    return current;
  };

  const getTargetFocusPos = (target: MenuTarget) => {
    if (target.node.isTextblock) {
      return target.pos + 1;
    }

    let focusPos: number | null = null;

    target.node.descendants((node, pos) => {
      if (!node.isTextblock) {
        return true;
      }

      focusPos = target.pos + 1 + pos + 1;
      return false;
    });

    return focusPos ?? Math.min(target.pos + 1, editor.state.doc.content.size);
  };

  const selectWholeTable = () => {
    const table = getCurrentTable();

    if (!table) {
      return false;
    }

    const map = TableMap.get(table.node);
    const firstCell = table.pos + 1 + map.map[0];
    const lastCell = table.pos + 1 + map.map[map.map.length - 1];
    editor.view.dispatch(editor.state.tr.setSelection(CellSelection.create(editor.state.doc, firstCell, lastCell)));
    editor.view.focus();
    return true;
  };

  const runTableCommand = (command: Command) => {
    const didRun = command(editor.state, editor.view.dispatch);

    if (didRun) {
      editor.view.focus();
    }

    return didRun;
  };

  const selectCurrentBlock = () => {
    const target = getCurrentTarget();

    if (!target) {
      return false;
    }

    editor.view.dispatch(editor.state.tr.setSelection(NodeSelection.create(editor.state.doc, target.pos)));
    editor.view.focus();
    return true;
  };

  const getTargetTextRanges = (target: MenuTarget) => {
    const ranges: Array<{ from: number; to: number }> = [];

    target.node.descendants((node, pos) => {
      if (!node.isText) {
        return true;
      }

      const from = target.pos + 1 + pos;
      ranges.push({ from, to: from + node.nodeSize });
      return false;
    });

    return ranges;
  };

  const unsetTargetBlockBackground = (target: MenuTarget, transaction = editor.state.tr) => {
    if ("blockBackgroundColor" in target.node.attrs) {
      transaction.setNodeMarkup(target.pos, undefined, {
        ...target.node.attrs,
        blockBackgroundColor: null,
      });
    }

    target.node.descendants((node, pos) => {
      if (!("blockBackgroundColor" in node.attrs)) {
        return true;
      }

      transaction.setNodeMarkup(target.pos + 1 + pos, undefined, {
        ...node.attrs,
        blockBackgroundColor: null,
      });
      return true;
    });

    return transaction;
  };

  const dispatchTargetTransaction = (transaction: typeof editor.state.tr) => {
    if (transaction.docChanged) {
      editor.view.dispatch(transaction);
    }

    editor.view.focus();
  };

  const handleAddBlock = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const current = getCurrentNode();

    if (current) {
      const isEmptyTextBlock = current.node.isTextblock && current.node.textContent.trim() === "";
      const isSlashOnlyTextBlock = current.node.isTextblock && current.node.textContent.trim() === "/";

      if (isEmptyTextBlock) {
        editor.chain().focus(current.pos + 1).insertContent("/").run();
        return;
      }

      if (isSlashOnlyTextBlock) {
        const from = current.pos + 1;
        const to = current.pos + current.node.nodeSize - 1;

        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, "/").setTextSelection(from + 1).run();
        return;
      }

      const endOfBlock = current.pos + current.node.nodeSize;
      editor
        .chain()
        .focus()
        .insertContentAt(endOfBlock, { type: "paragraph" })
        .setTextSelection(endOfBlock + 1)
        .insertContent("/")
        .run();
      return;
    }

    const { $head } = editor.state.selection;
    const endOfBlock = $head.end($head.depth) + 1;

    editor
      .chain()
      .focus()
      .insertContentAt(endOfBlock, { type: "paragraph" })
      .setTextSelection(endOfBlock + 1)
      .insertContent("/")
      .run();
  };

  const handleGripPointerDown = (event: React.PointerEvent<HTMLButtonElement>) => {
    isGripPressingRef.current = true;
    isDraggingRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };

    if (getCurrentTarget()?.kind === "table") {
      selectWholeTable();
    } else {
      selectCurrentBlock();
    }

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startPosRef.current.x;
      const dy = moveEvent.clientY - startPosRef.current.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        isDraggingRef.current = true;
      }
    };

    const handlePointerUp = () => {
      document.removeEventListener("pointermove", handlePointerMove);
      document.removeEventListener("pointerup", handlePointerUp);
      isGripPressingRef.current = false;

      if (!isDraggingRef.current) {
        setMenuVisibility(true);
      } else {
        setMenuVisibility(false);
      }
    };

    document.addEventListener("pointermove", handlePointerMove);
    document.addEventListener("pointerup", handlePointerUp);
  };

  const deleteNode = () => {
    const current = getCurrentTarget();

    if (!current) {
      return;
    }

    editor
      .chain()
      .focus()
      .deleteRange({ from: current.pos, to: current.pos + current.node.nodeSize })
      .run();
    setMenuVisibility(false);
  };

  const duplicateNode = () => {
    const current = getCurrentTarget();

    if (!current) {
      return;
    }

    editor
      .chain()
      .focus()
      .insertContentAt(current.pos + current.node.nodeSize, current.node.toJSON())
      .run();
    setMenuVisibility(false);
  };

  const turnInto = (type: TurnIntoValue) => {
    const target = getCurrentTarget();

    if (!target) {
      return;
    }

    if (isContainerBlockKind(target.kind)) {
      if (
        replaceContainerBlock(editor, {
          kind: target.kind,
          node: target.node,
          pos: target.pos,
        }, type)
      ) {
        setMenuVisibility(false);
        return;
      }
    }

    const chain = editor.chain().focus(getTargetFocusPos(target)).clearNodes();

    switch (type) {
      case "text":
        chain.setParagraph().run();
        break;
      case "heading-1":
        chain.setHeading({ level: 1 }).run();
        break;
      case "heading-2":
        chain.setHeading({ level: 2 }).run();
        break;
      case "heading-3":
        chain.setHeading({ level: 3 }).run();
        break;
      case "bullet-list":
        chain.wrapInList("bulletList").run();
        break;
      case "numbered-list":
        chain.wrapInList("orderedList").run();
        break;
      case "todo-list":
        chain.toggleTaskList().run();
        break;
      case "quote":
        chain.setBlockquote().run();
        break;
      case "code-block":
        chain.setCodeBlock().run();
        break;
      default:
        break;
    }

    setMenuVisibility(false);
  };

  const setBlockTextColor = (color?: string) => {
    const target = getCurrentTarget();

    if (!target) {
      return;
    }

    const textStyleMark = editor.state.schema.marks.textStyle;

    if (!textStyleMark) {
      setMenuVisibility(false);
      return;
    }

    const tr = editor.state.tr;
    getTargetTextRanges(target).forEach(({ from, to }) => {
      tr.removeMark(from, to, textStyleMark);

      if (color) {
        tr.addMark(from, to, textStyleMark.create({ color }));
      }
    });

    dispatchTargetTransaction(tr);
    setMenuVisibility(false);
  };

  const setBlockHighlightColor = (color?: string) => {
    const target = getCurrentTarget();

    if (!target) {
      return;
    }

    editor
      .chain()
      .focus(getTargetFocusPos(target))
      .setBlockBackgroundColor(color)
      .run();

    setMenuVisibility(false);
  };

  const resetFormatting = () => {
    const target = getCurrentTarget();

    if (!target) {
      return;
    }

    const tr = unsetTargetBlockBackground(target);
    getTargetTextRanges(target).forEach(({ from, to }) => {
      tr.removeMark(from, to);
    });
    dispatchTargetTransaction(tr);
    setMenuVisibility(false);
  };

  const downloadImage = () => {
    const target = getCurrentTarget();
    const src = target?.kind === "image" ? ((target.node.attrs.src as string | undefined) ?? "") : "";

    if (!src) {
      return;
    }

    const link = document.createElement("a");
    link.href = src;
    link.download = src.split("/").pop() || "image";
    link.rel = "noopener noreferrer";
    document.body.append(link);
    link.click();
    link.remove();
    setMenuVisibility(false);
  };

  const setTableAlign = (align: "left" | "center" | "right") => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(setCellAttr("textAlign", align));
  };

  const setTableColor = (attr: "backgroundColor" | "textColor", value: string) => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(setCellAttr(attr, value || null));
    setMenuVisibility(false);
  };

  const getTableCellAttrs = (
    table: MenuTarget | null,
    attr: "backgroundColor" | "textAlign" | "textColor",
  ) => {
    if (table?.kind !== "table") {
      return null;
    }

    const values = new Set<string>();
    table.node.descendants((node) => {
      if (node.type.name === "tableCell" || node.type.name === "tableHeader") {
        values.add(node.attrs[attr] ?? "");
      }
    });

    if (values.size !== 1) {
      return null;
    }

    return values.values().next().value ?? "";
  };

  const clearTableContents = () => {
    if (!selectWholeTable()) {
      return;
    }

    runTableCommand(deleteCellSelection);
    setMenuVisibility(false);
  };

  const fitTableToWidth = () => {
    const table = getCurrentTable();

    if (!table) {
      return;
    }

    const map = TableMap.get(table.node);
    const tr = editor.state.tr;
    map.map.forEach((cellOffset) => {
      const cellPos = table.pos + 1 + cellOffset;
      const cell = tr.doc.nodeAt(cellPos);

      if (cell?.attrs.colwidth) {
        tr.setNodeMarkup(cellPos, null, { ...cell.attrs, colwidth: null });
      }
    });

    if (tr.docChanged) {
      editor.view.dispatch(tr);
    }

    selectWholeTable();
    setMenuVisibility(false);
  };

  const currentTarget = currentTargetState;
  const isTableMenu = currentTarget?.kind === "table";
  const tableTextColor = isTableMenu ? getTableCellAttrs(currentTarget, "textColor") : null;
  const tableBackgroundColor = isTableMenu ? getTableCellAttrs(currentTarget, "backgroundColor") : null;
  const tableTextAlign = isTableMenu ? getTableCellAttrs(currentTarget, "textAlign") : null;
  const blockBackgroundColor =
    currentTarget && "blockBackgroundColor" in currentTarget.node.attrs
      ? ((currentTarget.node.attrs.blockBackgroundColor as string | null | undefined) ?? "")
      : "";
  const menuTitle = currentTarget ? menuTitleMap[currentTarget.kind] : menuTitleMap.text;
  const canColor =
    currentTarget?.kind === "text" ||
    currentTarget?.kind === "heading" ||
    currentTarget?.kind === "blockquote" ||
    currentTarget?.kind === "bulletList" ||
    currentTarget?.kind === "orderedList" ||
    currentTarget?.kind === "taskList";
  const canTurnInto =
    currentTarget?.kind !== "table" &&
    currentTarget?.kind !== "image" &&
    currentTarget?.kind !== "imageUpload" &&
    currentTarget?.kind !== "video";
  const canReset =
    currentTarget?.kind === "text" ||
    currentTarget?.kind === "blockquote" ||
    currentTarget?.kind === "bulletList" ||
    currentTarget?.kind === "orderedList" ||
    currentTarget?.kind === "taskList";
  const canDownloadImage = currentTarget?.kind === "image";
  const canDuplicate = currentTarget !== null;
  const handleElementDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);
  const handleElementDragEnd = useCallback(() => {
    setIsDragging(false);
  }, []);
  const handleNodeChange = useCallback(
    ({ node, pos }: { node: NonNullable<ReturnType<Editor["state"]["doc"]["nodeAt"]>> | null; pos: number }) => {
      currentNodeRef.current = node;
      currentNodePosRef.current = node ? pos : -1;
      setCurrentTargetState(node ? getCurrentTarget() : null);
    },
    [],
  );

  return (
    <TiptapDragHandle
      editor={editor}
      className="drag-handle-shell"
      onNodeChange={handleNodeChange}
      onElementDragStart={handleElementDragStart}
      onElementDragEnd={handleElementDragEnd}
    >
      <div
        className={`drag-handle-buttons flex items-start text-muted-foreground/50 hover:text-muted-foreground ${isDragging ? "pointer-events-none scale-95 opacity-0" : ""
          }`}
      >
        <button
          type="button"
          title="Insert block"
          onMouseDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={handleAddBlock}
          className="drag-handle-action drag-handle-add flex h-8 w-6 items-center justify-center rounded-full"
        >
          <Plus className="size-4" strokeWidth={2} />
        </button>

        <div className="relative ml-px flex h-8 w-6 items-center justify-center">
          <button
            type="button"
            title="Click for options. Hold for drag."
            onPointerDown={handleGripPointerDown}
            className="drag-handle-action drag-handle-grip flex h-8 w-6 cursor-grab items-center justify-center rounded-full active:cursor-grabbing"
          >
            <GripVertical className="size-[15px]" strokeWidth={1.8} />
          </button>

          <DropdownMenu open={menuOpen} onOpenChange={setMenuVisibility}>
            <DropdownMenuTrigger asChild>
              <span
                className="pointer-events-none absolute inset-0 outline-none"
                tabIndex={-1}
              />
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="center"
              avoidCollisions
              className={isTableMenu ? "table-control-menu w-56" : "table-control-menu w-52"}
              collisionPadding={16}
              onCloseAutoFocus={(event) => event.preventDefault()}
              side="right"
              sideOffset={18}
            >
              {isTableMenu ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Table</div>
                  <DropdownMenuSub open={openSubMenu === "table-color"} onOpenChange={(open) => setOpenSubMenu(open ? "table-color" : null)}>
                    <DropdownMenuSubTrigger
                      onFocus={() => setOpenSubMenu("table-color")}
                      onPointerMove={() => setOpenSubMenu("table-color")}
                    >
                      <PaintBucket className="size-4" /> Color
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="table-control-menu table-control-color-menu" collisionPadding={16}>
                      <div className="table-control-color-label">Text Color</div>
                      <div className="table-control-color-grid">
                        {tableTextColors.map((color) => (
                          <button
                            key={`table-text-${color.label}`}
                            aria-label={`${color.label} text color`}
                            className={`table-control-color-swatch ${tableTextColor === color.value ? "is-active" : ""}`}
                            onClick={() => setTableColor("textColor", color.value)}
                            onMouseDown={(event) => event.preventDefault()}
                            style={{ color: color.value || "#64748b" }}
                            type="button"
                          >
                            <span>A</span>
                          </button>
                        ))}
                      </div>
                      <div className="table-control-color-label">Background Color</div>
                      <div className="table-control-color-grid">
                        {tableBackgroundColors.map((color) => (
                          <button
                            key={`table-background-${color.label}`}
                            aria-label={`${color.label} background color`}
                            className={`table-control-background-swatch ${tableBackgroundColor === color.value ? "is-active" : ""}`}
                            onClick={() => setTableColor("backgroundColor", color.value)}
                            onMouseDown={(event) => event.preventDefault()}
                            type="button"
                          >
                            <span style={{ background: color.value || "#fff" }} />
                          </button>
                        ))}
                      </div>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuSub open={openSubMenu === "table-alignment"} onOpenChange={(open) => setOpenSubMenu(open ? "table-alignment" : null)}>
                    <DropdownMenuSubTrigger
                      onFocus={() => setOpenSubMenu("table-alignment")}
                      onPointerMove={() => setOpenSubMenu("table-alignment")}
                    >
                      <AlignLeft className="size-4" /> Alignment
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="table-control-menu table-control-submenu w-44" collisionPadding={16}>
                      <DropdownMenuItem className={tableTextAlign === "left" ? "table-control-item-active" : ""} onClick={() => setTableAlign("left")}>
                        <AlignLeft className="size-4" /> Left
                      </DropdownMenuItem>
                      <DropdownMenuItem className={tableTextAlign === "center" ? "table-control-item-active" : ""} onClick={() => setTableAlign("center")}>
                        <AlignCenter className="size-4" /> Center
                      </DropdownMenuItem>
                      <DropdownMenuItem className={tableTextAlign === "right" ? "table-control-item-active" : ""} onClick={() => setTableAlign("right")}>
                        <AlignRight className="size-4" /> Right
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  <DropdownMenuItem onClick={fitTableToWidth}>
                    <Maximize2 className="size-4" /> Fit to width
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={clearTableContents}>
                    <Eraser className="size-4" /> Clear all contents
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={deleteNode}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </>
              ) : (
                <>
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{menuTitle}</div>

                  {canColor && (
                    <DropdownMenuSub open={openSubMenu === "block-color"} onOpenChange={(open) => setOpenSubMenu(open ? "block-color" : null)}>
                      <DropdownMenuSubTrigger
                        onFocus={() => setOpenSubMenu("block-color")}
                        onPointerMove={() => setOpenSubMenu("block-color")}
                      >
                        <PaintBucket className="size-4" /> Color
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="table-control-menu table-control-color-menu" collisionPadding={16}>
                        <div className="table-control-color-label">Text Color</div>
                        <div className="table-control-color-grid">
                          {blockTextColors.map((color) => (
                            <button
                              key={`block-text-${color.label}`}
                              aria-label={`${color.label} text color`}
                              className="table-control-color-swatch"
                              onClick={() => setBlockTextColor(color.value || undefined)}
                              onMouseDown={(event) => event.preventDefault()}
                              style={{ color: color.value || "#64748b" }}
                              type="button"
                            >
                              <span>A</span>
                            </button>
                          ))}
                        </div>
                        <div className="table-control-color-label">Background Color</div>
                        <div className="table-control-color-grid">
                          {blockHighlightColors.map((color) => (
                            <button
                              key={`block-highlight-${color.label}`}
                              aria-label={`${color.label} highlight color`}
                              className={`table-control-background-swatch ${blockBackgroundColor === color.value ? "is-active" : ""}`}
                              onClick={() => setBlockHighlightColor(color.value || undefined)}
                              onMouseDown={(event) => event.preventDefault()}
                              type="button"
                            >
                              <span style={{ background: color.value || "#fff" }} />
                            </button>
                          ))}
                        </div>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {canTurnInto && (
                    <DropdownMenuSub open={openSubMenu === "block-turn-into"} onOpenChange={(open) => setOpenSubMenu(open ? "block-turn-into" : null)}>
                      <DropdownMenuSubTrigger
                        onFocus={() => setOpenSubMenu("block-turn-into")}
                        onPointerMove={() => setOpenSubMenu("block-turn-into")}
                      >
                        <Repeat className="size-4" /> Turn Into
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="table-control-menu w-48" collisionPadding={16}>
                        {turnIntoItems.map((item) => (
                          <DropdownMenuItem key={item.value} onClick={() => turnInto(item.value)}>
                            <item.icon className="size-4" /> {item.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>
                  )}

                  {canReset && (
                    <DropdownMenuItem onClick={resetFormatting}>
                      <RotateCcw className="size-4" /> Reset formatting
                    </DropdownMenuItem>
                  )}

                  {(canColor || canTurnInto || canReset || canDownloadImage) && <DropdownMenuSeparator />}

                  {canDownloadImage && (
                    <DropdownMenuItem onClick={downloadImage}>
                      <Download className="size-4" /> Download image
                    </DropdownMenuItem>
                  )}

                  {canDuplicate && (
                    <DropdownMenuItem onClick={duplicateNode}>
                      <Copy className="size-4" /> Duplicate node
                    </DropdownMenuItem>
                  )}

                  {canDuplicate && <DropdownMenuSeparator />}

                  <DropdownMenuItem
                    className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                    onClick={deleteNode}
                  >
                    <Trash2 className="size-4" /> Delete
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </TiptapDragHandle>
  );
}
