import { getOutlineChildren, outlineItemHasChildren, type OutlineItem } from "./outline";

export const TOC_SIDEBAR_MIN_WIDTH = 180;
export const TOC_SIDEBAR_DEFAULT_WIDTH = 230;
export const TOC_SIDEBAR_MAX_WIDTH = 420;
export const TOC_SIDEBAR_COLLAPSED_WIDTH = 44;

export function clampTocSidebarWidth(width: number): number {
  if (!Number.isFinite(width)) return TOC_SIDEBAR_DEFAULT_WIDTH;
  return Math.min(TOC_SIDEBAR_MAX_WIDTH, Math.max(TOC_SIDEBAR_MIN_WIDTH, Math.round(width)));
}

export function getTocSidebarWidth({ collapsed, width }: { collapsed: boolean; width: number }): number {
  return collapsed ? TOC_SIDEBAR_COLLAPSED_WIDTH : clampTocSidebarWidth(width);
}

export function getTocSidebarToggleLabel(collapsed: boolean): string {
  return collapsed ? "Show table of contents" : "Hide table of contents";
}

export function getTocSidebarTriggerPlacement(collapsed: boolean): {
  className: string;
  edge: "collapsed-sidebar-edge" | "expanded-sidebar-edge";
} {
  return collapsed
    ? { className: "toc-edge-toggle collapsed", edge: "collapsed-sidebar-edge" }
    : { className: "toc-edge-toggle expanded", edge: "expanded-sidebar-edge" };
}

export type TocContextActionId =
  | "go-to-section"
  | "expand-section"
  | "collapse-section"
  | "expand-children"
  | "collapse-children"
  | "copy-label"
  | "copy-reference"
  | "show-sidebar"
  | "hide-sidebar"
  | "reset-sidebar-width"
  | "expand-all-sections"
  | "collapse-all-sections";

export interface TocContextAction {
  id: TocContextActionId;
  label: string;
}

export function buildTocItemReference(item: OutlineItem): string {
  const detail = item.detail ? ` — ${item.detail}` : "";
  return `${item.label}${detail} (#${item.id})`;
}

export function getTocItemContextActions({
  hasChildren,
  collapsed,
}: {
  item: OutlineItem;
  hasChildren: boolean;
  collapsed: boolean;
}): TocContextAction[] {
  const actions: TocContextAction[] = [{ id: "go-to-section", label: "Go to section" }];

  if (hasChildren) {
    actions.push(
      collapsed
        ? { id: "expand-section", label: "Expand section" }
        : { id: "collapse-section", label: "Collapse section" },
      collapsed
        ? { id: "expand-children", label: "Expand children" }
        : { id: "collapse-children", label: "Collapse children" },
    );
  }

  actions.push(
    { id: "copy-label", label: "Copy title" },
    { id: "copy-reference", label: "Copy section reference" },
  );

  return actions;
}

export function getTocPanelContextActions({ collapsed }: { collapsed: boolean }): TocContextAction[] {
  return [
    collapsed ? { id: "show-sidebar", label: "Show sidebar" } : { id: "hide-sidebar", label: "Hide sidebar" },
    ...(collapsed ? [] : [{ id: "reset-sidebar-width", label: "Reset sidebar width" } as TocContextAction]),
    { id: "expand-all-sections", label: "Expand all sections" },
    { id: "collapse-all-sections", label: "Collapse all sections" },
  ];
}

export function getDescendantExpandableIds(outline: OutlineItem[], id: string): string[] {
  return getOutlineChildren(outline, id)
    .filter((child) => outlineItemHasChildren(outline, child.id))
    .map((child) => child.id);
}

function getAllExpandableIds(outline: OutlineItem[]): string[] {
  return outline.filter((item) => outlineItemHasChildren(outline, item.id)).map((item) => item.id);
}

export function updateCollapsedOutlineSections(
  outline: OutlineItem[],
  current: Set<string>,
  action: TocContextActionId,
  itemId?: string,
): Set<string> {
  const next = new Set(current);

  switch (action) {
    case "collapse-section":
      if (itemId) next.add(itemId);
      return next;
    case "expand-section":
      if (itemId) next.delete(itemId);
      return next;
    case "collapse-children":
      if (itemId) {
        next.add(itemId);
        getDescendantExpandableIds(outline, itemId).forEach((id) => next.add(id));
      }
      return next;
    case "expand-children":
      if (itemId) {
        next.delete(itemId);
        getDescendantExpandableIds(outline, itemId).forEach((id) => next.delete(id));
      }
      return next;
    case "collapse-all-sections":
      return new Set(getAllExpandableIds(outline));
    case "expand-all-sections":
      return new Set();
    default:
      return next;
  }
}
