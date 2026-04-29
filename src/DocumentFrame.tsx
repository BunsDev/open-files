import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import {
  getVisibleOutlineItems,
  outlineItemHasChildren,
  type OutlineItem,
} from "./outline";
import {
  TOC_SIDEBAR_DEFAULT_WIDTH,
  TOC_SIDEBAR_MAX_WIDTH,
  TOC_SIDEBAR_MIN_WIDTH,
  buildTocItemReference,
  clampTocSidebarWidth,
  getTocItemContextActions,
  getTocPanelContextActions,
  getTocSidebarTriggerPlacement,
  getTocSidebarToggleLabel,
  getTocSidebarWidth,
  updateCollapsedOutlineSections,
  type TocContextAction,
  type TocContextActionId,
} from "./tocInteractions";

interface Props {
  outline: OutlineItem[];
  activeId?: string;
  children: ReactNode;
  className?: string;
  onSelect: (item: OutlineItem) => void;
}

interface TocContextMenuState {
  x: number;
  y: number;
  item?: OutlineItem;
  actions: TocContextAction[];
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className="toc-sidebar-icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="4" width="17" height="16" rx="3" />
      <path d="M9 4.5v15" />
      <path d={collapsed ? "M14 9l3 3-3 3" : "M16 9l-3 3 3 3"} />
    </svg>
  );
}

