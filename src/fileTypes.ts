export type FileCategory =
  | "pdf"
  | "markdown"
  | "mermaid"
  | "json"
  | "jsonl"
  | "text"
  | "epub"
  | "directory"
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
  ".jsonl": "jsonl",
  ".ndjson": "jsonl",
  ".mdx": "markdown",
  ".rst": "text",
  ".diff": "text",
  ".patch": "text",
  ".sh": "text",
  ".bash": "text",
  ".zsh": "text",
  ".fish": "text",
  ".js": "text",
  ".ts": "text",
  ".tsx": "text",
  ".jsx": "text",
  ".py": "text",
  ".rb": "text",
  ".rs": "text",
  ".go": "text",
  ".swift": "text",
};

export function detectFileType(filename: string): FileCategory {
  const dot = filename.lastIndexOf(".");
  if (dot === -1) return "text";
  const ext = filename.slice(dot).toLowerCase();
  return EXT_MAP[ext] ?? "unsupported";
}

export const SUPPORTED_EXTENSIONS = Object.keys(EXT_MAP);

export const FORMAT_LABEL = "PDF, Markdown, JSON, JSONL, Text, Mermaid, EPUB";

export const FORMAT_CHIPS = ["PDF", "MD", "MDX", "JSON", "JSONL", "TXT", "EPUB", "MERMAID", "CSV", "TS", "PY", "SH", "DIFF"];
