import { parse } from "@create-markdown/core";
import { renderAsync } from "@create-markdown/preview";
import { mermaidPlugin } from "@create-markdown/preview-mermaid";
import DOMPurify from "dompurify";

const plugins = [
  mermaidPlugin({
    theme: "default",
    config: {
      securityLevel: "strict",
    },
  }),
];

export const markdownPluginCSS = plugins
  .map((plugin) => plugin.getCSS?.() ?? "")
  .filter(Boolean)
  .join("\n\n");

export async function renderMarkdownToSafeHTML(markdown: string): Promise<string> {
  const blocks = parse(markdown);
  const html = await renderAsync(blocks, {
    plugins,
    linkTarget: "_blank",
  });

  return DOMPurify.sanitize(html, {
    ADD_ATTR: ["target", "rel", "viewBox", "xmlns"],
  });
}
