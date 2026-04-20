import { type Editor, useEditorState } from "@tiptap/react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Columns2,
  Plus,
  Rows2,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/shared/lib/utils";
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

type TableControlsProps = {
  container: HTMLDivElement | null;
  editor: Editor;
};

type LayoutState = {
  activeCell: HTMLTableCellElement;
  bottomInsert: { left: number; top: number; width: number };
  bottomInsertVisible: boolean;
  isFirstColumn: boolean;
  isFirstRow: boolean;
  leftHandle: { left: number; top: number };
  rightInsert: { left: number; top: number; height: number };
  rightInsertVisible: boolean;
  topHandle: { left: number; top: number };
};

const isTableCell = (element: Element | null): element is HTMLTableCellElement =>
  element instanceof HTMLTableCellElement && (element.tagName === "TD" || element.tagName === "TH");

const buildLayout = (cell: HTMLTableCellElement): LayoutState | null => {
  const table = cell.closest("table");
  const row = cell.closest("tr");

  if (!(table instanceof HTMLTableElement) || !(row instanceof HTMLTableRowElement)) {
    return null;
  }

  const cellRect = cell.getBoundingClientRect();
  const rowRect = row.getBoundingClientRect();
  const tableRect = table.getBoundingClientRect();
  const rowCells = Array.from(row.cells);
  const isFirstColumn = rowCells[0] === cell;
  const isLastColumn = rowCells[rowCells.length - 1] === cell;
  const tableRows = table.tBodies[0]?.rows ?? table.rows;
  const isFirstRow = tableRows[0] === row;
  const isLastRow = tableRows[tableRows.length - 1] === row;
  const tableCenterX = tableRect.left + tableRect.width / 2;
  const tableCenterY = tableRect.top + tableRect.height / 2;

  return {
    activeCell: cell,
    bottomInsert: {
      left: tableCenterX,
      top: tableRect.bottom + 10,
      width: tableRect.width,
    },
    bottomInsertVisible: isLastRow,
    isFirstColumn,
    isFirstRow,
    topHandle: {
      left: cellRect.left + cellRect.width / 2,
      top: tableRect.top - 14,
    },
    leftHandle: {
      left: tableRect.left - 14,
      top: rowRect.top + rowRect.height / 2,
    },
    rightInsert: {
      left: tableRect.right + 10,
      top: tableCenterY,
      height: tableRect.height,
    },
    rightInsertVisible: isLastColumn,
  };
};

const focusCell = (editor: Editor, cell: HTMLTableCellElement | null) => {
  if (!cell || !editor.view || editor.isDestroyed) {
    return false;
  }

  try {
    const cellPos = editor.view.posAtDOM(cell, 0);
    editor.chain().focus(cellPos + 1).run();
    return true;
  } catch {
    return false;
  }
};

