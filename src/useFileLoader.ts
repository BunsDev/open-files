import { useState, useCallback } from "react";
import { FileCategory, detectFileType } from "./fileTypes";

export interface DirectoryEntry {
  name: string;
  path: string;
  isDir: boolean;
  category: FileCategory;
  children?: DirectoryEntry[]; // populated on expand
}

export interface LoadedFile {
  name: string;
  path?: string;
  category: FileCategory;
  /** Text content for text-based formats */
  text?: string;
  /** Raw binary for PDF / EPUB */
  binary?: ArrayBuffer;
  size: number;
  /** Directory entries for category === "directory" */
  directoryEntries?: DirectoryEntry[];
}

export interface RecentFile {
  name: string;
  path: string;
  category: FileCategory;
  lastOpened: number;
}

const RECENT_KEY = "open-files:recent";
const MAX_RECENT = 20;

function loadRecent(): RecentFile[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RecentFile[];
  } catch {
    return [];
  }
}

function saveRecent(recent: RecentFile[]) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {
    // ignore
  }
}

function pushRecent(recent: RecentFile[], entry: RecentFile): RecentFile[] {
  const filtered = recent.filter((r) => r.path !== entry.path);
  return [entry, ...filtered].slice(0, MAX_RECENT);
}

/** Check if we're running inside Tauri */
export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function openDirectoryWithTauri(): Promise<{ file: LoadedFile; path: string } | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readDir } = await import("@tauri-apps/plugin-fs");

  const selected = await open({ directory: true, title: "Open a folder" });
  if (!selected) return null;

  const dirPath = typeof selected === "string" ? selected : (selected as unknown as { path: string }).path;
  const name = dirPath.split(/[/\\]/).pop() ?? dirPath;

  const rawEntries = await readDir(dirPath);
  const entries: DirectoryEntry[] = (rawEntries as Array<{ name?: string; isDirectory?: boolean; isDir?: boolean; children?: unknown[] }>).map((e) => {
    const eName = e.name ?? "";
    const isDir = !!(e.isDirectory ?? e.isDir ?? (Array.isArray(e.children)));
    const ePath = dirPath + "/" + eName;
    return {
      name: eName,
      path: ePath,
      isDir,
      category: isDir ? ("directory" as FileCategory) : detectFileType(eName),
    };
  });

  const file: LoadedFile = {
    name,
    path: dirPath,
    category: "directory",
    size: entries.length,
    directoryEntries: entries,
  };

  return { file, path: dirPath };
}

async function openWithTauri(): Promise<{ file: LoadedFile; path: string } | null> {
  const { open } = await import("@tauri-apps/plugin-dialog");
  const { readFile, readTextFile } = await import("@tauri-apps/plugin-fs");

  const selected = await open({
    multiple: false,
    title: "Open a file",
    filters: [
      {
        name: "Supported files",
        extensions: [
          "pdf", "md", "markdown", "mdx", "mmd", "mermaid",
          "json", "jsonl", "ndjson", "txt", "text", "log", "csv", "tsv",
          "ini", "cfg", "conf", "yaml", "yml", "toml",
          "xml", "env", "epub", "rst", "diff", "patch",
          "sh", "bash", "zsh", "fish", "js", "ts", "tsx", "jsx",
          "py", "rb", "rs", "go", "swift",
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
    return { file: { name, path: filePath, category, binary, size: binary.byteLength }, path: filePath };
  }

  const text = await readTextFile(filePath);
  return { file: { name, path: filePath, category, text, size: new Blob([text]).size }, path: filePath };
}

async function openFromPathTauri(filePath: string): Promise<LoadedFile | null> {
  const { readFile, readTextFile } = await import("@tauri-apps/plugin-fs");
  const name = filePath.split(/[/\\]/).pop() ?? filePath;
  const category = detectFileType(name);

  if (category === "pdf" || category === "epub") {
    const bytes = await readFile(filePath);
    const binary = bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
    return { name, path: filePath, category, binary, size: binary.byteLength };
  }

  const text = await readTextFile(filePath);
  return { name, path: filePath, category, text, size: new Blob([text]).size };
}

async function openWithBrowser(): Promise<{ file: LoadedFile; path: string } | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept =
      ".pdf,.md,.markdown,.mdx,.mmd,.mermaid,.json,.jsonl,.ndjson,.txt,.text,.log,.csv,.tsv,.ini,.cfg,.conf,.yaml,.yml,.toml,.xml,.env,.epub,.rst,.diff,.patch,.sh,.bash,.zsh,.fish,.js,.ts,.tsx,.jsx,.py,.rb,.rs,.go,.swift";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);

      const name = file.name;
      const category = detectFileType(name);
      // Use a fake path for browser mode (just the filename)
      const path = name;

      if (category === "pdf" || category === "epub") {
        const binary = await file.arrayBuffer();
        resolve({ file: { name, path, category, binary, size: binary.byteLength }, path });
      } else {
        const text = await file.text();
        resolve({ file: { name, path, category, text, size: file.size }, path });
      }
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function useFileLoader() {
  const [file, setFile] = useState<LoadedFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>(loadRecent);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  const recordRecent = useCallback((loaded: LoadedFile, path: string) => {
    setRecentFiles((prev) => {
      const next = pushRecent(prev, {
        name: loaded.name,
        path,
        category: loaded.category,
        lastOpened: Date.now(),
      });
      saveRecent(next);
      return next;
    });
  }, []);

  const openFile = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = isTauri() ? await openWithTauri() : await openWithBrowser();
      if (result) {
        setFile(result.file);
        recordRecent(result.file, result.path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [recordRecent]);

  const openFromPath = useCallback(
    async (path: string) => {
      if (!isTauri()) {
        showToast("Cannot reopen by path in browser mode");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const loaded = await openFromPathTauri(path);
        if (loaded) {
          setFile(loaded);
          recordRecent(loaded, path);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [recordRecent],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const droppedFile = e.dataTransfer.files[0];
      if (!droppedFile) return;

      setLoading(true);
      setError(null);
      try {
        const name = droppedFile.name;
        const category = detectFileType(name);
        const path = name;
        if (category === "pdf" || category === "epub") {
          const binary = await droppedFile.arrayBuffer();
          const loaded: LoadedFile = { name, path, category, binary, size: binary.byteLength };
          setFile(loaded);
          recordRecent(loaded, path);
        } else {
          const text = await droppedFile.text();
          const loaded: LoadedFile = { name, path, category, text, size: droppedFile.size };
          setFile(loaded);
          recordRecent(loaded, path);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    },
    [recordRecent],
  );

  const closeFile = useCallback(() => {
    setFile(null);
    setError(null);
  }, []);

  const clearRecent = useCallback(() => {
    setRecentFiles([]);
    saveRecent([]);
  }, []);

  const openDirectory = useCallback(async () => {
    if (!isTauri()) {
      showToast("Directory browsing requires the desktop app.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await openDirectoryWithTauri();
      if (result) {
        setFile(result.file);
        recordRecent(result.file, result.path);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [recordRecent, showToast]);

  return {
    file,
    loading,
    error,
    openFile,
    openDirectory,
    openFromPath,
    handleDrop,
    closeFile,
    formatSize,
    recentFiles,
    clearRecent,
    toast,
  };
}
