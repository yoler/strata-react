import type { SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { LucideIcon } from "lucide-react";
import { forwardRef, useCallback, useImperativeHandle, useState } from "react";

import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/shared/ui/command";

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
      <Command className="w-[320px] rounded-xl border shadow-lg">
        <CommandEmpty className="text-muted-foreground py-4">No matching commands</CommandEmpty>
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

  return (
    <Command className="w-[320px] rounded-xl border shadow-lg">
      <CommandList className="max-h-[320px] p-1.5">
        {Object.entries(groupedItems).map(([group, groupItems]) => (
          <CommandGroup key={group} heading={group}>
            {groupItems.map((item) => {
              const Icon = item.icon;

              return (
                <CommandItem
                  key={`${group}-${item.title}`}
                  data-selected={item.index === selectedIndex}
                  onMouseEnter={() => setSelectedIndex(item.index)}
                  onSelect={() => selectItem(item.index)}
                  value={item.title}
                  className="items-start gap-3"
                >
                  <Icon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-medium">{item.title}</div>
                    <div className="text-muted-foreground text-xs">{item.description}</div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </Command>
  );
});

SlashCommandMenu.displayName = "SlashCommandMenu";
