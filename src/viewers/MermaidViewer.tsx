import { MarkdownViewer } from "./MarkdownViewer";

interface Props {
  content: string;
}

export function MermaidViewer({ content }: Props) {
  return <MarkdownViewer content={`\`\`\`mermaid\n${content.trim()}\n\`\`\``} fallbackLabel="Diagram" />;
}
