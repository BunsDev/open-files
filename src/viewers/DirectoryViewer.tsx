import { useState, useCallback } from "react";
import type { DirectoryEntry } from "../useFileLoader";
import type { FileCategory } from "../fileTypes";
import { detectFileType } from "../fileTypes";

interface Props {
  name: string;
  entries: DirectoryEntry[];
  rootPath: string;
  onOpenFile: (path: string) => void;
}

function categoryIcon(cat: FileCategory | string): string {
  const map: Record<string, string> = {
    directory: "📁",
    pdf: "📄",
    markdown: "📝",
    mermaid: "🔀",
    json: "📋",
    jsonl: "📋",
    text: "📃",
    epub: "📚",
    unsupported: "📎",
  };
  return map[cat] ?? "📎";
}

function sortEntries(entries: DirectoryEntry[]): DirectoryEntry[] {
  return [...entries].sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
}

interface EntryRowProps {
  entry: DirectoryEntry;
  depth: number;
  onOpenFile: (path: string) => void;
}

function EntryRow({ entry, depth, onOpenFile }: EntryRowProps) {
  const [expanded, setExpanded] = useState(false);
  const [children, setChildren] = useState<DirectoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);

  const handleExpand = useCallback(async () => {
    if (!entry.isDir) return;
    if (!expanded && children === null) {
      setLoading(true);
      try {
        const { readDir } = await import("@tauri-apps/plugin-fs");
        const rawEntries = await readDir(entry.path);
        const entries: DirectoryEntry[] = (rawEntries as Array<{ name?: string; isDirectory?: boolean; isDir?: boolean; children?: unknown[] }>).map((e) => {
          const eName = e.name ?? "";
          const isDir = !!(e.isDirectory ?? e.isDir ?? Array.isArray(e.children));
          const ePath = entry.path + "/" + eName;
          return {
            name: eName,
            path: ePath,
            isDir,
            category: isDir ? "directory" as const : detectFileType(eName),
          };
        });
        setChildren(entries);
      } catch {
        setChildren([]);
      } finally {
        setLoading(false);
      }
    }
    setExpanded((v) => !v);
  }, [entry, expanded, children]);

  const sorted = children ? sortEntries(children) : [];

  return (
    <>
      <div
        className={`dir-entry${entry.isDir ? " dir-entry-dir" : " dir-entry-file"}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={() => {
          if (entry.isDir) void handleExpand();
          else onOpenFile(entry.path);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (entry.isDir) void handleExpand();
            else onOpenFile(entry.path);
          }
        }}
        title={entry.path}
      >
        {entry.isDir && (
          <span className={`dir-chevron${expanded ? " open" : ""}`}>
            {loading ? "…" : "›"}
          </span>
        )}
        <span className="dir-entry-icon">{categoryIcon(entry.category)}</span>
        <span className="dir-entry-name">{entry.name}</span>
        {!entry.isDir && (
          <span className="dir-entry-badge">{entry.category.toUpperCase()}</span>
        )}
      </div>
      {entry.isDir && expanded && sorted.map((child) => (
        <EntryRow key={child.path} entry={child} depth={depth + 1} onOpenFile={onOpenFile} />
      ))}
    </>
  );
}

export function DirectoryViewer({ name, entries, rootPath, onOpenFile }: Props) {
  const segments = rootPath.split(/[/\\]/).filter(Boolean);
  const sorted = sortEntries(entries);

  return (
    <div className="dir-viewer glass-card">
      {/* Breadcrumb */}
      <div className="dir-breadcrumb">
        {segments.map((seg, i) => (
          <span key={i} className="dir-breadcrumb-segment">
            {i > 0 && <span className="dir-breadcrumb-sep">/</span>}
            <span className="dir-breadcrumb-name">{seg}</span>
          </span>
        ))}
      </div>

      {/* Header */}
      <div className="dir-header">
        <span className="dir-header-icon">📁</span>
        <span className="dir-header-name">{name}</span>
        <span className="dir-header-count">{entries.length} items</span>
      </div>

      {/* Entry list */}
      <div className="dir-list">
        {sorted.length === 0 && (
          <div className="dir-empty">Empty folder</div>
        )}
        {sorted.map((entry) => (
          <EntryRow key={entry.path} entry={entry} depth={0} onOpenFile={onOpenFile} />
        ))}
      </div>
    </div>
  );
}
