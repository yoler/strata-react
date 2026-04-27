import { NodeSelection } from "@tiptap/pm/state";
import { CellSelection } from "@tiptap/pm/tables";
import type { Editor } from "@tiptap/react";
import { BubbleMenu as TiptapBubbleMenu } from "@tiptap/react/menus";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  ChevronDown,
  Code,
  CornerDownLeft,
  ExternalLink,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTodo,
  RemoveFormatting,
  MoreVertical,
  Pilcrow,
  Quote,
  Strikethrough,
  Subscript,
  Superscript,
  Trash2,
  Underline,
  IndentDecrease,
  IndentIncrease,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ComponentType,
  type MouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";

import { cn } from "@/shared/lib/utils";

import { editorBackgroundColors, editorTextColors, type EditorColorItem } from "../../config/colors";
import { TURN_INTO_OPTIONS } from "../../config/turn-into";
import { useEditorI18n } from "../../lib/i18n";
import { getSelectionContainerBlockTarget, replaceContainerBlock, type TurnIntoValue } from "../../lib/turn-into";
import "./bubble-menu.css";

type EditorBubbleMenuProps = {
  editor: Editor;
};

type TurnIntoItem = {
  icon: ComponentType<{ className?: string; strokeWidth?: number }>;
  isActive: boolean;
  label: string;
  run: () => void;
  value: TurnIntoValue;
};

type MenuKind = "turn-into" | "color" | "link" | "more" | null;

type MenuPosition = {
  left: number;
  top: number;
};

type RecentColorItem = EditorColorItem & {
  kind: "highlight" | "text";
};

type BubbleMenuFormattingState = {
  currentHighlightColor: string;
  currentTextColor: string;
  isBlockquote: boolean;
  isBold: boolean;
  isBulletList: boolean;
  isCode: boolean;
  isHeading1: boolean;
  isHeading2: boolean;
  isHeading3: boolean;
  isItalic: boolean;
  isLink: boolean;
  isOrderedList: boolean;
  isStrike: boolean;
  isSubscript: boolean;
  isSuperscript: boolean;
  isTaskList: boolean;
  isTextAlignCenter: boolean;
  isTextAlignJustify: boolean;
  isTextAlignLeft: boolean;
  isTextAlignRight: boolean;
  isUnderline: boolean;
};

const TEXT_BUBBLE_MENU_PLUGIN_KEY = "text-bubble-menu";
const RECENT_COLORS_STORAGE_KEY = "notion-editor:recent-colors";
const MAX_RECENT_COLORS = 3;
const FLOATING_MENU_VIEWPORT_PADDING = 8;
const floatingMenuSizeByKind: Record<Exclude<MenuKind, null>, { height: number; width: number }> = {
  color: { height: 304, width: 184 },
  link: { height: 44, width: 320 },
  more: { height: 44, width: 314 },
  "turn-into": { height: 304, width: 164 },
};

const turnIntoIconByValue: Record<TurnIntoValue, TurnIntoItem["icon"]> = {
  text: Pilcrow,
  "heading-1": Heading1,
  "heading-2": Heading2,
  "heading-3": Heading3,
  "bullet-list": List,
  "numbered-list": ListOrdered,
  "todo-list": ListTodo,
  quote: Quote,
  "code-block": Code,
};

const blockedNodeNames = new Set([
  "imageUpload",
  "image",
  "codeBlock",
  "videoEmbed",
  "videoEmbedInput",
  "horizontalRule",
]);

function isSelectionInsideEditor(view: Parameters<NonNullable<ComponentProps<typeof TiptapBubbleMenu>["shouldShow"]>>[0]["view"]) {
  if (typeof window === "undefined") {
    return false;
  }

  const browserSelection = window.getSelection();
  const anchorNode = browserSelection?.anchorNode;
  const focusNode = browserSelection?.focusNode;

  if (!anchorNode || !focusNode) {
    return false;
  }

  return view.dom.contains(anchorNode) && view.dom.contains(focusNode);
}

