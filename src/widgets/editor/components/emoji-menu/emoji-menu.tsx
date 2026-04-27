import type { EmojiItem } from "@tiptap/extension-emoji";
import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

import { Command, CommandEmpty, CommandItem, CommandList } from "@/shared/ui/command";

import { useEditorI18n } from "../../lib/i18n";
import "./emoji-menu.css";

export type EmojiMenuHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  resetSelection: () => void;
};

type EmojiMenuProps = {
  command: (item: EmojiItem) => void;
  items: EmojiItem[];
};

export const EmojiMenu = forwardRef<EmojiMenuHandle, EmojiMenuProps>(({ command, items }, ref) => {
  const t = useEditorI18n();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const columns = 10;

  const selectItem = useCallback(
    (index: number) => {
      const item = items[index];

      if (item) {
        command(item);
      }
    },
    [command, items],
  );

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) {
          return false;
        }

        if (event.key === "ArrowUp") {
          setSelectedIndex((currentIndex) => {
            const nextIndex = currentIndex - columns;

            if (nextIndex >= 0) {
              return nextIndex;
            }

            const lastRowIndex = currentIndex % columns;
            const fallbackIndex = items.length - columns + lastRowIndex;

            return fallbackIndex < items.length ? fallbackIndex : items.length - 1;
          });
          return true;
        }

        if (event.key === "ArrowDown") {
          setSelectedIndex((currentIndex) => {
            const nextIndex = currentIndex + columns;

            if (nextIndex < items.length) {
              return nextIndex;
            }

            return currentIndex % columns;
          });
          return true;
        }

        if (event.key === "ArrowLeft") {
          setSelectedIndex((currentIndex) => (currentIndex + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowRight") {
          setSelectedIndex((currentIndex) => (currentIndex + 1) % items.length);
          return true;
        }

        if (event.key === "Enter") {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
      resetSelection: () => {
        setSelectedIndex(0);
      },
    }),
    [items, selectItem, selectedIndex],
  );

  if (!items.length) {
    return (
      <Command className="tiptap-emoji-card w-[280px] border bg-white dark:bg-neutral-950">
        <CommandEmpty className="text-muted-foreground px-3 py-3 text-[13px] leading-5">{t("emoji.empty")}</CommandEmpty>
      </Command>
    );
  }

  return (
    <Command className="tiptap-emoji-card w-[360px] border bg-white dark:bg-neutral-950">
      <CommandList className="tiptap-emoji-card-body max-h-[320px] p-0">
        <div className="tiptap-emoji-grid">
          {items.map((item, index) => (
            <CommandItem
              key={item.name}
              data-selected={index === selectedIndex}
              onMouseEnter={() => setSelectedIndex(index)}
              onSelect={() => selectItem(index)}
              value={item.name}
              className="tiptap-emoji-card-item !m-0 !size-8 !gap-0 !rounded-md !p-0 !grid place-items-center"
            >
              {item.fallbackImage ? (
                <img className="tiptap-emoji-card-symbol" src={item.fallbackImage} alt={item.emoji ?? item.name} draggable="false" aria-hidden="true" />
              ) : (
                <span className="tiptap-emoji-card-symbol" aria-hidden="true">
                  {item.emoji}
                </span>
              )}
              <span className="sr-only">:{item.name}:</span>
            </CommandItem>
          ))}
        </div>
      </CommandList>
    </Command>
  );
});

EmojiMenu.displayName = "EmojiMenu";