export function TableControls({ container, editor }: TableControlsProps) {
  const hoveredLayoutRef = useRef<LayoutState | null>(null);
  const controlsHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const [layout, setLayout] = useState<LayoutState | null>(null);
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const [rowMenuOpen, setRowMenuOpen] = useState(false);
  const activeCell = layout?.activeCell ?? null;

  const { activeAlign } = useEditorState({
    editor,
    selector: () => ({
      activeAlign: (activeCell?.getAttribute("data-text-align") as "left" | "center" | "right" | null) ?? "left",
    }),
  });

  const syncHoveredLayout = useCallback(
    (cell: HTMLTableCellElement | null) => {
      if (!container || !editor.isEditable || !editor.view || editor.isDestroyed) {
        hoveredLayoutRef.current = null;
        setLayout(null);
        return;
      }

      if (!cell) {
        hoveredLayoutRef.current = null;

        if (!columnMenuOpen && !rowMenuOpen && !controlsHoveredRef.current) {
          if (hideTimeoutRef.current) {
            window.clearTimeout(hideTimeoutRef.current);
          }

          hideTimeoutRef.current = window.setTimeout(() => {
            if (!controlsHoveredRef.current && !columnMenuOpen && !rowMenuOpen) {
              setLayout(null);
            }
          }, 120);
        }

        return;
      }

      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }

      const nextLayout = buildLayout(cell);
      hoveredLayoutRef.current = nextLayout;

      if (nextLayout) {
        setLayout(nextLayout);
      }
    },
    [columnMenuOpen, container, editor, rowMenuOpen],
  );

  useEffect(() => {
    if (!container) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const cell = target?.closest("td, th") ?? null;

      syncHoveredLayout(isTableCell(cell) ? cell : null);
    };

    const handlePointerLeave = () => {
      syncHoveredLayout(null);
    };

    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerleave", handlePointerLeave);

    return () => {
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerleave", handlePointerLeave);
    };
  }, [container, syncHoveredLayout]);

  useEffect(() => {
    const refresh = () => {
      if (hoveredLayoutRef.current?.activeCell?.isConnected) {
        const nextLayout = buildLayout(hoveredLayoutRef.current.activeCell);
        hoveredLayoutRef.current = nextLayout;
        setLayout(nextLayout);
        return;
      }

      if (!columnMenuOpen && !rowMenuOpen && !controlsHoveredRef.current) {
        setLayout(null);
      }
    };

    editor.on("update", refresh);
    window.addEventListener("resize", refresh);
    window.addEventListener("scroll", refresh, true);

    return () => {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }

      editor.off("update", refresh);
      window.removeEventListener("resize", refresh);
      window.removeEventListener("scroll", refresh, true);
    };
  }, [columnMenuOpen, editor, rowMenuOpen]);

  const keepSelection = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
  };

  const handleControlsPointerEnter = () => {
    controlsHoveredRef.current = true;
  };

  const handleControlsPointerLeave = () => {
    controlsHoveredRef.current = false;

    if (!hoveredLayoutRef.current && !columnMenuOpen && !rowMenuOpen) {
      if (hideTimeoutRef.current) {
        window.clearTimeout(hideTimeoutRef.current);
      }

      hideTimeoutRef.current = window.setTimeout(() => {
        if (!controlsHoveredRef.current && !hoveredLayoutRef.current && !columnMenuOpen && !rowMenuOpen) {
          setLayout(null);
        }
      }, 120);
    }
  };

  const withActiveCell = (action: () => void) => {
    if (!focusCell(editor, activeCell)) {
      return;
    }

    action();

    window.requestAnimationFrame(() => {
      const refreshedCell =
        hoveredLayoutRef.current?.activeCell && hoveredLayoutRef.current.activeCell.isConnected
          ? hoveredLayoutRef.current.activeCell
          : activeCell;

      if (!refreshedCell?.isConnected) {
        return;
      }

      const nextLayout = buildLayout(refreshedCell);
      hoveredLayoutRef.current = nextLayout;
      setLayout(nextLayout);
    });
  };

  const setCellAlign = (align: "left" | "center" | "right") => {
    withActiveCell(() => {
      editor.chain().focus().setCellAttribute("textAlign", align).run();
      if (activeCell) {
        activeCell.setAttribute("data-text-align", align);
        setLayout((current) => (current ? { ...current } : current));
      }
    });
  };

  if (!layout) {
    return null;
  }

  return createPortal(
    <>
      <DropdownMenu
        open={columnMenuOpen}
        onOpenChange={(open) => {
          setColumnMenuOpen(open);
          if (!open && !rowMenuOpen && !hoveredLayoutRef.current) {
            setLayout(null);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="table-control-handle table-control-column"
            onMouseDown={(event) => {
              keepSelection(event);
              focusCell(editor, activeCell);
            }}
            onPointerEnter={handleControlsPointerEnter}
            onPointerLeave={handleControlsPointerLeave}
            style={{
              left: `${layout.topHandle.left}px`,
              top: `${layout.topHandle.top}px`,
              transform: "translateX(-50%)",
            }}
            type="button"
          >
            <span className="table-control-dots table-control-dots-horizontal" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="table-control-menu w-56" sideOffset={8}>
          {layout.isFirstColumn && (
            <>
              <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().toggleHeaderColumn().run())}>
                <Columns2 className="size-4" /> Header column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addColumnBefore().run())}>
            <Plus className="size-4" /> Insert column left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addColumnAfter().run())}>
            <Plus className="size-4" /> Insert column right
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlignLeft className="size-4" /> Alignment
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuItem className={cn(activeAlign === "left" && "table-control-item-active")} onClick={() => setCellAlign("left")}>
                <AlignLeft className="size-4" /> Left
              </DropdownMenuItem>
              <DropdownMenuItem className={cn(activeAlign === "center" && "table-control-item-active")} onClick={() => setCellAlign("center")}>
                <AlignCenter className="size-4" /> Center
              </DropdownMenuItem>
              <DropdownMenuItem className={cn(activeAlign === "right" && "table-control-item-active")} onClick={() => setCellAlign("right")}>
                <AlignRight className="size-4" /> Right
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => withActiveCell(() => editor.chain().focus().deleteColumn().run())}
          >
            <Trash2 className="size-4" /> Delete column
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu
        open={rowMenuOpen}
        onOpenChange={(open) => {
          setRowMenuOpen(open);
          if (!open && !columnMenuOpen && !hoveredLayoutRef.current) {
            setLayout(null);
          }
        }}
      >
        <DropdownMenuTrigger asChild>
          <button
            className="table-control-handle table-control-row"
            onMouseDown={(event) => {
              keepSelection(event);
              focusCell(editor, activeCell);
            }}
            onPointerEnter={handleControlsPointerEnter}
            onPointerLeave={handleControlsPointerLeave}
            style={{
              left: `${layout.leftHandle.left}px`,
              top: `${layout.leftHandle.top}px`,
              transform: "translateY(-50%)",
            }}
            type="button"
          >
            <span className="table-control-dots table-control-dots-vertical" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="table-control-menu w-56" sideOffset={8}>
          {layout.isFirstRow && (
            <>
              <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().toggleHeaderRow().run())}>
                <Rows2 className="size-4" /> Header row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addRowBefore().run())}>
            <Plus className="size-4" /> Insert row above
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addRowAfter().run())}>
            <Plus className="size-4" /> Insert row below
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlignLeft className="size-4" /> Alignment
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="w-44">
              <DropdownMenuItem className={cn(activeAlign === "left" && "table-control-item-active")} onClick={() => setCellAlign("left")}>
                <AlignLeft className="size-4" /> Left
              </DropdownMenuItem>
              <DropdownMenuItem className={cn(activeAlign === "center" && "table-control-item-active")} onClick={() => setCellAlign("center")}>
                <AlignCenter className="size-4" /> Center
              </DropdownMenuItem>
              <DropdownMenuItem className={cn(activeAlign === "right" && "table-control-item-active")} onClick={() => setCellAlign("right")}>
                <AlignRight className="size-4" /> Right
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:bg-destructive/10 focus:text-destructive"
            onClick={() => withActiveCell(() => editor.chain().focus().deleteRow().run())}
          >
            <Trash2 className="size-4" /> Delete row
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <button
        className="table-control-insert table-control-insert-vertical"
        onMouseDown={keepSelection}
        onClick={() => withActiveCell(() => editor.chain().focus().addColumnAfter().run())}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        style={{
          left: `${layout.rightInsert.left}px`,
          top: `${layout.rightInsert.top}px`,
          height: `${layout.rightInsert.height}px`,
          transform: "translateY(-50%)",
        }}
        type="button"
        hidden={!layout.rightInsertVisible}
      >
        <span className="table-control-insert-track">
          <Plus className="size-3" strokeWidth={2.1} />
        </span>
      </button>

      <button
        className="table-control-insert table-control-insert-horizontal"
        onMouseDown={keepSelection}
        onClick={() => withActiveCell(() => editor.chain().focus().addRowAfter().run())}
        onPointerEnter={handleControlsPointerEnter}
        onPointerLeave={handleControlsPointerLeave}
        style={{
          left: `${layout.bottomInsert.left}px`,
          top: `${layout.bottomInsert.top}px`,
          width: `${layout.bottomInsert.width}px`,
          transform: "translateX(-50%)",
        }}
        type="button"
        hidden={!layout.bottomInsertVisible}
      >
        <span className="table-control-insert-track">
          <Plus className="size-3" strokeWidth={2.1} />
        </span>
      </button>
    </>,
    document.body,
  );
}