function isBlockedSelection(editor: Editor) {
  const { selection } = editor.state;

  if (selection.empty) {
    return true;
  }

  if (selection instanceof CellSelection) {
    return true;
  }

  if (selection instanceof NodeSelection) {
    return true;
  }

  if (
    editor.isActive("imageUpload") ||
    editor.isActive("image") ||
    editor.isActive("codeBlock") ||
    editor.isActive("horizontalRule") ||
    editor.isActive("videoEmbed") ||
    editor.isActive("videoEmbedInput")
  ) {
    return true;
  }

  if (selection.to - selection.from < 240) {
    return false;
  }

  let containsBlockedNode = false;
  editor.state.doc.nodesBetween(selection.from, selection.to, (node) => {
    if (blockedNodeNames.has(node.type.name)) {
      containsBlockedNode = true;
      return false;
    }

    return true;
  });

  return containsBlockedNode;
}

function getColorLabel(value: string, palette: EditorColorItem[]) {
  return palette.find((color) => color.value.toLowerCase() === value.toLowerCase())?.label ?? value;
}

function getColorLabelKey(value: string, palette: EditorColorItem[]) {
  return palette.find((color) => color.value.toLowerCase() === value.toLowerCase())?.labelKey ?? "colors.default";
}

function getRecentColorLabel(color: RecentColorItem) {
  return getColorLabel(color.value, color.kind === "text" ? editorTextColors : editorBackgroundColors);
}

function getRecentColorLabelKey(color: Pick<RecentColorItem, "kind" | "value">) {
  return getColorLabelKey(color.value, color.kind === "text" ? editorTextColors : editorBackgroundColors);
}

function readRecentColors() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENT_COLORS_STORAGE_KEY);
    const parsedValue = rawValue ? JSON.parse(rawValue) : [];

    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .filter((color): color is RecentColorItem => {
        return (
          typeof color === "object" &&
          color !== null &&
          (color.kind === "text" || color.kind === "highlight") &&
          typeof color.value === "string" &&
          color.value.trim().length > 0
        );
      })
      .slice(0, MAX_RECENT_COLORS)
      .map((color) => ({
        kind: color.kind,
        label: getRecentColorLabel(color),
        labelKey: getRecentColorLabelKey(color),
        value: color.value.trim().toLowerCase(),
      }));
  } catch {
    return [];
  }
}

function writeRecentColors(colors: RecentColorItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RECENT_COLORS_STORAGE_KEY, JSON.stringify(colors));
}

function getBubbleMenuFormattingState(editor: Editor): BubbleMenuFormattingState {
  return {
    currentHighlightColor: (editor.getAttributes("highlight").color as string | undefined) ?? "",
    currentTextColor: (editor.getAttributes("textStyle").color as string | undefined) ?? "",
    isBlockquote: editor.isActive("blockquote"),
    isBold: editor.isActive("bold"),
    isBulletList: editor.isActive("bulletList"),
    isCode: editor.isActive("code"),
    isHeading1: editor.isActive("heading", { level: 1 }),
    isHeading2: editor.isActive("heading", { level: 2 }),
    isHeading3: editor.isActive("heading", { level: 3 }),
    isItalic: editor.isActive("italic"),
    isLink: editor.isActive("link"),
    isOrderedList: editor.isActive("orderedList"),
    isStrike: editor.isActive("strike"),
    isSubscript: editor.isActive("subscript"),
    isSuperscript: editor.isActive("superscript"),
    isTaskList: editor.isActive("taskList"),
    isTextAlignCenter: editor.isActive({ textAlign: "center" }),
    isTextAlignJustify: editor.isActive({ textAlign: "justify" }),
    isTextAlignLeft: editor.isActive({ textAlign: "left" }),
    isTextAlignRight: editor.isActive({ textAlign: "right" }),
    isUnderline: editor.isActive("underline"),
  };
}

