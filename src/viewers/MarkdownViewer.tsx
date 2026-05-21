import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentFrame } from "../DocumentFrame";
import { buildMarkdownOutline, type OutlineItem } from "../outline";
import { markdownPluginCSS, renderMarkdownToSafeHTML } from "../renderMarkdown";
import "@create-markdown/preview/themes/system.css";

interface Props {
  content: string;
  onContentChange?: (newContent: string) => void;
  fallbackLabel?: string;
}

export function MarkdownViewer({ content, onContentChange, fallbackLabel = "Document" }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [editValue, setEditValue] = useState(content);
  const sourceOutline = useMemo(() => buildMarkdownOutline(content), [content]);
  const outline = useMemo(
    () => sourceOutline.length > 0
      ? sourceOutline
      : [{ id: "markdown-start", label: fallbackLabel, depth: 1 }],
    [fallbackLabel, sourceOutline],
  );

  // Sync edit value when content changes externally
  useEffect(() => {
    if (mode === "preview") setEditValue(content);
  }, [content, mode]);

  useEffect(() => {
    let cancelled = false;

    async function render() {
      setError(null);
      try {
        const safeHTML = await renderMarkdownToSafeHTML(content);
        if (!cancelled) {
          setHtml(safeHTML);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : String(err));
          setHtml("");
        }
      }
    }

    render();

    return () => {
      cancelled = true;
    };
  }, [content]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    root.id = outline[0]?.id ?? "markdown-start";
    root.querySelectorAll("h1, h2, h3, h4, h5, h6").forEach((heading, index) => {
      const item = sourceOutline[index];
      if (item) {
        heading.id = item.id;
      }
    });
    setActiveId(outline[0]?.id);
  }, [html, outline, sourceOutline]);

  const selectOutline = (item: OutlineItem) => {
    setActiveId(item.id);
    contentRef.current
      ?.querySelector(`#${CSS.escape(item.id)}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });

    if (item.id === contentRef.current?.id) {
      contentRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const switchToEdit = () => {
    setEditValue(content);
    setMode("edit");
  };

  const commitEdit = () => {
    setMode("preview");
    if (onContentChange && editValue !== content) {
      onContentChange(editValue);
    }
  };

  const handleEditKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Escape") {
      commitEdit();
    }
  };

  return (
    <DocumentFrame outline={outline} activeId={activeId} onSelect={selectOutline} className="markdown-frame">
      <div style={{ position: "relative", height: "100%", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div className="markdown-mode-toggle">
          <button
            type="button"
            className="btn btn-ghost btn-icon"
            style={{ fontSize: 12, padding: "2px 10px", height: 26, borderRadius: 6, width: "auto" }}
            onClick={() => mode === "preview" ? switchToEdit() : commitEdit()}
            title={mode === "preview" ? "Switch to edit mode" : "Switch to preview"}
          >
            {mode === "preview" ? "Edit" : "Preview"}
          </button>
        </div>
        {mode === "edit" ? (
          <textarea
            className="markdown-editor"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleEditKeyDown}
            autoFocus
          />
        ) : (
          <div
            className="markdown-viewer document-scroll"
            ref={contentRef}
            onDoubleClick={switchToEdit}
            title="Double-click to edit"
          >
            {error ? (
              <>
                <div className="error-banner">
                  <p>Failed to render Markdown.</p>
                  <pre>{error}</pre>
                </div>
                <pre className="text-pre">{content}</pre>
              </>
            ) : (
              <>
                {markdownPluginCSS && <style>{markdownPluginCSS}</style>}
                <div dangerouslySetInnerHTML={{ __html: html }} />
              </>
            )}
          </div>
        )}
      </div>
    </DocumentFrame>
  );
}
