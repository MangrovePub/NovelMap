import { unified } from "unified";
import remarkParse from "remark-parse";
import type { Root, Heading, Content } from "mdast";

export interface ParsedChapter {
  title: string;
  orderIndex: number;
  body: string;
}

/**
 * Parse a Markdown string into chapters.
 * Splits on h2 (`## `) headings by default. The heading depth is configurable.
 */
export function parseMarkdown(
  text: string,
  headingDepth: number = 2
): ParsedChapter[] {
  const tree = unified().use(remarkParse).parse(text) as Root;

  const chapters: ParsedChapter[] = [];
  let currentTitle: string | null = null;
  let currentLines: string[] = [];
  let orderIndex = 0;

  function flush() {
    const body = currentLines.join("\n\n").trim();
    if (currentTitle !== null || body.length > 0) {
      chapters.push({
        title: currentTitle ?? "Untitled",
        orderIndex,
        body,
      });
      orderIndex++;
    }
  }

  for (const node of tree.children) {
    if (isHeading(node) && node.depth === headingDepth) {
      flush();
      currentTitle = extractText(node);
      currentLines = [];
    } else {
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      if (start !== undefined && end !== undefined) {
        currentLines.push(text.slice(start, end));
      }
    }
  }

  flush();

  // If no headings found, return the entire text as a single chapter
  if (chapters.length === 0 && text.trim().length > 0) {
    return [{ title: "Untitled", orderIndex: 0, body: text.trim() }];
  }

  return chapters;
}

function isHeading(node: Content): node is Heading {
  return node.type === "heading";
}

function extractText(heading: Heading): string {
  return heading.children
    .map((child) => {
      if (child.type === "text") return child.value;
      return "";
    })
    .join("");
}
