import mammoth from "mammoth";
import type { ParsedChapter } from "./markdown.js";

/**
 * Parse a DOCX buffer into chapters.
 * Uses mammoth to extract HTML, then splits on heading tags.
 */
export async function parseDocx(
  buffer: Buffer,
  headingLevel: number = 2
): Promise<ParsedChapter[]> {
  const result = await mammoth.convertToHtml({ buffer });
  const html = result.value;

  const tag = `h${headingLevel}`;
  const regex = new RegExp(`<${tag}>(.*?)</${tag}>`, "gi");

  const chapters: ParsedChapter[] = [];
  let lastIndex = 0;
  let lastTitle: string | null = null;
  let orderIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(html)) !== null) {
    // Collect text before this heading
    const bodyHtml = html.slice(lastIndex, match.index);
    const body = stripHtml(bodyHtml).trim();

    if (lastTitle !== null || body.length > 0) {
      chapters.push({
        title: lastTitle ?? "Untitled",
        orderIndex,
        body,
      });
      orderIndex++;
    }

    lastTitle = stripHtml(match[1]);
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last heading
  const trailingHtml = html.slice(lastIndex);
  const trailingBody = stripHtml(trailingHtml).trim();
  if (lastTitle !== null || trailingBody.length > 0) {
    chapters.push({
      title: lastTitle ?? "Untitled",
      orderIndex,
      body: trailingBody,
    });
  }

  // No headings — return entire doc as single chapter
  if (chapters.length === 0 && html.trim().length > 0) {
    return [{ title: "Untitled", orderIndex: 0, body: stripHtml(html).trim() }];
  }

  return chapters;
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
