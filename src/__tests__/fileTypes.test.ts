import { describe, it, expect } from "vitest";
import { detectFileType, SUPPORTED_EXTENSIONS } from "../fileTypes";

describe("detectFileType", () => {
  it("detects PDF files", () => {
    expect(detectFileType("report.pdf")).toBe("pdf");
    expect(detectFileType("REPORT.PDF")).toBe("pdf");
  });

  it("detects Markdown files", () => {
    expect(detectFileType("README.md")).toBe("markdown");
    expect(detectFileType("notes.markdown")).toBe("markdown");
  });

  it("detects Mermaid files", () => {
    expect(detectFileType("diagram.mmd")).toBe("mermaid");
    expect(detectFileType("flow.mermaid")).toBe("mermaid");
  });

  it("detects JSON files", () => {
    expect(detectFileType("data.json")).toBe("json");
  });

  it("detects text files", () => {
    expect(detectFileType("readme.txt")).toBe("text");
    expect(detectFileType("server.log")).toBe("text");
    expect(detectFileType("data.csv")).toBe("text");
    expect(detectFileType("config.yaml")).toBe("text");
    expect(detectFileType("settings.toml")).toBe("text");
  });

  it("detects EPUB files", () => {
    expect(detectFileType("book.epub")).toBe("epub");
  });

  it("returns text for extensionless files", () => {
    expect(detectFileType("Makefile")).toBe("text");
  });

  it("returns unsupported for unknown extensions", () => {
    expect(detectFileType("image.png")).toBe("unsupported");
    expect(detectFileType("video.mp4")).toBe("unsupported");
    expect(detectFileType("archive.zip")).toBe("unsupported");
  });

  it("handles case insensitivity", () => {
    expect(detectFileType("Doc.MD")).toBe("markdown");
    expect(detectFileType("Data.JSON")).toBe("json");
    expect(detectFileType("Book.EPUB")).toBe("epub");
  });
});

describe("SUPPORTED_EXTENSIONS", () => {
  it("includes key extensions", () => {
    expect(SUPPORTED_EXTENSIONS).toContain(".pdf");
    expect(SUPPORTED_EXTENSIONS).toContain(".md");
    expect(SUPPORTED_EXTENSIONS).toContain(".json");
    expect(SUPPORTED_EXTENSIONS).toContain(".epub");
    expect(SUPPORTED_EXTENSIONS).toContain(".mmd");
  });
});