export function DocumentFrame({ outline, activeId, children, className = "", onSelect }: Props) {
  const [tocCollapsed, setTocCollapsed] = useState(false);
  const [tocWidth, setTocWidth] = useState(TOC_SIDEBAR_DEFAULT_WIDTH);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<TocContextMenuState | null>(null);
  const visibleOutline = useMemo(
    () => getVisibleOutlineItems(outline, collapsedSections),
    [collapsedSections, outline],
  );
  const resolvedSidebarWidth = getTocSidebarWidth({ collapsed: tocCollapsed, width: tocWidth });
  const sidebarTriggerPlacement = getTocSidebarTriggerPlacement(tocCollapsed);
  const frameStyle = {
    "--toc-sidebar-width": `${resolvedSidebarWidth}px`,
  } as CSSProperties;

  useEffect(() => {
    if (!contextMenu) return;

    const close = () => setContextMenu(null);
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };

    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  const toggleSection = (id: string) => {
    setCollapsedSections((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const updateCollapsedSections = (action: TocContextActionId, itemId?: string) => {
    setCollapsedSections((current) => updateCollapsedOutlineSections(outline, current, action, itemId));
  };

  const copyText = (text: string) => {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(text).catch(() => undefined);
  };

  const executeContextAction = (action: TocContextAction, item?: OutlineItem) => {
    setContextMenu(null);

    switch (action.id) {
      case "go-to-section":
        if (item) onSelect(item);
        break;
      case "copy-label":
        if (item) copyText(item.label);
        break;
      case "copy-reference":
        if (item) copyText(buildTocItemReference(item));
        break;
      case "hide-sidebar":
        setTocCollapsed(true);
        break;
      case "show-sidebar":
        setTocCollapsed(false);
        break;
      case "reset-sidebar-width":
        setTocWidth(TOC_SIDEBAR_DEFAULT_WIDTH);
        break;
      default:
        updateCollapsedSections(action.id, item?.id);
        break;
    }
  };

  const openItemContextMenu = (
    event: ReactMouseEvent,
    item: OutlineItem,
    hasChildren: boolean,
    sectionCollapsed: boolean,
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item,
      actions: getTocItemContextActions({ item, hasChildren, collapsed: sectionCollapsed }),
    });
  };

  const openPanelContextMenu = (event: ReactMouseEvent) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      actions: getTocPanelContextActions({ collapsed: tocCollapsed }),
    });
  };

  const startSidebarResize = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (tocCollapsed) return;

    event.preventDefault();
    setContextMenu(null);
    setIsResizingSidebar(true);

    const startX = event.clientX;
    const startWidth = tocWidth;

    const resize = (moveEvent: PointerEvent) => {
      setTocWidth(clampTocSidebarWidth(startWidth + moveEvent.clientX - startX));
    };

    const stopResize = () => {
      setIsResizingSidebar(false);
      window.removeEventListener("pointermove", resize);
      window.removeEventListener("pointerup", stopResize);
      window.removeEventListener("pointercancel", stopResize);
    };

    window.addEventListener("pointermove", resize);
    window.addEventListener("pointerup", stopResize);
    window.addEventListener("pointercancel", stopResize);
  };

  const resizeSidebarWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (tocCollapsed) return;

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setTocWidth((width) => clampTocSidebarWidth(width - 16));
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setTocWidth((width) => clampTocSidebarWidth(width + 16));
    } else if (event.key === "Home") {
      event.preventDefault();
      setTocWidth(TOC_SIDEBAR_MIN_WIDTH);
    } else if (event.key === "End") {
      event.preventDefault();
      setTocWidth(TOC_SIDEBAR_MAX_WIDTH);
    } else if (event.key === "Enter") {
      event.preventDefault();
      setTocWidth(TOC_SIDEBAR_DEFAULT_WIDTH);
    }
  };

  return (
    <div
      className={`viewer document-frame ${tocCollapsed ? "toc-collapsed" : ""} ${isResizingSidebar ? "toc-resizing" : ""} ${className}`.trim()}
      style={frameStyle}
    >
      <aside
        className="toc-panel"
        aria-label="Table of contents"
        aria-expanded={!tocCollapsed}
        onContextMenu={openPanelContextMenu}
      >
        {!tocCollapsed && <div className="toc-heading">Contents</div>}

        {!tocCollapsed && (
          outline.length === 0 ? (
            <p className="toc-empty">No sections</p>
          ) : (
            <nav className="toc-list">
              {visibleOutline.map((item) => {
                const hasChildren = outlineItemHasChildren(outline, item.id);
                const sectionCollapsed = collapsedSections.has(item.id);

                return (
                  <div
                    key={item.id}
                    className="toc-item-row"
                    onContextMenu={(event) => openItemContextMenu(event, item, hasChildren, sectionCollapsed)}
                  >
                    <button
                      className="toc-section-toggle"
                      type="button"
                      disabled={!hasChildren}
                      onClick={() => toggleSection(item.id)}
                      aria-label={sectionCollapsed ? `Expand ${item.label}` : `Collapse ${item.label}`}
                      aria-expanded={hasChildren ? !sectionCollapsed : undefined}
                      style={{ marginLeft: `${Math.max(0, item.depth - 1) * 14}px` }}
                    >
                      {hasChildren ? (sectionCollapsed ? "›" : "⌄") : ""}
                    </button>
                    <button
                      className={`toc-item${activeId === item.id ? " active" : ""}${hasChildren ? " has-children" : ""}`}
                      onClick={() => onSelect(item)}
                      type="button"
                      aria-label={`Go to ${item.label}`}
                    >
                      <span className="toc-label">{item.label}</span>
                      {item.detail && <span className="toc-detail">{item.detail}</span>}
                    </button>
                  </div>
                );
              })}
            </nav>
          )
        )}
      </aside>

      <button
        className={sidebarTriggerPlacement.className}
        data-edge={sidebarTriggerPlacement.edge}
        type="button"
        onClick={() => setTocCollapsed((collapsed) => !collapsed)}
        aria-label={getTocSidebarToggleLabel(tocCollapsed)}
        aria-expanded={!tocCollapsed}
        title={getTocSidebarToggleLabel(tocCollapsed)}
      >
        <SidebarToggleIcon collapsed={tocCollapsed} />
      </button>

      {!tocCollapsed && (
        <div
          className="toc-resize-handle"
          role="separator"
          aria-label="Resize table of contents"
          aria-orientation="vertical"
          aria-valuemin={TOC_SIDEBAR_MIN_WIDTH}
          aria-valuemax={TOC_SIDEBAR_MAX_WIDTH}
          aria-valuenow={tocWidth}
          tabIndex={0}
          onPointerDown={startSidebarResize}
          onKeyDown={resizeSidebarWithKeyboard}
          title="Drag to resize table of contents"
        />
      )}

      <section className="document-main">{children}</section>

      {contextMenu && (
        <div
          className="toc-context-menu"
          role="menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
        >
          {contextMenu.actions.map((action) => (
            <button
              key={action.id}
              className="toc-context-menu-item"
              type="button"
              role="menuitem"
              onClick={() => executeContextAction(action, contextMenu.item)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
