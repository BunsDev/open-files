import { useEffect, useMemo, useRef, useState } from "react";
import ePub, { Book, Rendition } from "epubjs";
import { DocumentFrame } from "../DocumentFrame";
import type { OutlineItem } from "../outline";

interface Props {
  data: ArrayBuffer;
}

interface EpubNavItem {
  href?: string;
  label?: string;
  subitems?: EpubNavItem[];
}

function flattenToc(items: EpubNavItem[] = [], depth = 1): Array<OutlineItem & { href?: string }> {
  return items.flatMap((item, index) => {
    const id = `epub-${depth}-${index}-${(item.label ?? "section").toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const current = item.label
      ? [{ id, label: item.label, detail: undefined, depth, href: item.href }]
      : [];
    return [...current, ...flattenToc(item.subitems ?? [], depth + 1)];
  });
}

export function EpubViewer({ data }: Props) {
  const viewerRef = useRef<HTMLDivElement>(null);
  const renditionRef = useRef<Rendition | null>(null);
  const bookRef = useRef<Book | null>(null);
  const [title, setTitle] = useState("");
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [toc, setToc] = useState<Array<OutlineItem & { href?: string }>>([]);
  const [activeId, setActiveId] = useState<string | undefined>();

  const outline = useMemo(
    () => toc.length > 0 ? toc : [{ id: "epub-start", label: title || "Book", depth: 1 }],
    [title, toc],
  );

  useEffect(() => {
    if (!viewerRef.current) return;

    const book = ePub(data);
    bookRef.current = book;

    const rendition = book.renderTo(viewerRef.current, {
      width: "100%",
      height: "100%",
      spread: "none",
    });

    renditionRef.current = rendition;

    rendition.display();

    book.loaded.metadata.then((meta) => {
      setTitle(meta.title || "");
    });

    book.loaded.navigation.then((navigation: { toc?: EpubNavItem[] }) => {
      const nextToc = flattenToc(navigation.toc ?? []);
      setToc(nextToc);
      setActiveId(nextToc[0]?.id ?? "epub-start");
    });

    rendition.on("relocated", (location: { atStart?: boolean; atEnd?: boolean }) => {
      setAtStart(!!location.atStart);
      setAtEnd(!!location.atEnd);
    });

    return () => {
      rendition.destroy();
      book.destroy();
    };
  }, [data]);

  const prev = () => renditionRef.current?.prev();
  const next = () => renditionRef.current?.next();

  const selectOutline = (item: OutlineItem) => {
    setActiveId(item.id);
    const href = toc.find((entry) => entry.id === item.id)?.href;
    if (href) {
      renditionRef.current?.display(href);
    }
  };

  return (
    <DocumentFrame outline={outline} activeId={activeId} onSelect={selectOutline} className="epub-frame">
      <div className="epub-viewer">
        <div className="epub-controls">
          <button className="btn btn-ghost" onClick={prev} disabled={atStart}>
            Previous
          </button>
          {title && <span className="epub-title">{title}</span>}
          <button className="btn btn-ghost" onClick={next} disabled={atEnd}>
            Next
          </button>
        </div>
        <div ref={viewerRef} id="epub-start" className="epub-container" />
      </div>
    </DocumentFrame>
  );
}
