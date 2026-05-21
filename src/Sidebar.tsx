import { useState } from "react";
import type { RecentFile } from "./useFileLoader";
import { relativeTime } from "./useFileLoader";
import type { AppStore } from "./store";

interface Props {
  open: boolean;
  onClose: () => void;
  recentFiles: RecentFile[];
  onOpenPath: (path: string) => void;
  onClearRecent: () => void;
  store: AppStore;
  onToggleSaved: (path: string) => void;
  onCreateProject: (name: string) => void;
  onRenameProject: (id: string, name: string) => void;
  onDeleteProject: (id: string) => void;
  onAddTag: (tag: { name: string; color: string }) => void;
  onRemoveTag: (name: string) => void;
  onAddToProject: (projectId: string, path: string) => void;
  onRemoveFromProject: (projectId: string, path: string) => void;
  currentFilePath?: string;
}

function categoryIcon(cat: string): string {
  const map: Record<string, string> = {
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

export function Sidebar({
  open,
  onClose,
  recentFiles,
  onOpenPath,
  onClearRecent,
  store,
  onToggleSaved,
  onCreateProject,
  onRenameProject,
  onDeleteProject,
  onAddTag,
  onRemoveTag,
  onAddToProject,
  onRemoveFromProject,
  currentFilePath,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newProjectName, setNewProjectName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#6366f1");
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["recent", "saved", "projects", "tags"]),
  );

  const toggleSection = (key: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const q = searchQuery.toLowerCase();

  const filteredRecent = q
    ? recentFiles.filter(
        (r) => r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q),
      )
    : recentFiles;

  const filteredSaved = q
    ? store.savedPaths.filter((p) => p.toLowerCase().includes(q))
    : store.savedPaths;

  const filteredProjects = q
    ? store.projects.filter((p) => p.name.toLowerCase().includes(q))
    : store.projects;

  if (!open) return null;

  return (
    <div className="app-sidebar">
      <div className="sidebar-header">
        <span className="sidebar-title">Files</span>
        <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} title="Close sidebar">
          ✕
        </button>
      </div>

      <div className="sidebar-search">
        <input
          className="sidebar-search-input"
          type="search"
          placeholder="Search…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="sidebar-body">
        {/* Recent */}
        <div className="sidebar-section">
          <button
            type="button"
            className="sidebar-section-header"
            onClick={() => toggleSection("recent")}
          >
            <span>{expandedSections.has("recent") ? "⌄" : "›"}</span>
            <span>Recent</span>
            {recentFiles.length > 0 && (
              <button
                type="button"
                className="sidebar-clear-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onClearRecent();
                }}
              >
                Clear
              </button>
            )}
          </button>
          {expandedSections.has("recent") && (
            <div className="sidebar-list">
              {filteredRecent.length === 0 && (
                <div className="sidebar-empty">No recent files</div>
              )}
              {filteredRecent.map((r) => (
                <button
                  key={r.path}
                  type="button"
                  className={`sidebar-item${currentFilePath === r.path ? " active" : ""}`}
                  onClick={() => onOpenPath(r.path)}
                  title={r.path}
                >
                  <span className="sidebar-item-icon">{categoryIcon(r.category)}</span>
                  <span className="sidebar-item-name">{r.name}</span>
                  <span className="sidebar-item-meta">{relativeTime(r.lastOpened)}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Saved */}
        <div className="sidebar-section">
          <button
            type="button"
            className="sidebar-section-header"
            onClick={() => toggleSection("saved")}
          >
            <span>{expandedSections.has("saved") ? "⌄" : "›"}</span>
            <span>Saved</span>
          </button>
          {expandedSections.has("saved") && (
            <div className="sidebar-list">
              {filteredSaved.length === 0 && (
                <div className="sidebar-empty">No bookmarks</div>
              )}
              {filteredSaved.map((p) => {
                const name = p.split(/[/\\]/).pop() ?? p;
                return (
                  <button
                    key={p}
                    type="button"
                    className={`sidebar-item${currentFilePath === p ? " active" : ""}`}
                    onClick={() => onOpenPath(p)}
                    title={p}
                  >
                    <span className="sidebar-item-icon">★</span>
                    <span className="sidebar-item-name">{name}</span>
                    <button
                      type="button"
                      className="sidebar-item-remove"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleSaved(p);
                      }}
                      title="Remove bookmark"
                    >
                      ✕
                    </button>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Projects */}
        <div className="sidebar-section">
          <button
            type="button"
            className="sidebar-section-header"
            onClick={() => toggleSection("projects")}
          >
            <span>{expandedSections.has("projects") ? "⌄" : "›"}</span>
            <span>Projects</span>
          </button>
          {expandedSections.has("projects") && (
            <div className="sidebar-list">
              {filteredProjects.map((p) => (
                <div
                  key={p.id}
                  className={`sidebar-item sidebar-project-item${dragOverProjectId === p.id ? " project-drop-target" : ""}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverProjectId(p.id); }}
                  onDragLeave={() => setDragOverProjectId(null)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDragOverProjectId(null);
                    const path = e.dataTransfer.getData("text/plain");
                    if (path) onAddToProject(p.id, path);
                  }}
                >
                  {renamingId === p.id ? (
                    <input
                      className="sidebar-rename-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        if (renameValue.trim()) onRenameProject(p.id, renameValue.trim());
                        setRenamingId(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          if (renameValue.trim()) onRenameProject(p.id, renameValue.trim());
                          setRenamingId(null);
                        }
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      autoFocus
                    />
                  ) : (
                    <>
                      <span className="sidebar-item-icon">📁</span>
                      <span
                        className="sidebar-item-name"
                        onDoubleClick={() => {
                          setRenamingId(p.id);
                          setRenameValue(p.name);
                        }}
                      >
                        {p.name}
                        {p.paths.length > 0 && (
                          <span className="project-file-count">{p.paths.length}</span>
                        )}
                      </span>
                      <button
                        type="button"
                        className="sidebar-item-remove"
                        onClick={() => onDeleteProject(p.id)}
                        title="Delete project"
                      >
                        ✕
                      </button>
                    </>
                  )}
                  {/* Files in project */}
                  {!renamingId && p.paths.length > 0 && (
                    <div className="project-files-list">
                      {p.paths.map((fp) => (
                        <div key={fp} className="project-file-item">
                          <button
                            type="button"
                            className="project-file-name"
                            onClick={() => onOpenPath(fp)}
                            title={fp}
                          >
                            {fp.split(/[\/\\]/).pop()}
                          </button>
                          <button
                            type="button"
                            className="sidebar-item-remove"
                            onClick={() => onRemoveFromProject(p.id, fp)}
                            title="Remove from project"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="sidebar-add-row">
                <input
                  className="sidebar-add-input"
                  placeholder="New project…"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newProjectName.trim()) {
                      onCreateProject(newProjectName.trim());
                      setNewProjectName("");
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ fontSize: 16 }}
                  disabled={!newProjectName.trim()}
                  onClick={() => {
                    if (newProjectName.trim()) {
                      onCreateProject(newProjectName.trim());
                      setNewProjectName("");
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="sidebar-section">
          <button
            type="button"
            className="sidebar-section-header"
            onClick={() => toggleSection("tags")}
          >
            <span>{expandedSections.has("tags") ? "⌄" : "›"}</span>
            <span>Tags</span>
          </button>
          {expandedSections.has("tags") && (
            <div className="sidebar-list">
              <div className="sidebar-tags">
                {store.tags.map((t) => (
                  <span key={t.name} className="sidebar-tag" style={{ background: t.color + "33", borderColor: t.color }}>
                    {t.name}
                    <button
                      type="button"
                      className="sidebar-tag-remove"
                      onClick={() => onRemoveTag(t.name)}
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
              <div className="sidebar-add-row">
                <input
                  className="sidebar-add-input"
                  placeholder="New tag…"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && newTagName.trim()) {
                      onAddTag({ name: newTagName.trim(), color: newTagColor });
                      setNewTagName("");
                    }
                  }}
                  style={{ flex: 1 }}
                />
                <input
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  style={{ width: 28, height: 28, padding: 0, border: "none", borderRadius: 6, cursor: "pointer" }}
                  title="Tag color"
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-icon"
                  style={{ fontSize: 16 }}
                  disabled={!newTagName.trim()}
                  onClick={() => {
                    if (newTagName.trim()) {
                      onAddTag({ name: newTagName.trim(), color: newTagColor });
                      setNewTagName("");
                    }
                  }}
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
