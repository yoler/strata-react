import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { LucideIcon } from "lucide-react";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

import { Command, CommandEmpty } from "@/shared/ui/command";

export type SlashCommandItem = {
  title: string;
  description: string;
  icon: LucideIcon;
  group: string;
  command: (props: { editor: import("@tiptap/core").Editor; range: import("@tiptap/core").Range }) => void;
};

export type SlashCommandMenuHandle = {
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  resetSelection: () => void;
};

type SlashCommandMenuProps = {
  command: (item: SlashCommandItem) => void;
  items: SlashCommandItem[];
};

const groupOrder = ["Style", "Insert"] as const;

export const SlashCommandMenu = forwardRef<SlashCommandMenuHandle, SlashCommandMenuProps>(({ command, items }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = useCallback((index: number) => {
    const item = items[index];

    if (item) {
      command(item);
    }
  }, [command, items]);

  useImperativeHandle(
    ref,
    () => ({
      onKeyDown: ({ event }) => {
        if (!items.length) {
          return false;
        }

        if (event.key === "ArrowUp") {
          setSelectedIndex((currentIndex) => (currentIndex + items.length - 1) % items.length);
          return true;
        }

        if (event.key === "ArrowDown") {
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
      <Command className="tiptap-slash-card w-[248px] border bg-white dark:bg-neutral-950">
        <CommandEmpty className="text-muted-foreground px-3 py-3 text-[13px] leading-5">No matching commands</CommandEmpty>
      </Command>
    );
  }

  const groupedItems = items.reduce<Record<string, Array<SlashCommandItem & { index: number }>>>((accumulator, item, index) => {
    if (!accumulator[item.group]) {
      accumulator[item.group] = [];
    }

    accumulator[item.group].push({ ...item, index });
    return accumulator;
  }, {});

  const orderedGroups = groupOrder
    .map((group) => [group, groupedItems[group] ?? []] as const)
    .filter(([, groupItems]) => groupItems.length > 0);

  return (
    <Command className="tiptap-slash-card w-[248px] border bg-white dark:bg-neutral-950">
      <div className="tiptap-slash-card-body max-h-[340px]">
        {orderedGroups.map(([group, groupItems]) => (
          <div key={group} className="tiptap-slash-card-group">
            <div className="tiptap-slash-card-group-heading">{group}</div>
            {groupItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={`${group}-${item.title}`}
                  aria-selected={item.index === selectedIndex}
                  data-selected={item.index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(item.index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectItem(item.index)}
                  className="tiptap-slash-card-item"
                  type="button"
                >
                  <Icon className="tiptap-slash-card-item-icon" strokeWidth={1.8} />
                  <div className="tiptap-slash-card-item-title">{item.title}</div>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </Command>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
