import { describe, expect, it } from "vitest";
import type { OutlineItem } from "../outline";
import {
  TOC_SIDEBAR_COLLAPSED_WIDTH,
  TOC_SIDEBAR_DEFAULT_WIDTH,
  TOC_SIDEBAR_MAX_WIDTH,
  TOC_SIDEBAR_MIN_WIDTH,
  buildTocItemReference,
  clampTocSidebarWidth,
  getDescendantExpandableIds,
  getTocItemContextActions,
  getTocPanelContextActions,
  getTocSidebarTriggerPlacement,
  getTocSidebarToggleLabel,
  getTocSidebarWidth,
  updateCollapsedOutlineSections,
} from "../tocInteractions";

const outline: OutlineItem[] = [
  { id: "intro", label: "Intro", depth: 1 },
  { id: "setup", label: "Setup", depth: 2, detail: "2 keys" },
  { id: "install", label: "Install", depth: 3 },
  { id: "usage", label: "Usage", depth: 1 },
];

describe("TOC sidebar sizing", () => {
  it("clamps the resizable sidebar to usable bounds", () => {
    expect(clampTocSidebarWidth(50)).toBe(TOC_SIDEBAR_MIN_WIDTH);
    expect(clampTocSidebarWidth(260)).toBe(260);
    expect(clampTocSidebarWidth(900)).toBe(TOC_SIDEBAR_MAX_WIDTH);
    expect(clampTocSidebarWidth(Number.NaN)).toBe(TOC_SIDEBAR_DEFAULT_WIDTH);
  });

  it("uses the compact rail width while collapsed", () => {
    expect(getTocSidebarWidth({ collapsed: true, width: 320 })).toBe(TOC_SIDEBAR_COLLAPSED_WIDTH);
    expect(getTocSidebarWidth({ collapsed: false, width: 320 })).toBe(320);
  });

  it("provides clear accessible labels for the modern sidebar toggle", () => {
    expect(getTocSidebarToggleLabel(true)).toBe("Show table of contents");
    expect(getTocSidebarToggleLabel(false)).toBe("Hide table of contents");
  });

  it("keeps the sidebar trigger anchored to the sidebar edge in both states", () => {
    expect(getTocSidebarTriggerPlacement(false)).toEqual({
      className: "toc-edge-toggle expanded",
      edge: "expanded-sidebar-edge",
    });
    expect(getTocSidebarTriggerPlacement(true)).toEqual({
      className: "toc-edge-toggle collapsed",
      edge: "collapsed-sidebar-edge",
    });
  });
});

describe("TOC right click actions", () => {
  it("offers navigation, collapse, and copy actions for expandable sections", () => {
    expect(
      getTocItemContextActions({ item: outline[0], hasChildren: true, collapsed: false }).map(
        (action) => action.id,
      ),
    ).toEqual([
      "go-to-section",
      "collapse-section",
      "collapse-children",
      "copy-label",
      "copy-reference",
    ]);
  });

  it("offers expansion actions for collapsed expandable sections", () => {
    expect(
      getTocItemContextActions({ item: outline[0], hasChildren: true, collapsed: true }).map(
        (action) => action.id,
      ),
    ).toEqual([
      "go-to-section",
      "expand-section",
      "expand-children",
      "copy-label",
      "copy-reference",
    ]);
  });

  it("keeps leaf section actions focused on navigation and copy", () => {
    expect(
      getTocItemContextActions({ item: outline[2], hasChildren: false, collapsed: false }).map(
        (action) => action.id,
      ),
    ).toEqual(["go-to-section", "copy-label", "copy-reference"]);
  });

  it("offers panel-level actions for width and global section state", () => {
    expect(getTocPanelContextActions({ collapsed: false }).map((action) => action.id)).toEqual([
      "hide-sidebar",
      "reset-sidebar-width",
      "expand-all-sections",
      "collapse-all-sections",
    ]);

    expect(getTocPanelContextActions({ collapsed: true }).map((action) => action.id)).toEqual([
      "show-sidebar",
      "expand-all-sections",
      "collapse-all-sections",
    ]);
  });

  it("builds compact copyable section references", () => {
    expect(buildTocItemReference(outline[1])).toBe("Setup — 2 keys (#setup)");
    expect(buildTocItemReference(outline[2])).toBe("Install (#install)");
  });
});

describe("TOC collapse action state", () => {
  it("finds expandable descendants for bulk actions", () => {
    expect(getDescendantExpandableIds(outline, "intro")).toEqual(["setup"]);
  });

  it("updates collapsed section state for item and panel context actions", () => {
    expect([...updateCollapsedOutlineSections(outline, new Set(), "collapse-section", "intro")]).toEqual([
      "intro",
    ]);
    expect([...updateCollapsedOutlineSections(outline, new Set(["intro"]), "expand-section", "intro")]).toEqual([]);
    expect([...updateCollapsedOutlineSections(outline, new Set(), "collapse-all-sections")]).toEqual([
      "intro",
      "setup",
    ]);
    expect([...updateCollapsedOutlineSections(outline, new Set(["intro", "setup"]), "expand-all-sections")]).toEqual([]);
  });
});
