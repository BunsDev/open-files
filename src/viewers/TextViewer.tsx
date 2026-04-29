import { useMemo, useRef, useState } from "react";
import { DocumentFrame } from "../DocumentFrame";
import { buildTextOutline, type OutlineItem } from "../outline";

interface Props {
  content: string;
}

export function TextViewer({ content }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const outline = useMemo(() => buildTextOutline(content), [content]);
  const [activeId, setActiveId] = useState(outline[0]?.id);

  const selectOutline = (item: OutlineItem) => {
    setActiveId(item.id);
    preRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <DocumentFrame outline={outline} activeId={activeId} onSelect={selectOutline} className="text-frame">
      <div className="text-viewer document-scroll">
        <pre id="text-start" className="text-pre" ref={preRef}>{content}</pre>
      </div>
    </DocumentFrame>
  );
}
