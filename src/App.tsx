import { useState, useCallback, useRef } from "react";
import { useFileLoader, formatSize } from "./useFileLoader";
import { FORMAT_CHIPS } from "./fileTypes";
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
  const { theme, toggle } = useTheme();
  const { store, toggleSavedPath, createProject, renameProject, deleteProject, addTag, removeTag } = useStore();

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
            <div className="start-hero">
              <h1 className="start-title">open-files</h1>
              <p className="start-subtitle">Drop a file or press ⌘O</p>
            </div>

            {/* Recent files */}
            {recentFiles.length > 0 && (
              <div className="start-recent">
                <div className="start-section-header">
                  <span>Recent</span>
                  <button type="button" className="btn btn-ghost" style={{ fontSize: 11, padding: "2px 8px" }} onClick={clearRecent}>
                    Clear
                  </button>
                </div>
                <div className="recent-list">
                  {recentFiles.slice(0, 8).map((r) => (
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
              </div>
            )}

            {/* Format chips */}
            <div className="start-formats">
              {FORMAT_CHIPS.map((f) => (
                <span key={f} className="format-chip">{f}</span>
              ))}
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
