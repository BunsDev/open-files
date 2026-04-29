import { useMemo, useState } from "react";
import { DocumentFrame } from "../DocumentFrame";
import {
  buildJsonOutline,
  getJsonNodeSummary,
  jsonPathID,
  type JsonValue,
  type OutlineItem,
} from "../outline";

interface Props {
  content: string;
}

function isContainer(value: JsonValue): value is JsonValue[] | { [key: string]: JsonValue } {
  return typeof value === "object" && value !== null;
}

function primitiveLabel(value: JsonValue): string {
  return JSON.stringify(value);
}

function childEntries(value: JsonValue[] | { [key: string]: JsonValue }): Array<[string, JsonValue, string | number]> {
  if (Array.isArray(value)) {
    return value.map((child, index) => [`${index}`, child, index]);
  }

  return Object.entries(value).map(([key, child]) => [key, child, key]);
}

interface JsonNodeProps {
  value: JsonValue;
  label?: string;
  path: Array<string | number>;
  depth: number;
  collapsed: Set<string>;
  onToggle: (id: string) => void;
}

function JsonNode({ value, label, path, depth, collapsed, onToggle }: JsonNodeProps) {
  const id = jsonPathID(path);
  const container = isContainer(value);
  const isCollapsed = collapsed.has(id);
  const indent = { paddingLeft: `${depth * 16}px` };

  if (!container) {
    return (
      <div className="json-row" style={indent}>
        {label !== undefined && <span className="json-key">{label}: </span>}
        <span className={`json-primitive json-${typeof value}`}>{primitiveLabel(value)}</span>
      </div>
    );
  }

  const entries = childEntries(value);
  const openToken = Array.isArray(value) ? "[" : "{";
  const closeToken = Array.isArray(value) ? "]" : "}";

  return (
    <div className="json-section" id={id}>
      <button
        className="json-row json-toggle"
        style={indent}
        onClick={() => onToggle(id)}
        type="button"
        aria-expanded={!isCollapsed}
      >
        <span className="json-caret" aria-hidden="true">{isCollapsed ? "›" : "⌄"}</span>
        {label !== undefined && <span className="json-key">{label}: </span>}
        <span className="json-bracket">{openToken}</span>
        <span className="json-summary">{getJsonNodeSummary(value)}</span>
        {isCollapsed && <span className="json-bracket">{closeToken}</span>}
      </button>

      {!isCollapsed && (
        <div>
          {entries.map(([key, child, pathPart]) => (
            <JsonNode
              key={key}
              value={child}
              label={Array.isArray(value) ? undefined : key}
              path={[...path, pathPart]}
              depth={depth + 1}
              collapsed={collapsed}
              onToggle={onToggle}
            />
          ))}
          <div className="json-row json-bracket-row" style={indent}>
            {closeToken}
          </div>
        </div>
      )}
    </div>
  );
}

export function JsonViewer({ content }: Props) {
  const parsed = useMemo(() => {
    try {
      const value = JSON.parse(content) as JsonValue;
      return { value, error: null };
    } catch (e) {
      return {
        value: null,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }, [content]);

  const outline = useMemo(
    () => (parsed.error ? [] : buildJsonOutline(parsed.value as JsonValue)),
    [parsed],
  );
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState("json-root");

  const toggle = (id: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectOutline = (item: OutlineItem) => {
    setActiveId(item.id);
    setCollapsed((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    requestAnimationFrame(() => {
      document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  };

  return (
    <DocumentFrame outline={outline} activeId={activeId} onSelect={selectOutline} className="json-frame">
      <div className="json-viewer document-scroll">
        {parsed.error ? (
          <>
            <div className="error-banner">
              <span>JSON parse error: {parsed.error}</span>
            </div>
            <pre className="text-pre json-pre">{content}</pre>
          </>
        ) : (
          <JsonNode
            value={parsed.value as JsonValue}
            path={[]}
            depth={0}
            collapsed={collapsed}
            onToggle={toggle}
          />
        )}
      </div>
    </DocumentFrame>
  );
}
