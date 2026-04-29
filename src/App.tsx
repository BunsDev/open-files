import { useState, useCallback } from "react";
import { useFileLoader } from "./useFileLoader";
import { FORMAT_LABEL } from "./fileTypes";
import { PdfViewer } from "./viewers/PdfViewer";
import { MarkdownViewer } from "./viewers/MarkdownViewer";
import { MermaidViewer } from "./viewers/MermaidViewer";
import { JsonViewer } from "./viewers/JsonViewer";
import { TextViewer } from "./viewers/TextViewer";
import { EpubViewer } from "./viewers/EpubViewer";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function App() {
  const { file, loading, error, openFile, handleDrop, closeFile } = useFileLoader();
  const [dragOver, setDragOver] = useState(false);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  }, []);
  const onDragLeave = useCallback(() => setDragOver(false), []);
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      setDragOver(false);
      handleDrop(e);
    },
    [handleDrop],
  );

  return (
    <div
      className={`app${dragOver ? " drag-over" : ""}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <header className="header">
        <div className="header-left">
          <h1 className="logo">open-files</h1>
          <span className="subtitle">{FORMAT_LABEL}</span>
        </div>
        <div className="header-right">
          {file && (
            <button className="btn btn-ghost" onClick={closeFile}>
              Close
            </button>
          )}
          <button className="btn btn-primary" onClick={openFile} disabled={loading}>
            {loading ? "Opening..." : "Open File"}
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
          <button className="btn btn-ghost" onClick={() => openFile()}>
            Try again
          </button>
        </div>
      )}

      <main className="content">
        {!file && !error && (
          <div className="empty-state">
            <div className="empty-icon">
              <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
                <rect x="12" y="8" width="40" height="48" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M24 28h16M24 36h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <path d="M32 16v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="empty-title">Open a file to get started</p>
            <p className="empty-hint">
              Click "Open File" or drag and drop a file here
            </p>
            <p className="empty-formats">{FORMAT_LABEL}</p>
          </div>
        )}

        {file && file.category === "pdf" && file.binary && (
          <PdfViewer data={file.binary} />
        )}
        {file && file.category === "markdown" && file.text !== undefined && (
          <MarkdownViewer content={file.text} />
        )}
        {file && file.category === "mermaid" && file.text !== undefined && (
          <MermaidViewer content={file.text} />
        )}
        {file && file.category === "json" && file.text !== undefined && (
          <JsonViewer content={file.text} />
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
            <p className="empty-hint">
              open-files supports: {FORMAT_LABEL}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
