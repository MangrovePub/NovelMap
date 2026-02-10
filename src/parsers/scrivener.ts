import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, basename } from "node:path";
import { XMLParser } from "fast-xml-parser";
import type { ParsedChapter } from "./markdown.js";

interface BinderItem {
  "@_UUID": string;
  "@_Type": string;
  Title: string;
  Children?: { BinderItem: BinderItem | BinderItem[] };
  MetaData?: { IncludeInCompile?: string };
}

/**
 * Parse a Scrivener .scriv bundle into chapters.
 * Reads the .scrivx binder XML, walks the Draft folder,
 * and extracts text from RTF content files.
 */
export function parseScrivener(scrivPath: string): ParsedChapter[] {
  // Find the .scrivx file
  const scrivxFile = findScrivx(scrivPath);
  if (!scrivxFile) {
    throw new Error(`No .scrivx file found in ${scrivPath}`);
  }

  const xml = readFileSync(scrivxFile, "utf-8");
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
  });
  const doc = parser.parse(xml);

  const binder = doc.ScrivenerProject?.Binder?.BinderItem;
  if (!binder) {
    throw new Error("Invalid .scrivx: no Binder found");
  }

  // Find the Draft/Manuscript folder (Type="DraftFolder")
  const items = Array.isArray(binder) ? binder : [binder];
  const draftFolder = items.find((item: BinderItem) => item["@_Type"] === "DraftFolder");

  if (!draftFolder) {
    throw new Error("No DraftFolder found in binder");
  }

  // Determine content directory (Scrivener 3: Files/Data/, older: Files/Docs/)
  const dataDir = existsSync(join(scrivPath, "Files", "Data"))
    ? join(scrivPath, "Files", "Data")
    : existsSync(join(scrivPath, "Files", "Docs"))
      ? join(scrivPath, "Files", "Docs")
      : null;

  if (!dataDir) {
    throw new Error(`No content directory found in ${scrivPath}`);
  }

  const chapters: ParsedChapter[] = [];
  walkBinder(draftFolder, dataDir, chapters, 0);

  return chapters;
}

function walkBinder(
  item: BinderItem,
  dataDir: string,
  chapters: ParsedChapter[],
  depth: number
): void {
  const children = getChildren(item);

  if (item["@_Type"] === "Text") {
    // Leaf document — read content
    const body = readContent(item["@_UUID"], dataDir);
    if (body.trim().length > 0) {
      chapters.push({
        title: item.Title || "Untitled",
        orderIndex: chapters.length,
        body,
      });
    }
  } else if (children.length > 0) {
    // Folder — if it has no text children, it might be a chapter folder
    // whose children are scenes. Collect scenes under this folder title.
    const hasSubfolders = children.some(
      (c) => c["@_Type"] === "Folder" || c["@_Type"] === "DraftFolder"
    );

    if (hasSubfolders || depth === 0) {
      // Recurse into subfolders
      for (const child of children) {
        walkBinder(child, dataDir, chapters, depth + 1);
      }
    } else {
      // All children are text — combine into a single chapter
      const scenes: string[] = [];
      for (const child of children) {
        const body = readContent(child["@_UUID"], dataDir);
        if (body.trim().length > 0) {
          scenes.push(body);
        }
      }
      if (scenes.length > 0) {
        chapters.push({
          title: item.Title || "Untitled",
          orderIndex: chapters.length,
          body: scenes.join("\n\n---\n\n"),
        });
      }
    }
  }
}

function getChildren(item: BinderItem): BinderItem[] {
  if (!item.Children?.BinderItem) return [];
  const children = item.Children.BinderItem;
  return Array.isArray(children) ? children : [children];
}

function readContent(uuid: string, dataDir: string): string {
  // Try Scrivener 3 path: Files/Data/UUID/content.rtf
  const rtfPath = join(dataDir, uuid, "content.rtf");
  if (existsSync(rtfPath)) {
    return stripRtf(readFileSync(rtfPath, "utf-8"));
  }

  // Try plain text
  const txtPath = join(dataDir, uuid, "content.txt");
  if (existsSync(txtPath)) {
    return readFileSync(txtPath, "utf-8");
  }

  return "";
}

/**
 * Simple RTF text extraction — strips RTF control words and returns plain text.
 */
function stripRtf(rtf: string): string {
  let text = rtf;

  // Strip outermost {\rtfN ...} wrapper first
  text = text.replace(/^\s*\{\\rtf\d?\s?/, "");
  text = text.replace(/\}\s*$/, "");

  // Decode RTF hex-encoded characters
  text = text.replace(/\\'([0-9a-f]{2})/gi, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  // Iteratively remove nested groups (font tables, color tables, metadata, etc.)
  let prev = "";
  while (prev !== text) {
    prev = text;
    text = text.replace(/\{[^{}]*\}/g, "");
  }

  // Handle \par and \line as newlines
  text = text.replace(/\\par\b\s?/g, "\n");
  text = text.replace(/\\line\b\s?/g, "\n");

  // Remove remaining control words
  text = text.replace(/\\[a-z]+(-?\d+)? ?/gi, "");

  // Unescape RTF special chars
  text = text.replace(/\\([{}\\])/g, "$1");

  // Remove any remaining braces
  text = text.replace(/[{}]/g, "");

  // Clean up whitespace
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  text = text.replace(/\n{3,}/g, "\n\n").trim();

  return text;
}

function findScrivx(scrivPath: string): string | null {
  try {
    const files = readdirSync(scrivPath);
    const scrivx = files.find((f) => f.endsWith(".scrivx"));
    return scrivx ? join(scrivPath, scrivx) : null;
  } catch {
    return null;
  }
}
