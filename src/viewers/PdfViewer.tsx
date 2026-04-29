import { useEffect, useMemo, useRef, useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { DocumentFrame } from "../DocumentFrame";
import { buildPdfOutline, type OutlineItem } from "../outline";

// Use the bundled worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

interface Props {
  data: ArrayBuffer;
}

export function PdfViewer({ data }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState(0);
  const [rendering, setRendering] = useState(true);
  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);
  const outline = useMemo(() => buildPdfOutline(numPages), [numPages]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setRendering(true);
      const loadingTask = pdfjsLib.getDocument({ data: data.slice(0) });
      const pdf = await loadingTask.promise;
      if (cancelled) return;
      pdfDocRef.current = pdf;
      setNumPages(pdf.numPages);
      setPageNum(1);
      setRendering(false);
    }

    load().catch(() => setRendering(false));
    return () => {
      cancelled = true;
    };
  }, [data]);

  useEffect(() => {
    const pdf = pdfDocRef.current;
    if (!pdf || !containerRef.current) return;
    let cancelled = false;

    async function renderPage() {
      const page = await pdf!.getPage(pageNum);
      if (cancelled) return;

      const scale = 1.5;
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement("canvas");
      canvas.id = `pdf-page-${pageNum}`;
      canvas.width = viewport.width;
      canvas.height = viewport.height;
      const ctx = canvas.getContext("2d")!;

      await page.render({ canvasContext: ctx, viewport }).promise;
      if (cancelled) return;

      const container = containerRef.current;
      if (container) {
        container.innerHTML = "";
        container.appendChild(canvas);
      }
    }

    renderPage();
    return () => {
      cancelled = true;
    };
  }, [pageNum, numPages]);

  const selectOutline = (item: OutlineItem) => {
    const page = Number(item.id.replace("pdf-page-", ""));
    if (Number.isFinite(page)) {
      setPageNum(page);
    }
  };

  return (
    <DocumentFrame outline={outline} activeId={`pdf-page-${pageNum}`} onSelect={selectOutline} className="pdf-frame">
      <div className="pdf-viewer">
        <div className="pdf-controls">
          <button
            className="btn btn-ghost"
            disabled={pageNum <= 1}
            onClick={() => setPageNum((p) => p - 1)}
          >
            Previous
          </button>
          <span className="pdf-page-info">
            Page {pageNum} of {numPages}
          </span>
          <button
            className="btn btn-ghost"
            disabled={pageNum >= numPages}
            onClick={() => setPageNum((p) => p + 1)}
          >
            Next
          </button>
        </div>
        <div ref={containerRef} className="pdf-canvas-container">
          {rendering && <p className="loading-text">Loading PDF...</p>}
        </div>
      </div>
    </DocumentFrame>
  );
}