export function BubbleMenu({ editor }: EditorBubbleMenuProps) {
  const t = useEditorI18n();
  const toolbarRef = useRef<HTMLDivElement | null>(null);
  const turnIntoRef = useRef<HTMLButtonElement | null>(null);
  const linkRef = useRef<HTMLButtonElement | null>(null);
  const colorRef = useRef<HTMLButtonElement | null>(null);
  const moreRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const linkInputRef = useRef<HTMLInputElement | null>(null);
  const [isSelectionSettled, setIsSelectionSettled] = useState(true);
  const [openMenu, setOpenMenu] = useState<MenuKind>(null);
  const [menuPosition, setMenuPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const [linkUrl, setLinkUrl] = useState("");
  const [recentColors, setRecentColors] = useState<RecentColorItem[]>(() => readRecentColors());
  const [isBubbleMenuVisible, setIsBubbleMenuVisible] = useState(false);
  const [formattingState, setFormattingState] = useState<BubbleMenuFormattingState>(() =>
    getBubbleMenuFormattingState(editor),
  );
  const handleBubbleMenuHide = useCallback(() => {
    setIsBubbleMenuVisible(false);
    setOpenMenu(null);
  }, []);

  const shouldShow = useCallback(
    ({
      editor: currentEditor,
      element,
      from,
      state,
      to,
      view,
    }: Parameters<NonNullable<ComponentProps<typeof TiptapBubbleMenu>["shouldShow"]>>[0]) => {
      const { doc, selection } = state;
      const isEmptyTextBlock = !doc.textBetween(from, to).length && selection.empty;
      const isChildOfMenu = element.contains(document.activeElement);
      const hasEditorFocus = view.hasFocus() || isChildOfMenu || isSelectionInsideEditor(view);

      if (view.dragging) {
        return false;
      }

      if (view.dom.querySelector("td.selectedCell, th.selectedCell")) {
        return false;
      }

      if (selection instanceof CellSelection || selection instanceof NodeSelection) {
        return false;
      }

      if (!hasEditorFocus || selection.empty || isEmptyTextBlock || !currentEditor.isEditable) {
        return false;
      }

      if (!isSelectionSettled) {
        return false;
      }

      return !isBlockedSelection(currentEditor);
    },
    [isSelectionSettled],
  );

  const currentTurnIntoValue: TurnIntoValue = formattingState.isHeading1
    ? "heading-1"
    : formattingState.isHeading2
      ? "heading-2"
      : formattingState.isHeading3
        ? "heading-3"
        : formattingState.isBulletList
          ? "bullet-list"
          : formattingState.isOrderedList
            ? "numbered-list"
            : formattingState.isTaskList
              ? "todo-list"
              : formattingState.isBlockquote
                ? "quote"
                : "text";
  const currentBlockLabel = t(`blocks.${currentTurnIntoValue}`);

  const keepSelection = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const openFloatingMenu = (kind: Exclude<MenuKind, null>, trigger: HTMLButtonElement | null) => {
    if (!trigger || !toolbarRef.current) {
      return;
    }

    const toolbarRect = toolbarRef.current.getBoundingClientRect();
    const triggerRect = trigger.getBoundingClientRect();
    const menuSize = floatingMenuSizeByKind[kind];
    let left = triggerRect.left - toolbarRect.left;
    let top = triggerRect.bottom - toolbarRect.top + 8;
    const viewportRight = window.innerWidth - FLOATING_MENU_VIEWPORT_PADDING;
    const viewportBottom = window.innerHeight - FLOATING_MENU_VIEWPORT_PADDING;
    const absoluteLeft = toolbarRect.left + left;
    const absoluteTop = toolbarRect.top + top;

    if (absoluteLeft + menuSize.width > viewportRight) {
      left -= absoluteLeft + menuSize.width - viewportRight;
    }

    if (toolbarRect.left + left < FLOATING_MENU_VIEWPORT_PADDING) {
      left += FLOATING_MENU_VIEWPORT_PADDING - (toolbarRect.left + left);
    }

    if (absoluteTop + menuSize.height > viewportBottom) {
      top = triggerRect.top - toolbarRect.top - menuSize.height - 8;
    }

    setMenuPosition({
      left,
      top,
    });
    setOpenMenu((current) => (current === kind ? null : kind));
  };

  useEffect(() => {
    if (!isBubbleMenuVisible && !openMenu) {
      return;
    }

    const updateFormattingState = () => {
      setFormattingState((current) => {
        const next = getBubbleMenuFormattingState(editor);

        return JSON.stringify(current) === JSON.stringify(next) ? current : next;
      });
    };

    updateFormattingState();
    editor.on("selectionUpdate", updateFormattingState);
    editor.on("transaction", updateFormattingState);

    return () => {
      editor.off("selectionUpdate", updateFormattingState);
      editor.off("transaction", updateFormattingState);
    };
  }, [editor, isBubbleMenuVisible, openMenu]);

  useEffect(() => {
    let editorElement: HTMLElement | null = null;
    let settleFrame = 0;

    try {
      editorElement = editor.view.dom;
    } catch {
      return;
    }

    const settleSelection = () => {
      if (settleFrame) {
        window.cancelAnimationFrame(settleFrame);
      }

      settleFrame = window.requestAnimationFrame(() => {
        setIsSelectionSettled(true);
      });
    };

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;

      if (!target || !editorElement?.contains(target)) {
        return;
      }

      setIsSelectionSettled(false);
    };

    const handlePointerUp = () => {
      settleSelection();
    };

    const handleSelectionChange = () => {
      if (!isSelectionInsideEditor(editor.view)) {
        return;
      }

      settleSelection();
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointerup", handlePointerUp);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      if (settleFrame) {
        window.cancelAnimationFrame(settleFrame);
      }

      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, [editor]);

  useEffect(() => {
    if (!openMenu) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;

      if (
        target &&
        (menuRef.current?.contains(target) ||
          turnIntoRef.current?.contains(target) ||
          linkRef.current?.contains(target) ||
          colorRef.current?.contains(target) ||
          moreRef.current?.contains(target))
      ) {
        return;
      }

      setOpenMenu(null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    };

    const handleScroll = () => setOpenMenu(null);

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openMenu]);

  useEffect(() => {
    if (openMenu !== "link") {
      return;
    }

    window.requestAnimationFrame(() => {
      linkInputRef.current?.focus();
      linkInputRef.current?.select();
    });
  }, [openMenu]);

  const applyTurnInto = useCallback(
    (type: TurnIntoValue) => {
      const containerTarget = getSelectionContainerBlockTarget(editor);

      if (containerTarget && replaceContainerBlock(editor, containerTarget, type)) {
        return;
      }

      switch (type) {
        case "text":
          editor.chain().focus().setParagraph().run();
          break;
        case "heading-1":
          editor.chain().focus().toggleHeading({ level: 1 }).run();
          break;
        case "heading-2":
          editor.chain().focus().toggleHeading({ level: 2 }).run();
          break;
        case "heading-3":
          editor.chain().focus().toggleHeading({ level: 3 }).run();
          break;
        case "bullet-list":
          editor.chain().focus().toggleBulletList().run();
          break;
        case "numbered-list":
          editor.chain().focus().toggleOrderedList().run();
          break;
        case "todo-list":
          editor.chain().focus().toggleTaskList().run();
          break;
        case "quote":
          editor.chain().focus().toggleBlockquote().run();
          break;
        case "code-block":
          editor.chain().focus().toggleCodeBlock().run();
          break;
      }
    },
    [editor],
  );

  const turnIntoItems: TurnIntoItem[] = useMemo(
    () =>
      TURN_INTO_OPTIONS.filter((item) => item.value !== "code-block").map((item) => ({
        icon: turnIntoIconByValue[item.value],
        isActive: item.value === currentTurnIntoValue,
        label: t(item.labelKey),
        run: () => applyTurnInto(item.value),
        value: item.value,
      })),
    [applyTurnInto, currentTurnIntoValue, t],
  );

  const handleLink = () => {
    setLinkUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    openFloatingMenu("link", linkRef.current);
  };

  const applyLink = () => {
    const trimmedUrl = linkUrl.trim();

    if (!trimmedUrl) {
      linkInputRef.current?.focus();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: trimmedUrl }).run();
    setOpenMenu(null);
  };

  const handleLinkInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyLink();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpenMenu(null);
    }
  };

  const openCurrentLink = () => {
    const trimmedUrl = linkUrl.trim() || ((editor.getAttributes("link").href as string | undefined) ?? "");

    if (!trimmedUrl) {
      return;
    }

    window.open(trimmedUrl, "_blank", "noopener,noreferrer");
  };

  const removeLink = () => {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkUrl("");
    setOpenMenu(null);
  };

  const applyTextColor = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetColor().run();
      return;
    }

    editor.chain().focus().setColor(value).run();
    rememberRecentColor("text", value);
  };

  const applyHighlightColor = (value: string) => {
    if (!value) {
      editor.chain().focus().unsetHighlight().run();
      return;
    }

    editor.chain().focus().setHighlight({ color: value }).run();
    rememberRecentColor("highlight", value);
  };

  const rememberRecentColor = (kind: RecentColorItem["kind"], value: string) => {
    const normalizedValue = value.trim().toLowerCase();

    if (!normalizedValue) {
      return;
    }

    const nextRecentColors = [
      {
        kind,
        label: getColorLabel(normalizedValue, kind === "text" ? editorTextColors : editorBackgroundColors),
        labelKey: getColorLabelKey(normalizedValue, kind === "text" ? editorTextColors : editorBackgroundColors),
        value: normalizedValue,
      },
      ...recentColors.filter((color) => color.kind !== kind || color.value !== normalizedValue),
    ].slice(0, MAX_RECENT_COLORS);

    setRecentColors(nextRecentColors);
    writeRecentColors(nextRecentColors);
  };

  return (
    <TiptapBubbleMenu
      editor={editor}
      pluginKey={TEXT_BUBBLE_MENU_PLUGIN_KEY}
      shouldShow={shouldShow}
      options={{
        placement: "top",
        offset: 12,
        strategy: "fixed",
        onShow: () => setIsBubbleMenuVisible(true),
        onHide: handleBubbleMenuHide,
      }}
      appendTo={() => document.body}
      className="tiptap-toolbar text-bubble-menu"
      data-variant="floating"
      ref={toolbarRef}
      role="toolbar"
      aria-label={t("aria.toolbar")}
    >
      <div className="tiptap-toolbar-group" role="group">
        <button
          ref={turnIntoRef}
              aria-label={t("bubble.turnIntoCurrent", { current: currentBlockLabel })}
          className="tiptap-button tiptap-button-turn-into"
          data-style="ghost"
          data-tooltip={t("bubble.turnInto")}
          onMouseDown={keepSelection}
          onClick={() => openFloatingMenu("turn-into", turnIntoRef.current)}
          type="button"
        >
              <span className="tiptap-button-text">{currentBlockLabel}</span>
          <ChevronDown className="tiptap-button-dropdown-small size-3.5" strokeWidth={1.8} />
        </button>
      </div>

      <div className="tiptap-separator" data-orientation="vertical" role="none" />

      <div className="tiptap-toolbar-group" role="group">
        <button
          aria-label={t("bubble.bold")}
          aria-pressed={formattingState.isBold}
          className={cn("tiptap-button", formattingState.isBold && "is-active")}
          data-active-state={formattingState.isBold ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.bold")}
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleBold().run()}
          type="button"
        >
          <Bold className="tiptap-button-icon size-4" strokeWidth={2} />
        </button>
        <button
          aria-label={t("bubble.italic")}
          aria-pressed={formattingState.isItalic}
          className={cn("tiptap-button", formattingState.isItalic && "is-active")}
          data-active-state={formattingState.isItalic ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.italic")}
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          type="button"
        >
          <Italic className="tiptap-button-icon size-4" strokeWidth={2} />
        </button>
        <button
          aria-label={t("bubble.underline")}
          aria-pressed={formattingState.isUnderline}
          className={cn("tiptap-button", formattingState.isUnderline && "is-active")}
          data-active-state={formattingState.isUnderline ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.underline")}
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          type="button"
        >
          <Underline className="tiptap-button-icon size-4" strokeWidth={2} />
        </button>
        <button
          aria-label={t("bubble.strike")}
          aria-pressed={formattingState.isStrike}
          className={cn("tiptap-button", formattingState.isStrike && "is-active")}
          data-active-state={formattingState.isStrike ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.strike")}
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          type="button"
        >
          <Strikethrough className="tiptap-button-icon size-4" strokeWidth={2} />
        </button>
        <button
          aria-label={t("bubble.code")}
          aria-pressed={formattingState.isCode}
          className={cn("tiptap-button", formattingState.isCode && "is-active")}
          data-active-state={formattingState.isCode ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.code")}
          onMouseDown={keepSelection}
          onClick={() => editor.chain().focus().toggleCode().run()}
          type="button"
        >
          <Code className="tiptap-button-icon size-4" strokeWidth={2} />
        </button>
      </div>

      <div className="tiptap-separator" data-orientation="vertical" role="none" />

      <div className="tiptap-toolbar-group" role="group">
        <button
          ref={linkRef}
          aria-label={t("bubble.link")}
          aria-pressed={formattingState.isLink}
          className={cn("tiptap-button", formattingState.isLink && "is-active")}
          data-active-state={formattingState.isLink ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.link")}
          onMouseDown={keepSelection}
          onClick={handleLink}
          type="button"
        >
          <LinkIcon className="tiptap-button-icon size-4" strokeWidth={1.9} />
        </button>
        <button
          ref={colorRef}
          aria-label={t("bubble.textColor")}
          aria-pressed={Boolean(formattingState.currentTextColor || formattingState.currentHighlightColor)}
          className={cn(
            "tiptap-button tiptap-button-color",
            (formattingState.currentTextColor || formattingState.currentHighlightColor) && "is-active",
          )}
          data-active-state={formattingState.currentTextColor || formattingState.currentHighlightColor ? "on" : "off"}
          data-style="ghost"
          data-tooltip={t("bubble.textColor")}
          onMouseDown={keepSelection}
          onClick={() => openFloatingMenu("color", colorRef.current)}
          type="button"
        >
          <span
            className="tiptap-button-color-indicator"
            style={{
              backgroundColor: formattingState.currentHighlightColor || undefined,
              color: formattingState.currentTextColor || undefined,
            }}
          >
            A
          </span>
          <ChevronDown className="tiptap-button-dropdown-small size-3" strokeWidth={1.8} />
        </button>
      </div>

      <div className="tiptap-separator" data-orientation="vertical" role="none" />

      <div className="tiptap-toolbar-group" role="group">
        <button
          ref={moreRef}
          className="tiptap-button"
          data-style="ghost"
          data-tooltip={t("bubble.moreOptions")}
          onMouseDown={keepSelection}
          onClick={() => openFloatingMenu("more", moreRef.current)}
          type="button"
        >
          <MoreVertical className="tiptap-button-icon size-4" strokeWidth={1.9} />
        </button>
      </div>

      {openMenu && (
        <div
          ref={menuRef}
          className="text-bubble-menu-floating-dropdown"
          style={{ left: `${menuPosition.left}px`, top: `${menuPosition.top}px` }}
        >
          <div
            className={cn(
              "text-bubble-menu-dropdown",
              openMenu === "color" && "is-color-palette",
              openMenu === "link" && "is-link-popover",
              openMenu === "more" && "is-more-menu",
            )}
          >
            {openMenu === "turn-into" && (
              <>
                <div className="text-bubble-menu-dropdown-label">{t("bubble.turnIntoTitle")}</div>
                {turnIntoItems.map((item) => (
                  <button
                    key={item.value}
                    className={cn("tiptap-dropdown-menu-item text-bubble-menu-dropdown-item", item.isActive && "is-active")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      item.run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <item.icon className="size-4" strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                ))}
              </>
            )}

            {openMenu === "color" && (
              <div className="text-bubble-color-palette">
                {recentColors.length > 0 && (
                  <>
                    <div className="text-bubble-menu-dropdown-label">{t("bubble.recentlyUsed")}</div>
                    <div className="text-bubble-color-grid is-recent">
                      {recentColors.map((color) => (
                        <button
                          key={`recent-${color.kind}-${color.value}`}
                          aria-label={t(color.kind === "text" ? "colors.textColor" : "colors.highlightColor", {
                            color: t(color.labelKey),
                          })}
                          className={cn(
                            color.kind === "text" ? "text-bubble-color-swatch" : "text-bubble-highlight-swatch",
                          )}
                          onMouseDown={keepSelection}
                          onClick={() => {
                            if (color.kind === "text") {
                              applyTextColor(color.value);
                            } else {
                              applyHighlightColor(color.value);
                            }

                            setOpenMenu(null);
                          }}
                      style={color.kind === "text" ? { color: color.value } : undefined}
                      type="button"
                    >
                          {color.kind === "text" ? (
                            <span className="text-bubble-color-swatch-label">A</span>
                          ) : (
                            <span className="text-bubble-highlight-swatch-dot" style={{ background: color.value }} />
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}

                <div className="text-bubble-menu-dropdown-label">{t("bubble.textColor")}</div>
                <div className="text-bubble-color-grid">
                    {editorTextColors.map((color) => (
                    <button
                      key={`text-${color.label}`}
                      aria-label={t("colors.textColor", { color: t(color.labelKey) })}
                      className="text-bubble-color-swatch"
                      onMouseDown={keepSelection}
                      onClick={() => {
                        applyTextColor(color.value);
                        setOpenMenu(null);
                      }}
                      style={{ color: color.value || "#64748b" }}
                      type="button"
                    >
                      <span className="text-bubble-color-swatch-label">A</span>
                    </button>
                  ))}
                </div>

                <div className="text-bubble-menu-dropdown-label">{t("bubble.highlightColor")}</div>
                <div className="text-bubble-color-grid">
                    {editorBackgroundColors.map((color) => (
                    <button
                      key={`highlight-${color.label}`}
                      aria-label={t("colors.highlightColor", { color: t(color.labelKey) })}
                      className="text-bubble-highlight-swatch"
                      onMouseDown={keepSelection}
                      onClick={() => {
                        applyHighlightColor(color.value);
                        setOpenMenu(null);
                      }}
                      type="button"
                    >
                      <span className="text-bubble-highlight-swatch-dot" style={{ background: color.value || "var(--tt-highlight-default-swatch)" }} />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {openMenu === "link" && (
              <div className="text-bubble-link-popover">
                <input
                  ref={linkInputRef}
                  aria-label={t("bubble.pasteLink")}
                  className="text-bubble-link-input"
                  onChange={(event) => setLinkUrl(event.target.value)}
                  onKeyDown={handleLinkInputKeyDown}
                  placeholder={t("bubble.pasteLinkPlaceholder")}
                  type="url"
                  value={linkUrl}
                />
                <button
                  aria-label={t("bubble.applyLink")}
                  className="text-bubble-link-action"
                  onMouseDown={keepSelection}
                  onClick={applyLink}
                  type="button"
                >
                  <CornerDownLeft className="size-4" strokeWidth={1.8} />
                </button>
                <button
                  aria-label={t("bubble.openLink")}
                  className="text-bubble-link-action"
                  disabled={!linkUrl.trim() && !formattingState.isLink}
                  onMouseDown={keepSelection}
                  onClick={openCurrentLink}
                  type="button"
                >
                  <ExternalLink className="size-4" strokeWidth={1.8} />
                </button>
                <button
                  aria-label={t("bubble.removeLink")}
                  className="text-bubble-link-action"
                  disabled={!formattingState.isLink}
                  onMouseDown={keepSelection}
                  onClick={removeLink}
                  type="button"
                >
                  <Trash2 className="size-4" strokeWidth={1.8} />
                </button>
              </div>
            )}

            {openMenu === "more" && (
              <>
                <div className="text-bubble-more-grid" role="group" aria-label={t("bubble.moreTextFormatting")}>
                  <button
                    aria-label={t("bubble.superscript")}
                    aria-pressed={formattingState.isSuperscript}
                    className={cn("text-bubble-more-button", formattingState.isSuperscript && "is-active")}
                    data-tooltip={t("bubble.superscript")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().toggleSuperscript().run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <Superscript className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("bubble.subscript")}
                    aria-pressed={formattingState.isSubscript}
                    className={cn("text-bubble-more-button", formattingState.isSubscript && "is-active")}
                    data-tooltip={t("bubble.subscript")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().toggleSubscript().run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <Subscript className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("common.alignLeft")}
                    aria-pressed={formattingState.isTextAlignLeft}
                    className={cn("text-bubble-more-button", formattingState.isTextAlignLeft && "is-active")}
                    data-tooltip={t("common.alignLeft")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().setTextAlign("left").run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <AlignLeft className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("common.alignCenter")}
                    aria-pressed={formattingState.isTextAlignCenter}
                    className={cn("text-bubble-more-button", formattingState.isTextAlignCenter && "is-active")}
                    data-tooltip={t("common.alignCenter")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().setTextAlign("center").run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <AlignCenter className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("common.alignRight")}
                    aria-pressed={formattingState.isTextAlignRight}
                    className={cn("text-bubble-more-button", formattingState.isTextAlignRight && "is-active")}
                    data-tooltip={t("common.alignRight")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().setTextAlign("right").run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <AlignRight className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("common.alignJustify")}
                    aria-pressed={formattingState.isTextAlignJustify}
                    className={cn("text-bubble-more-button", formattingState.isTextAlignJustify && "is-active")}
                    data-tooltip={t("common.alignJustify")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().setTextAlign("justify").run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <AlignJustify className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("bubble.decreaseIndent")}
                    className="text-bubble-more-button"
                    data-tooltip={t("bubble.decreaseIndent")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().decreaseIndent().run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <IndentDecrease className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("bubble.increaseIndent")}
                    className="text-bubble-more-button"
                    data-tooltip={t("bubble.increaseIndent")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().increaseIndent().run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <IndentIncrease className="size-4" strokeWidth={1.8} />
                  </button>
                  <button
                    aria-label={t("bubble.clearFormatting")}
                    className="text-bubble-more-button"
                    data-tooltip={t("bubble.clearFormatting")}
                    onMouseDown={keepSelection}
                    onClick={() => {
                      editor.chain().focus().unsetAllMarks().clearNodes().run();
                      setOpenMenu(null);
                    }}
                    type="button"
                  >
                    <RemoveFormatting className="size-4" strokeWidth={1.8} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </TiptapBubbleMenu>
  );
}
