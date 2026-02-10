import JSZip from "jszip";
import type { ParsedChapter } from "./markdown.js";

/**
 * Parse an EPUB file into chapters.
 * EPUBs are ZIP archives containing XHTML content files.
 * This covers Vellum exports and standard EPUBs.
 */
export async function parseEpub(buffer: Buffer): Promise<ParsedChapter[]> {
  const zip = await JSZip.loadAsync(buffer);

  // Find the OPF file (package document) via container.xml
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");
  if (!containerXml) {
    throw new Error("Invalid EPUB: no container.xml found");
  }

  const opfPath = extractOpfPath(containerXml);
  if (!opfPath) {
    throw new Error("Invalid EPUB: no OPF path in container.xml");
  }

  const opfContent = await zip.file(opfPath)?.async("string");
  if (!opfContent) {
    throw new Error(`Invalid EPUB: OPF file not found at ${opfPath}`);
  }

  // Get the base directory of the OPF file
  const opfDir = opfPath.includes("/") ? opfPath.substring(0, opfPath.lastIndexOf("/") + 1) : "";

  // Extract spine order (reading order) and manifest (id -> href mapping)
  const manifest = extractManifest(opfContent);
  const spineIds = extractSpine(opfContent);

  const chapters: ParsedChapter[] = [];

  for (const id of spineIds) {
    const href = manifest.get(id);
    if (!href) continue;

    const fullPath = opfDir + href;
    const xhtml = await zip.file(fullPath)?.async("string");
    if (!xhtml) continue;

    const title = extractTitle(xhtml) || `Section ${chapters.length + 1}`;
    const body = stripXhtml(xhtml).trim();

    if (body.length > 0) {
      chapters.push({
        title,
        orderIndex: chapters.length,
        body,
      });
    }
  }

  return chapters;
}

function extractOpfPath(containerXml: string): string | null {
  const match = containerXml.match(/full-path="([^"]+)"/);
  return match ? match[1] : null;
}

function extractManifest(opf: string): Map<string, string> {
  const manifest = new Map<string, string>();
  const itemRegex = /<item\s+[^>]*id="([^"]+)"[^>]*href="([^"]+)"[^>]*/g;
  let match;
  while ((match = itemRegex.exec(opf)) !== null) {
    manifest.set(match[1], match[2]);
  }
  // Also try reversed attribute order
  const itemRegex2 = /<item\s+[^>]*href="([^"]+)"[^>]*id="([^"]+)"[^>]*/g;
  while ((match = itemRegex2.exec(opf)) !== null) {
    manifest.set(match[2], match[1]);
  }
  return manifest;
}

function extractSpine(opf: string): string[] {
  const ids: string[] = [];
  const itemrefRegex = /<itemref\s+[^>]*idref="([^"]+)"/g;
  let match;
  while ((match = itemrefRegex.exec(opf)) !== null) {
    ids.push(match[1]);
  }
  return ids;
}

function extractTitle(xhtml: string): string | null {
  // Try <title> tag
  const titleMatch = xhtml.match(/<title[^>]*>([^<]+)<\/title>/i);
  if (titleMatch && titleMatch[1].trim().length > 0) {
    return titleMatch[1].trim();
  }
  // Try first <h1> or <h2>
  const hMatch = xhtml.match(/<h[12][^>]*>([^<]+)<\/h[12]>/i);
  if (hMatch) return hMatch[1].trim();
  return null;
}

function stripXhtml(xhtml: string): string {
  // Remove everything up to <body>
  let text = xhtml.replace(/^[\s\S]*?<body[^>]*>/i, "");
  // Remove everything after </body>
  text = text.replace(/<\/body>[\s\S]*$/i, "");
  // Replace <br> and <p> with newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(/<\/p>/gi, "\n\n");
  // Strip all remaining tags
  text = text.replace(/<[^>]+>/g, "");
  // Decode entities
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, num) => String.fromCharCode(Number(num)));
  // Clean whitespace
  text = text.replace(/\n{3,}/g, "\n\n").trim();
  return text;
}
