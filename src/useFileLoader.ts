import { useState, useCallback } from "react";
import { FileCategory, detectFileType } from "./fileTypes";

export interface LoadedFile {
  name: string;
  category: FileCategory;
  /** Text content for text-based formats */
  text?: string;
  /** Raw binary for PDF / EPUB */
  binary?: ArrayBuffer;
  size: number;
}

/** Check if we're running inside Tauri */
function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

async function openWithTauri(): Promise<LoadedFile | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readFile, readTextFile } = await import("@tauri-apps/plugin-fs");

  const selected = await open({
    multiple: false,
    title: "Open a file",
    filters: [
      {
        name: "Supported files",
        extensions: [
          "pdf", "md", "markdown", "mmd", "mermaid",
          "json", "txt", "text", "log", "csv", "tsv",
          "ini", "cfg", "conf", "yaml", "yml", "toml",
          "xml", "env", "epub",
        ],
      },
      { name: "All files", extensions: ["*"] },
    ],
  });

  if (!selected) return null;

  const filePath = typeof selected === "string" ? selected : (selected as unknown as { path: string }).path;
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  const category = detectFileType(name);

  if (category === "pdf" || category === "epub") {
    const bytes = await readFile(filePath);
    const binary = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return { name, category, binary, size: binary.byteLength };
  }

  const text = await readTextFile(filePath);
  return { name, category, text, size: new Blob([text]).size };
}

async function openWithBrowser(): Promise<LoadedFile | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".pdf,.md,.markdown,.mmd,.mermaid,.json,.txt,.text,.log,.csv,.tsv,.ini,.cfg,.conf,.yaml,.yml,.toml,.xml,.env,.epub";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      const name = file.name;
      const category = detectFileType(name);

      if (category === "pdf" || category === "epub") {
        const binary = await file.arrayBuffer();
        resolve({ name, category, binary, size: binary.byteLength });
      } else {
        const text = await file.text();
        resolve({ name, category, text, size: file.size });
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function useFileLoader() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const openFile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = isTauri() ? await openWithTauri() : await openWithBrowser();
      if (result) setFile(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (!droppedFile) return;

    setLoading(true);
    setError(null);
    try {
      const name = droppedFile.name;
      const category = detectFileType(name);
      if (category === "pdf" || category === "epub") {
        const binary = await droppedFile.arrayBuffer();
        setFile({ name, category, binary, size: binary.byteLength });
      } else {
        const text = await droppedFile.text();
        setFile({ name, category, text, size: droppedFile.size });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const closeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  return { file, loading, error, openFile, handleDrop, closeFile, formatSize };
}
