import { useEffect, useMemo, useRef, useState } from "react";
import { DocumentFrame } from "../DocumentFrame";
import { buildMarkdownOutline, type OutlineItem } from "../outline";
import { markdownPluginCSS, renderMarkdownToSafeHTML } from "../renderMarkdown";
import "@create-markdown/preview/themes/system.css";

interface Props {
  content: string;
  fallbackLabel?: string;
}

export function MarkdownViewer({ content, fallbackLabel = "Document" }: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>();
  const sourceOutline = useMemo(() => buildMarkdownOutline(content), [content]);
  const outline = useMemo(
    () => sourceOutline.length > 0
      ? sourceOutline
      : [{ id: "markdown-start", label: fallbackLabel, depth: 1 }],
    [fallbackLabel, sourceOutline],
  );

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

  return (
    <DocumentFrame outline={outline} activeId={activeId} onSelect={selectOutline} className="markdown-frame">
      <div className="markdown-viewer document-scroll" ref={contentRef}>
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
    </DocumentFrame>
  );
}
