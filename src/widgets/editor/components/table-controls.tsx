import { type Editor, useEditorState } from "@tiptap/react";
import { CellSelection, deleteCellSelection, findCellPos, moveTableColumn, moveTableRow, setCellAttr } from "@tiptap/pm/tables";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Columns2,
  Eraser,
  Ellipsis,
  PaintBucket,
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

type ColorItem = {
  label: string;
  value: string;
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
      left: tableRect.left - 8,
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

const resolveCellPosition = (editor: Editor, cell: HTMLTableCellElement) => {
  const candidates = [
    editor.view.posAtDOM(cell, 0),
    editor.view.posAtDOM(cell, cell.childNodes.length),
    editor.view.posAtDOM(cell, 0) + 1,
  ];

  for (const pos of candidates) {
    const $cell = findCellPos(editor.state.doc, pos);

    if ($cell) {
      return $cell;
    }
  }

  return null;
};

const selectTableAxis = (editor: Editor, cell: HTMLTableCellElement | null, axis: "column" | "row") => {
  if (!cell || !editor.view || editor.isDestroyed) {
    return false;
  }

  try {
    const $cell = resolveCellPosition(editor, cell);

    if (!$cell) {
      return focusCell(editor, cell);
    }

    const selection = axis === "column" ? CellSelection.colSelection($cell) : CellSelection.rowSelection($cell);

    editor.view.dispatch(editor.state.tr.setSelection(selection).scrollIntoView());
    editor.view.focus();
    return true;
  } catch {
    return focusCell(editor, cell);
  }
};

const getTableAxisInfo = (cell: HTMLTableCellElement | null) => {
  const table = cell?.closest("table");
  const row = cell?.closest("tr");

  if (!cell || !(table instanceof HTMLTableElement) || !(row instanceof HTMLTableRowElement)) {
    return null;
  }

  return {
    columnIndex: cell.cellIndex,
    columnCount: row.cells.length,
    rowCount: table.rows.length,
    rowIndex: Array.from(table.rows).indexOf(row),
  };
};

const runTableCommand = (editor: Editor, command: ReturnType<typeof moveTableColumn>) => {
  if (!editor.view || editor.isDestroyed) {
    return false;
  }

  const didRun = command(editor.state, editor.view.dispatch);

  if (didRun) {
    editor.view.focus();
  }

  return didRun;
};

export function TableControls({ container, editor }: TableControlsProps) {
  const hoveredLayoutRef = useRef<LayoutState | null>(null);
  const controlsHoveredRef = useRef(false);
  const hideTimeoutRef = useRef<number | null>(null);
  const columnMenuOpenRef = useRef(false);
  const rowMenuOpenRef = useRef(false);
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

  const activeRowIsHeader =
    activeCell
      ?.closest("tr")
      ?.querySelectorAll("th").length === activeCell?.closest("tr")?.cells.length;
  const activeColumnIsHeader =
    activeCell?.closest("table")
      ? Array.from(activeCell.closest("table")?.rows ?? []).every((row) => row.cells[activeCell.cellIndex]?.tagName === "TH")
      : false;

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
            if (!controlsHoveredRef.current && !columnMenuOpenRef.current && !rowMenuOpenRef.current) {
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
        const activeHoveredCell = hoveredLayoutRef.current.activeCell;
        const nextLayout = buildLayout(activeHoveredCell);
        hoveredLayoutRef.current = nextLayout;
        setLayout(nextLayout);
        return;
      }

      if (!columnMenuOpenRef.current && !rowMenuOpenRef.current && !controlsHoveredRef.current) {
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
  }, [editor]);

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
        if (!controlsHoveredRef.current && !hoveredLayoutRef.current && !columnMenuOpenRef.current && !rowMenuOpenRef.current) {
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

  const moveColumn = (direction: -1 | 1) => {
    const axisInfo = getTableAxisInfo(activeCell);

    if (!axisInfo) {
      return;
    }

    const targetIndex = axisInfo.columnIndex + direction;

    if (targetIndex < 0 || targetIndex >= axisInfo.columnCount) {
      return;
    }

    selectTableAxis(editor, activeCell, "column");
    runTableCommand(editor, moveTableColumn({ from: axisInfo.columnIndex, to: targetIndex, select: true }));
  };

  const moveRow = (direction: -1 | 1) => {
    const axisInfo = getTableAxisInfo(activeCell);

    if (!axisInfo) {
      return;
    }

    const targetIndex = axisInfo.rowIndex + direction;

    if (targetIndex < 0 || targetIndex >= axisInfo.rowCount) {
      return;
    }

    selectTableAxis(editor, activeCell, "row");
    runTableCommand(editor, moveTableRow({ from: axisInfo.rowIndex, to: targetIndex, select: true }));
  };

  const setAxisColor = (axis: "column" | "row", attr: "backgroundColor" | "textColor", value: string) => {
    if (!selectTableAxis(editor, activeCell, axis)) {
      return;
    }

    runTableCommand(editor, setCellAttr(attr, value || null));
  };

  const clearAxisContents = (axis: "column" | "row") => {
    if (!selectTableAxis(editor, activeCell, axis)) {
      return;
    }

    runTableCommand(editor, deleteCellSelection);
  };

  const renderColorSubmenu = (axis: "column" | "row") => (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <PaintBucket className="size-4" /> Color
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="table-control-menu table-control-color-menu" collisionPadding={16}>
        <div className="table-control-color-label">Text Color</div>
        <div className="table-control-color-grid">
          {tableTextColors.map((color) => (
            <button
              key={`${axis}-text-${color.label}`}
              aria-label={`${color.label} text color`}
              className="table-control-color-swatch"
              onClick={() => setAxisColor(axis, "textColor", color.value)}
              onMouseDown={keepSelection}
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
              key={`${axis}-background-${color.label}`}
              aria-label={`${color.label} background color`}
              className="table-control-background-swatch"
              onClick={() => setAxisColor(axis, "backgroundColor", color.value)}
              onMouseDown={keepSelection}
              type="button"
            >
              <span style={{ background: color.value || "#fff" }} />
            </button>
          ))}
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );

  if (!layout) {
    return null;
  }

  return createPortal(
    <>
      <DropdownMenu
        open={columnMenuOpen}
        onOpenChange={(open) => {
          columnMenuOpenRef.current = open;
          setColumnMenuOpen(open);
          if (open) {
            if (hideTimeoutRef.current) {
              window.clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
            selectTableAxis(editor, activeCell, "column");
          }
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
              selectTableAxis(editor, activeCell, "column");
            }}
            onClick={() => {
              selectTableAxis(editor, activeCell, "column");
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
            <Ellipsis className="table-control-dots-icon" strokeWidth={2.2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="table-control-menu w-56" collisionPadding={16} sideOffset={8}>
          {layout.isFirstColumn && (
            <>
              <DropdownMenuItem
                className={cn(activeColumnIsHeader && "table-control-item-active")}
                onClick={() => withActiveCell(() => editor.chain().focus().toggleHeaderColumn().run())}
              >
                <Columns2 className="size-4" /> Header column
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => moveColumn(-1)}>
            <ArrowLeft className="size-4" /> Move column left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => moveColumn(1)}>
            <ArrowRight className="size-4" /> Move column right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addColumnBefore().run())}>
            <Plus className="size-4" /> Insert column left
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addColumnAfter().run())}>
            <Plus className="size-4" /> Insert column right
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {renderColorSubmenu("column")}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlignLeft className="size-4" /> Alignment
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="table-control-menu table-control-submenu w-44" collisionPadding={16}>
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
          <DropdownMenuItem onClick={() => clearAxisContents("column")}>
            <Eraser className="size-4" /> Clear column contents
          </DropdownMenuItem>
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
          rowMenuOpenRef.current = open;
          setRowMenuOpen(open);
          if (open) {
            if (hideTimeoutRef.current) {
              window.clearTimeout(hideTimeoutRef.current);
              hideTimeoutRef.current = null;
            }
            selectTableAxis(editor, activeCell, "row");
          }
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
              selectTableAxis(editor, activeCell, "row");
            }}
            onClick={() => {
              selectTableAxis(editor, activeCell, "row");
            }}
            onPointerEnter={handleControlsPointerEnter}
            onPointerLeave={handleControlsPointerLeave}
            style={{
              left: `${layout.leftHandle.left}px`,
              top: `${layout.leftHandle.top}px`,
              transform: "translate(-50%, -50%) rotate(90deg)",
            }}
            type="button"
          >
            <Ellipsis className="table-control-dots-icon" strokeWidth={2.2} />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="table-control-menu w-56" collisionPadding={16} sideOffset={8}>
          {layout.isFirstRow && (
            <>
              <DropdownMenuItem
                className={cn(activeRowIsHeader && "table-control-item-active")}
                onClick={() => withActiveCell(() => editor.chain().focus().toggleHeaderRow().run())}
              >
                <Rows2 className="size-4" /> Header row
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => moveRow(-1)}>
            <ArrowUp className="size-4" /> Move row up
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => moveRow(1)}>
            <ArrowDown className="size-4" /> Move row down
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addRowBefore().run())}>
            <Plus className="size-4" /> Insert row above
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => withActiveCell(() => editor.chain().focus().addRowAfter().run())}>
            <Plus className="size-4" /> Insert row below
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {renderColorSubmenu("row")}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <AlignLeft className="size-4" /> Alignment
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="table-control-menu table-control-submenu w-44" collisionPadding={16}>
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
          <DropdownMenuItem onClick={() => clearAxisContents("row")}>
            <Eraser className="size-4" /> Clear row contents
          </DropdownMenuItem>
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
