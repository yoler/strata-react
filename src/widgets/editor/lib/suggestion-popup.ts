import type { Editor } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import type { SuggestionKeyDownProps, SuggestionProps } from "@tiptap/suggestion";
import { exitSuggestion } from "@tiptap/suggestion";
import type { PluginKey } from "prosemirror-state";
import type { ComponentType } from "react";

type SuggestionPopupPosition = {
  height: number;
  offset: number;
  padding: number;
  width: number;
};

type SuggestionPopupHandle = {
  onKeyDown?: (props: SuggestionKeyDownProps) => boolean;
  resetSelection?: () => void;
};

type CreateSuggestionPopupRendererOptions<TItem, TProps extends object> = {
  component: ComponentType<TProps>;
  getProps: (props: SuggestionProps<TItem>) => TProps;
  pluginKey: PluginKey;
  position: SuggestionPopupPosition;
};

export function updateSuggestionPopupPosition<TItem>(
  container: HTMLDivElement | null,
  clientRect: SuggestionProps<TItem>["clientRect"] | undefined,
  position: SuggestionPopupPosition,
) {
  if (!container || !clientRect) {
    return;
  }

  const rect = clientRect();

  if (!rect) {
    return;
  }

  const menuElement = container.firstElementChild instanceof HTMLElement ? container.firstElementChild : container;
  const menuRect = menuElement.getBoundingClientRect();
  const menuWidth = menuRect.width || position.width;
  const menuHeight = menuRect.height || position.height;
  const viewportRight = window.innerWidth - position.padding;
  const viewportBottom = window.innerHeight - position.padding;
  let left = rect.left;
  let top = rect.bottom + position.offset;

  if (left + menuWidth > viewportRight) {
    left = viewportRight - menuWidth;
  }

  if (left < position.padding) {
    left = position.padding;
  }

  if (top + menuHeight > viewportBottom) {
    top = rect.top - menuHeight - position.offset;
  }

  if (top < position.padding) {
    top = position.padding;
  }

  container.style.left = `${left}px`;
  container.style.top = `${top}px`;
}

export function createSuggestionPopupRenderer<
  TItem,
  THandle extends SuggestionPopupHandle,
  TProps extends object,
>({
  component,
  getProps,
  pluginKey,
  position,
}: CreateSuggestionPopupRendererOptions<TItem, TProps>) {
  let componentRenderer: ReactRenderer<THandle, Record<string, unknown>> | null = null;
  let popup: HTMLDivElement | null = null;
  let removeOutsidePointerDownListener: (() => void) | null = null;
  let positionFrame = 0;

  const clearPositionFrame = () => {
    if (positionFrame) {
      window.cancelAnimationFrame(positionFrame);
      positionFrame = 0;
    }
  };

  const removePopup = () => {
    clearPositionFrame();
    removeOutsidePointerDownListener?.();
    popup?.remove();
    componentRenderer?.destroy();
    popup = null;
    componentRenderer = null;
  };

  const schedulePosition = (props: SuggestionProps<TItem>) => {
    updateSuggestionPopupPosition(popup, props.clientRect, position);
    clearPositionFrame();
    positionFrame = window.requestAnimationFrame(() => {
      updateSuggestionPopupPosition(popup, props.clientRect, position);
      positionFrame = 0;
    });
  };

  const bindOutsidePointerDown = (editor: Editor) => {
    removeOutsidePointerDownListener?.();

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;

      if (!target || popup?.contains(target)) {
        return;
      }

      exitSuggestion(editor.view, pluginKey);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    removeOutsidePointerDownListener = () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      removeOutsidePointerDownListener = null;
    };
  };

  return {
    onStart: (props: SuggestionProps<TItem>) => {
      const nextRenderer = new ReactRenderer<THandle, Record<string, unknown>>(
        component as ComponentType<Record<string, unknown>>,
        {
          props: getProps(props) as Record<string, unknown>,
          editor: props.editor,
        },
      );
      componentRenderer = nextRenderer;

      popup = document.createElement("div");
      popup.style.position = "fixed";
      popup.style.zIndex = "9999";
      popup.style.pointerEvents = "auto";
      document.body.appendChild(popup);
      popup.appendChild(nextRenderer.element);

      bindOutsidePointerDown(props.editor);
      nextRenderer.ref?.resetSelection?.();
      schedulePosition(props);
    },
    onUpdate: (props: SuggestionProps<TItem>) => {
      componentRenderer?.updateProps(getProps(props) as Record<string, unknown>);
      componentRenderer?.ref?.resetSelection?.();
      schedulePosition(props);
    },
    onKeyDown: (props: SuggestionKeyDownProps) => {
      if (props.event.key === "Escape") {
        removePopup();
        return true;
      }

      return componentRenderer?.ref?.onKeyDown?.(props) ?? false;
    },
    onExit: () => {
      removePopup();
    },
  };
}
