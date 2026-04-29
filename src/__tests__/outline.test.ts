import { describe, expect, it } from "vitest";
import {
  buildJsonOutline,
  buildMarkdownOutline,
  buildPdfOutline,
  buildTextOutline,
  getJsonNodeSummary,
  getOutlineChildren,
  getOutlineItemActivation,
  getVisibleOutlineItems,
  outlineItemHasChildren,
} from "../outline";

describe("buildMarkdownOutline", () => {
  it("extracts clickable heading items with stable slugs", () => {
    const outline = buildMarkdownOutline(`# Intro\n\n## Details\n\n### Details\n\n# Intro`);

    expect(outline).toEqual([
      { id: "intro", label: "Intro", depth: 1 },
      { id: "details", label: "Details", depth: 2 },
      { id: "details-2", label: "Details", depth: 3 },
      { id: "intro-2", label: "Intro", depth: 1 },
    ]);
  });
});

describe("buildJsonOutline", () => {
  it("creates section entries for nested objects and arrays", () => {
    const parsed = {
      project: { name: "open-files", targets: ["macOS", "Windows"] },
      release: { private: true },
    };

    expect(buildJsonOutline(parsed)).toEqual([
      { id: "json-root", label: "Root", detail: "2 keys", depth: 1 },
      { id: "json-project", label: "project", detail: "2 keys", depth: 2 },
      { id: "json-project-targets", label: "targets", detail: "2 items", depth: 3 },
      { id: "json-release", label: "release", detail: "1 key", depth: 2 },
    ]);
  });

  it("summarizes collapsible JSON sections", () => {
    expect(getJsonNodeSummary({ name: "open-files", private: true })).toBe("2 keys");
    expect(getJsonNodeSummary(["pdf", "md", "json"])).toBe("3 items");
  });
});

describe("simple outlines", () => {
  it("creates page entries for PDFs", () => {
    expect(buildPdfOutline(3)).toEqual([
      { id: "pdf-page-1", label: "Page 1", depth: 1 },
      { id: "pdf-page-2", label: "Page 2", depth: 1 },
      { id: "pdf-page-3", label: "Page 3", depth: 1 },
    ]);
  });

  it("creates a useful fallback outline for plain text", () => {
    expect(buildTextOutline("first\nsecond")).toEqual([
      { id: "text-start", label: "Start", detail: "2 lines", depth: 1 },
    ]);
  });
});

describe("collapsible outline helpers", () => {
  const outline = [
    { id: "intro", label: "Intro", depth: 1 },
    { id: "setup", label: "Setup", depth: 2 },
    { id: "install", label: "Install", depth: 3 },
    { id: "usage", label: "Usage", depth: 1 },
  ];

  it("detects whether an outline item has nested children", () => {
    expect(outlineItemHasChildren(outline, "intro")).toBe(true);
    expect(outlineItemHasChildren(outline, "setup")).toBe(true);
    expect(outlineItemHasChildren(outline, "install")).toBe(false);
    expect(outlineItemHasChildren(outline, "usage")).toBe(false);
  });

  it("returns the direct and nested children for a section", () => {
    expect(getOutlineChildren(outline, "intro").map((item) => item.id)).toEqual([
      "setup",
      "install",
    ]);
  });

  it("hides nested items when their parent section is collapsed", () => {
    expect(getVisibleOutlineItems(outline, new Set(["intro"])).map((item) => item.id)).toEqual([
      "intro",
      "usage",
    ]);
  });

  it("hides descendants when an intermediate section is collapsed", () => {
    expect(getVisibleOutlineItems(outline, new Set(["setup"])).map((item) => item.id)).toEqual([
      "intro",
      "setup",
      "usage",
    ]);
  });

  it("uses row activation to navigate sections and leaf items", () => {
    expect(getOutlineItemActivation(outline, "intro")).toBe("select");
    expect(getOutlineItemActivation(outline, "setup")).toBe("select");
    expect(getOutlineItemActivation(outline, "install")).toBe("select");
    expect(getOutlineItemActivation(outline, "usage")).toBe("select");
  });
});
