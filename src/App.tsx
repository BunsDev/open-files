import { useState, useCallback, useRef, useEffect } from "react";
import { useFileLoader, formatSize } from "./useFileLoader";
import { useTheme } from "./theme";
import { useStore } from "./store";
import { PdfViewer } from "./viewers/PdfViewer";
import { MarkdownViewer } from "./viewers/MarkdownViewer";
import { MermaidViewer } from "./viewers/MermaidViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { JsonlViewer } from "./viewers/JsonlViewer";
import { TextViewer } from "./viewers/TextViewer";
import { EpubViewer } from "./viewers/EpubViewer";
import { Sidebar } from "./Sidebar";

export default function App() {
  const {
    file,
    loading,
    error,
    openFile,
    openFromPath,
    handleDrop,
    closeFile,
    recentFiles,
    clearRecent,
    toast,
  } = useFileLoader();

  const [dragOver, setDragOver] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentDropdownOpen, setRecentDropdownOpen] = useState(false);
  const recentDropdownRef = useRef<HTMLDivElement>(null);
  const { theme, toggle } = useTheme();
  const { store, toggleSavedPath, createProject, renameProject, deleteProject, addTag, removeTag } = useStore();

  // Close recent dropdown on outside click
  useEffect(() => {
    if (!recentDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (recentDropdownRef.current && !recentDropdownRef.current.contains(e.target as Node)) {
        setRecentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [recentDropdownOpen]);

  // Per-file edit overrides: Map<filename, editedContent>
  const editOverrides = useRef<Map<string, string>>(new Map());
  const [, forceRender] = useState(0);

  const handleContentChange = useCallback((newContent: string) => {
    if (file) {
      editOverrides.current.set(file.name, newContent);
      forceRender((n) => n + 1);
    }
  }, [file]);

  const currentContent = file?.text !== undefined
    ? (editOverrides.current.get(file.name) ?? file.text)
    : undefined;

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      setDragOver(false);
      void handleDrop(e);
    },
    [handleDrop],
  );

  const isBookmarked = file?.path ? store.savedPaths.includes(file.path) : false;

  return (
    <div
      className={`app${dragOver ? " drag-over" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Sidebar */}
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        recentFiles={recentFiles}
        onOpenPath={(path) => void openFromPath(path)}
        onClearRecent={clearRecent}
        store={store}
        onToggleSaved={toggleSavedPath}
        onCreateProject={createProject}
        onRenameProject={renameProject}
        onDeleteProject={deleteProject}
        onAddTag={addTag}
        onRemoveTag={removeTag}
        currentFilePath={file?.path}
      />

      <header className="header">
        <div className="header-left">
          {/* Sidebar toggle */}
          <button
            className="btn btn-ghost btn-icon sidebar-toggle"
            onClick={() => setSidebarOpen((o) => !o)}
            title="Toggle sidebar"
          >
            ☰
          </button>
          <span className="logo">open-files</span>
          {file && (
            <span className="header-filename" title={file.path ?? file.name}>
              {file.name}
              <button
                type="button"
                className="header-close-btn"
                onClick={closeFile}
                title="Close file"
              >
                ×
              </button>
            </span>
          )}
        </div>
        <div className="header-right">
          {file && (
            <button
              className="btn btn-ghost btn-icon"
              onClick={() => file.path && toggleSavedPath(file.path)}
              title={isBookmarked ? "Remove bookmark" : "Bookmark this file"}
              disabled={!file.path}
            >
              {isBookmarked ? "★" : "☆"}
            </button>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={toggle}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
          <button className="btn btn-ghost btn-icon" onClick={() => void openFile()} disabled={loading} title="Open file">
            📂
          </button>
        </div>
      </header>

      {file && (
        <div className="file-meta">
          <span className="file-name">{file.name}</span>
          <span className="file-size">{formatSize(file.size)}</span>
          <span className="file-type">{file.category.toUpperCase()}</span>
        </div>
      )}

      {error && (
        <div className="error-banner">
          <span>Error: {error}</span>
          <button className="btn btn-ghost" onClick={() => void openFile()}>
            Try again
          </button>
        </div>
      )}

      {toast && (
        <div className="toast-banner">
          {toast}
        </div>
      )}

      <main className="content">
        {!file && !error && (
          <div className="start-screen">
            {/* Hero */}
            <div className="start-hero">
              <h1 className="start-title">open-files</h1>
              <p className="start-subtitle">Your files. Beautiful. Native.</p>

              {/* CTA buttons */}
              <div className="start-actions" ref={recentDropdownRef}>
                <button className="btn btn-primary" onClick={() => void openFile()} disabled={loading}>
                  Open File
                </button>
                {recentFiles.length > 0 && (
                  <>
                    <button
                      className="btn btn-ghost"
                      onClick={() => setRecentDropdownOpen((o) => !o)}
                    >
                      Open Recent ▾
                    </button>
                    {recentDropdownOpen && (
                      <div className="recent-dropdown">
                        <div className="recent-dropdown-header">
                          <span>Recent</span>
                          <button
                            type="button"
                            className="btn btn-ghost"
                            style={{ fontSize: 10, padding: "2px 6px" }}
                            onClick={() => { clearRecent(); setRecentDropdownOpen(false); }}
                          >
                            Clear
                          </button>
                        </div>
                        <div className="recent-list" style={{ padding: "6px 8px" }}>
                          {recentFiles.slice(0, 5).map((r) => (
                            <button
                              key={r.path}
                              type="button"
                              className="recent-item"
                              onClick={() => { void openFromPath(r.path); setRecentDropdownOpen(false); }}
                              title={r.path}
                            >
                              <span className="recent-item-icon">
                                {r.category === "pdf" ? "📄" : r.category === "markdown" ? "📝" : r.category === "epub" ? "📚" : r.category === "json" || r.category === "jsonl" ? "📋" : "📃"}
                              </span>
                              <span className="recent-item-info">
                                <span className="recent-item-name">{r.name}</span>
                                <span className="recent-item-path">{r.path.length > 48 ? "…" + r.path.slice(-45) : r.path}</span>
                              </span>
                              <span className="recent-item-time">
                                {new Date(r.lastOpened).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </button>
                          ))}
                        </div>
                        {recentFiles.length > 5 && (
                          <div className="recent-dropdown-footer">
                            <button
                              type="button"
                              className="recent-view-all"
                              onClick={() => { setSidebarOpen(true); setRecentDropdownOpen(false); }}
                            >
                              View all {recentFiles.length} files →
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Feature grid */}
            <div className="feature-grid">
              {[
                { icon: "📄", name: "PDF", desc: "Multi-page with navigation" },
                { icon: "📝", name: "Markdown", desc: "Live preview + edit mode" },
                { icon: "📋", name: "JSON / JSONL", desc: "Collapsible tree viewer" },
                { icon: "🔀", name: "Mermaid", desc: "Diagrams rendered live" },
                { icon: "📚", name: "EPUB", desc: "Chapter navigation" },
                { icon: "💻", name: "Code & Text", desc: "Mono, syntax-aware" },
              ].map((f) => (
                <div key={f.name} className="feature-card">
                  <span className="feature-card-icon">{f.icon}</span>
                  <span className="feature-card-name">{f.name}</span>
                  <span className="feature-card-desc">{f.desc}</span>
                </div>
              ))}
            </div>

            {/* Inline recent list */}
            {recentFiles.length > 0 && (
              <div className="start-recent">
                <div className="start-section-header">
                  <span>Recent</span>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 10, padding: "2px 8px" }} onClick={clearRecent}>
                    Clear
                  </button>
                </div>
                <div className="recent-list">
                  {recentFiles.slice(0, 5).map((r) => (
                    <button
                      key={r.path}
                      type="button"
                      className="recent-item"
                      onClick={() => void openFromPath(r.path)}
                      title={r.path}
                    >
                      <span className="recent-item-icon">
                        {r.category === "pdf" ? "📄" : r.category === "markdown" ? "📝" : r.category === "epub" ? "📚" : r.category === "json" || r.category === "jsonl" ? "📋" : "📃"}
                      </span>
                      <span className="recent-item-info">
                        <span className="recent-item-name">{r.name}</span>
                        <span className="recent-item-path">{r.path.length > 60 ? "…" + r.path.slice(-57) : r.path}</span>
                      </span>
                      <span className="recent-item-time">
                        {new Date(r.lastOpened).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </button>
                  ))}
                </div>
                {recentFiles.length > 5 && (
                  <button
                    type="button"
                    className="recent-view-all"
                    style={{ alignSelf: "flex-start", marginTop: 4 }}
                    onClick={() => setSidebarOpen(true)}
                  >
                    View all →
                  </button>
                )}
              </div>
            )}

            {/* Stats bar */}
            <div className="start-stats">
              <span className="stat-chip">✦ 6 formats</span>
              <span className="stat-chip">🗂 Projects &amp; Tags</span>
              <span className="stat-chip">🔍 Search</span>
            </div>
          </div>
        )}

        {file && file.category === "pdf" && file.binary && (
          <PdfViewer data={file.binary} />
        )}
        {file && file.category === "markdown" && currentContent !== undefined && (
          <MarkdownViewer
            content={currentContent}
            onContentChange={handleContentChange}
          />
        )}
        {file && file.category === "mermaid" && file.text !== undefined && (
          <MermaidViewer content={file.text} />
        )}
        {file && file.category === "json" && file.text !== undefined && (
          <JsonViewer content={file.text} />
        )}
        {file && file.category === "jsonl" && file.text !== undefined && (
          <JsonlViewer content={file.text} />
        )}
        {file && file.category === "text" && file.text !== undefined && (
          <TextViewer content={file.text} />
        )}
        {file && file.category === "epub" && file.binary && (
          <EpubViewer data={file.binary} />
        )}
        {file && file.category === "unsupported" && (
          <div className="unsupported-state">
            <p className="empty-title">Unsupported file format</p>
          </div>
        )}
      </main>
    </div>
  );
}
