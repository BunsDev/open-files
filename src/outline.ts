export interface OutlineItem {
  id: string;
  label: string;
  detail?: string;
  depth: number;
}

export type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "section";
}

function uniqueID(base: string, counts: Map<string, number>): string {
  const count = (counts.get(base) ?? 0) + 1;
  counts.set(base, count);
  return count === 1 ? base : `${base}-${count}`;
}

export function buildMarkdownOutline(markdown: string): OutlineItem[] {
  const counts = new Map<string, number>();
  const items: OutlineItem[] = [];
  let inFence = false;

  for (const line of markdown.split(/\r?\n/)) {
    if (/^\s*```/.test(line) || /^\s*~~~/.test(line)) {
      inFence = !inFence;
      continue;
    }

    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const label = match[2].trim();
    const base = slugify(label);
    items.push({
      id: uniqueID(base, counts),
      label,
      depth: match[1].length,
    });
  }

  return items;
}

function isRecord(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isContainer(value: unknown): value is JsonValue[] | Record<string, JsonValue> {
  return Array.isArray(value) || isRecord(value);
}

export function getJsonNodeSummary(value: unknown): string {
  if (Array.isArray(value)) {
    return `${value.length} ${value.length === 1 ? "item" : "items"}`;
  }

  if (isRecord(value)) {
    const count = Object.keys(value).length;
    return `${count} ${count === 1 ? "key" : "keys"}`;
  }

  if (value === null) return "null";
  return typeof value;
}

export function jsonPathID(path: Array<string | number>): string {
  if (path.length === 0) return "json-root";
  return `json-${path.map((part) => slugify(String(part))).join("-")}`;
}

export function buildJsonOutline(value: JsonValue, maxDepth = 4): OutlineItem[] {
  const items: OutlineItem[] = [];

  function visit(node: JsonValue, path: Array<string | number>, label: string, depth: number) {
    if (!isContainer(node) || depth > maxDepth) return;

    items.push({
      id: jsonPathID(path),
      label,
      detail: getJsonNodeSummary(node),
      depth,
    });

    if (depth === maxDepth) return;

    if (Array.isArray(node)) {
      node.forEach((child, index) => {
        if (isContainer(child)) {
          visit(child, [...path, index], `[${index}]`, depth + 1);
        }
      });
      return;
    }

    for (const [key, child] of Object.entries(node)) {
      if (isContainer(child)) {
        visit(child, [...path, key], key, depth + 1);
      }
    }
  }

  visit(value, [], "Root", 1);
  return items;
}

export function buildPdfOutline(pageCount: number): OutlineItem[] {
  return Array.from({ length: Math.max(0, pageCount) }, (_, index) => ({
    id: `pdf-page-${index + 1}`,
    label: `Page ${index + 1}`,
    depth: 1,
  }));
}

export function buildTextOutline(content: string): OutlineItem[] {
  const lineCount = content.length === 0 ? 0 : content.split(/\r?\n/).length;
  return [
    {
      id: "text-start",
      label: "Start",
      detail: `${lineCount} ${lineCount === 1 ? "line" : "lines"}`,
      depth: 1,
    },
  ];
}

function findOutlineIndex(outline: OutlineItem[], id: string): number {
  return outline.findIndex((item) => item.id === id);
}

export function getOutlineChildren(outline: OutlineItem[], id: string): OutlineItem[] {
  const index = findOutlineIndex(outline, id);
  if (index === -1) return [];

  const parentDepth = outline[index].depth;
  const children: OutlineItem[] = [];

  for (const item of outline.slice(index + 1)) {
    if (item.depth <= parentDepth) break;
    children.push(item);
  }

  return children;
}

export function outlineItemHasChildren(outline: OutlineItem[], id: string): boolean {
  return getOutlineChildren(outline, id).length > 0;
}

export type OutlineItemActivation = "select";

export function getOutlineItemActivation(_outline: OutlineItem[], _id: string): OutlineItemActivation {
  return "select";
}

export function getVisibleOutlineItems(outline: OutlineItem[], collapsedIds: Set<string>): OutlineItem[] {
  const visible: OutlineItem[] = [];
  const collapsedDepths: number[] = [];

  for (const item of outline) {
    while (collapsedDepths.length > 0 && item.depth <= collapsedDepths[collapsedDepths.length - 1]) {
      collapsedDepths.pop();
    }

    if (collapsedDepths.length === 0) {
      visible.push(item);
    }

    if (collapsedIds.has(item.id)) {
      collapsedDepths.push(item.depth);
    }
  }

  return visible;
}
