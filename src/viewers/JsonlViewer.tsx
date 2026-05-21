import { useState } from "react";
import { JsonValue } from "../outline";

interface Props {
  content: string;
}

interface ParsedLine {
  index: number;
  value: JsonValue | null;
  error: string | null;
  raw: string;
}

function JsonLineNode({ value, depth = 0 }: { value: JsonValue; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const indent = { paddingLeft: `${depth * 14}px` };

  if (typeof value !== "object" || value === null) {
    return (
      <span
        className={`json-primitive json-${typeof value}`}
        style={indent}
      >
        {JSON.stringify(value)}
      </span>
    );
  }

  const isArray = Array.isArray(value);
  const entries = isArray
    ? (value as JsonValue[]).map((v, i) => [`${i}`, v] as [string, JsonValue])
    : Object.entries(value as Record<string, JsonValue>);
  const open = isArray ? "[" : "{";
  const close = isArray ? "]" : "}";

  return (
    <div style={indent}>
      <button
        type="button"
        className="json-toggle"
        onClick={() => setCollapsed((c) => !c)}
        aria-expanded={!collapsed}
        style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
      >
        <span className="json-caret">{collapsed ? "›" : "⌄"}</span>
        <span className="json-bracket">{open}</span>
        {collapsed && (
          <>
            <span className="json-summary"> {entries.length} items </span>
            <span className="json-bracket">{close}</span>
          </>
        )}
      </button>
      {!collapsed && (
        <div>
          {entries.map(([key, child]) => (
            <div key={key} style={{ paddingLeft: 14 }}>
              {!isArray && <span className="json-key">{key}: </span>}
              <JsonLineNode value={child} depth={0} />
            </div>
          ))}
          <div className="json-bracket">{close}</div>
        </div>
      )}
    </div>
  );
}

export function JsonlViewer({ content }: Props) {
  const lines: ParsedLine[] = content
    .split("\n")
    .flatMap((raw, i) => {
      const trimmed = raw.trim();
      if (!trimmed) return [];
      try {
        return [{ index: i + 1, value: JSON.parse(trimmed) as JsonValue, error: null, raw } as ParsedLine];
      } catch (e) {
        return [{ index: i + 1, value: null, error: e instanceof Error ? e.message : String(e), raw } as ParsedLine];
      }
    });

  return (
    <div className="jsonl-viewer document-scroll">
      <div className="jsonl-list">
        {lines.map((line) => (
          <div key={line.index} className="jsonl-entry">
            <div className="jsonl-line-num">#{line.index}</div>
            <div className="jsonl-body">
              {line.error ? (
                <div className="jsonl-parse-error">
                  <span className="jsonl-error-msg">{line.error}</span>
                  <pre className="text-pre jsonl-raw">{line.raw}</pre>
                </div>
              ) : (
                <div className="json-viewer" style={{ padding: "4px 0" }}>
                  <JsonLineNode value={line.value as JsonValue} />
                </div>
              )}
            </div>
          </div>
        ))}
        {lines.length === 0 && (
          <div className="empty-hint" style={{ padding: 20 }}>Empty file</div>
        )}
      </div>
    </div>
  );
}
