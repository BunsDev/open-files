export type FileCategory =
  | "pdf"
  | "markdown"
  | "mermaid"
  | "json"
  | "text"
  | "epub"
  | "unsupported";

const EXT_MAP: Record<string, FileCategory> = {
  ".pdf": "pdf",
  ".md": "markdown",
  ".markdown": "markdown",
  ".mmd": "mermaid",
  ".mermaid": "mermaid",
  ".json": "json",
  ".txt": "text",
  ".text": "text",
  ".log": "text",
  ".csv": "text",
  ".tsv": "text",
  ".ini": "text",
  ".cfg": "text",
  ".conf": "text",
  ".yaml": "text",
  ".yml": "text",
  ".toml": "text",
  ".xml": "text",
  ".env": "text",
  ".epub": "epub",
};

export function detectFileType(filename: string): FileCategory {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "text";
  const ext = filename.slice(dot).toLowerCase();
  return EXT_MAP[ext] ?? "unsupported";
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP);

export const FORMAT_LABEL = "PDF, Markdown, JSON, Text, Mermaid, EPUB";
