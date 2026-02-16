import JSZip from "jszip";
import type { ParsedChapter } from "./markdown.js";

export interface EpubCoverImage {
  data: Buffer;
  mimeType: string;
  extension: string;
}

export interface EpubParseResult {
  chapters: ParsedChapter[];
  coverImage: EpubCoverImage | null;
}

/**
 * Parse an EPUB file into chapters, optionally extracting the cover image.
 * EPUBs are ZIP archives containing XHTML content files.
 * This covers Vellum exports and standard EPUBs.
 */
export async function parseEpub(buffer: Buffer): Promise<EpubParseResult> {
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

  // Extract spine order (reading order) and manifest (id -> href + media-type mapping)
  const manifest = extractManifest(opfContent);
  const spineIds = extractSpine(opfContent);

  const chapters: ParsedChapter[] = [];

  for (const id of spineIds) {
    const item = manifest.get(id);
    if (!item) continue;

    const fullPath = opfDir + item.href;
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

  // Extract cover image
  const coverImage = await extractCoverImage(zip, opfContent, opfDir, manifest);

  return { chapters, coverImage };
}

function extractOpfPath(containerXml: string): string | null {
  const match = containerXml.match(/full-path="([^"]+)"/);
  return match ? match[1] : null;
}

interface ManifestItem {
  href: string;
  mediaType: string;
  properties: string;
}

function extractManifest(opf: string): Map<string, ManifestItem> {
  const manifest = new Map<string, ManifestItem>();
  // Match <item> elements and capture all attributes
  const itemRegex = /<item\s+([^>]*)\/?\s*>/g;
  let match;
  while ((match = itemRegex.exec(opf)) !== null) {
    const attrs = match[1];
    const idMatch = attrs.match(/id="([^"]+)"/);
    const hrefMatch = attrs.match(/href="([^"]+)"/);
    const mediaMatch = attrs.match(/media-type="([^"]+)"/);
    const propsMatch = attrs.match(/properties="([^"]+)"/);
    if (idMatch && hrefMatch) {
      manifest.set(idMatch[1], {
        href: hrefMatch[1],
        mediaType: mediaMatch ? mediaMatch[1] : "",
        properties: propsMatch ? propsMatch[1] : "",
      });
    }
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

/**
 * Extract the cover image from the EPUB.
 * Checks three common EPUB cover conventions:
 *   1. <meta name="cover" content="<manifest-id>"/> in OPF metadata
 *   2. Manifest item with properties="cover-image" (EPUB 3)
 *   3. Manifest item with id containing "cover" and an image media-type
 */
async function extractCoverImage(
  zip: JSZip,
  opf: string,
  opfDir: string,
  manifest: Map<string, ManifestItem>
): Promise<EpubCoverImage | null> {
  let coverItemId: string | null = null;

  // Strategy 1: <meta name="cover" content="cover-id"/>
  const metaCoverMatch = opf.match(/<meta\s+[^>]*name="cover"[^>]*content="([^"]+)"/);
  if (!metaCoverMatch) {
    // Try reversed attribute order
    const metaCoverMatch2 = opf.match(/<meta\s+[^>]*content="([^"]+)"[^>]*name="cover"/);
    if (metaCoverMatch2) coverItemId = metaCoverMatch2[1];
  } else {
    coverItemId = metaCoverMatch[1];
  }

  // Strategy 2: Manifest item with properties="cover-image" (EPUB 3)
  if (!coverItemId) {
    for (const [id, item] of manifest) {
      if (item.properties.includes("cover-image")) {
        coverItemId = id;
        break;
      }
    }
  }

  // Strategy 3: Manifest item with id containing "cover" and image media-type
  if (!coverItemId) {
    for (const [id, item] of manifest) {
      if (id.toLowerCase().includes("cover") && item.mediaType.startsWith("image/")) {
        coverItemId = id;
        break;
      }
    }
  }

  // Strategy 4: Fallback - Find the largest image file in the archive (often the high-res cover)
  if (!coverItemId) {
    let largestSize = 0;
    let largestPath = "";

    zip.forEach((relativePath, file) => {
      // Check for common image extensions
      if (relativePath.match(/\.(jpg|jpeg|png|webp)$/i)) {
        // Exclude small assets/icons
        // @ts-ignore - _data is internal but usually accessible, or use uncompressedSize
        const size = file._data ? file._data.uncompressedSize : 0;
        if (size > largestSize) {
          largestSize = size;
          largestPath = relativePath;
        }
      }
    });

    if (largestPath && largestSize > 50000) { // arbitrary 50KB min size to avoid logos
      const imgData = await zip.file(largestPath)?.async("nodebuffer");
      if (imgData) {
        const ext = largestPath.split(".").pop()?.toLowerCase() || "jpg";
        const mimeType = ext === "png" ? "image/png" :
          ext === "webp" ? "image/webp" : "image/jpeg";
        return {
          data: Buffer.from(imgData),
          mimeType,
          extension: ext
        };
      }
    }
  }

  if (!coverItemId) return null;

  const coverItem = manifest.get(coverItemId);
  if (!coverItem || !coverItem.mediaType.startsWith("image/")) {
    // The meta cover might point to an XHTML page that wraps the image.
    // Try to extract the image from that page.
    if (coverItem) {
      const coverPage = await zip.file(opfDir + coverItem.href)?.async("string");
      if (coverPage) {
        const imgMatch = coverPage.match(/<img[^>]*src="([^"]+)"/i)
          || coverPage.match(/<image[^>]*href="([^"]+)"/i);
        if (imgMatch) {
          const imgPath = resolveRelativePath(opfDir + coverItem.href, imgMatch[1]);
          const imgData = await zip.file(imgPath)?.async("nodebuffer");
          if (imgData) {
            const ext = imgPath.split(".").pop()?.toLowerCase() || "jpg";
            const mimeType = ext === "png" ? "image/png" :
              ext === "gif" ? "image/gif" :
                ext === "webp" ? "image/webp" : "image/jpeg";
            return { data: Buffer.from(imgData), mimeType, extension: ext };
          }
        }
      }
    }
    return null;
  }

  // Direct image reference
  const fullPath = opfDir + coverItem.href;
  const imgData = await zip.file(fullPath)?.async("nodebuffer");
  if (!imgData) return null;

  const ext = fullPath.split(".").pop()?.toLowerCase() || "jpg";
  return {
    data: Buffer.from(imgData),
    mimeType: coverItem.mediaType,
    extension: ext,
  };
}

/**
 * Resolve a relative path from a base file path.
 * e.g. resolveRelativePath("OEBPS/text/cover.xhtml", "../images/cover.jpg")
 *   -> "OEBPS/images/cover.jpg"
 */
function resolveRelativePath(basePath: string, relativePath: string): string {
  if (!relativePath.startsWith(".")) {
    // Absolute path within the zip (relative to zip root or opfDir)
    const baseDir = basePath.substring(0, basePath.lastIndexOf("/") + 1);
    return baseDir + relativePath;
  }
  const parts = basePath.split("/");
  parts.pop(); // remove the filename
  for (const segment of relativePath.split("/")) {
    if (segment === "..") parts.pop();
    else if (segment !== ".") parts.push(segment);
  }
  return parts.join("/");
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

