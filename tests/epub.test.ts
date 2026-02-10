import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { parseEpub } from "../src/parsers/epub.js";

async function createMockEpub(): Promise<Buffer> {
  const zip = new JSZip();

  zip.file("mimetype", "application/epub+zip");
  zip.file(
    "META-INF/container.xml",
    `<?xml version="1.0"?>
<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`
  );

  zip.file(
    "OEBPS/content.opf",
    `<?xml version="1.0"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0">
  <manifest>
    <item id="ch1" href="ch1.xhtml" media-type="application/xhtml+xml"/>
    <item id="ch2" href="ch2.xhtml" media-type="application/xhtml+xml"/>
    <item id="toc" href="toc.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine>
    <itemref idref="ch1"/>
    <itemref idref="ch2"/>
  </spine>
</package>`
  );

  zip.file(
    "OEBPS/ch1.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 1</title></head>
<body>
<h1>Chapter 1</h1>
<p>Alice fell down the rabbit hole. It was dark and long.</p>
<p>She wondered if she would ever stop falling.</p>
</body>
</html>`
  );

  zip.file(
    "OEBPS/ch2.xhtml",
    `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Chapter 2</title></head>
<body>
<h1>Chapter 2</h1>
<p>She met the Cheshire Cat. He grinned widely.</p>
</body>
</html>`
  );

  const buf = await zip.generateAsync({ type: "nodebuffer" });
  return buf;
}

describe("parseEpub", () => {
  it("parses an EPUB into chapters", async () => {
    const buffer = await createMockEpub();
    const chapters = await parseEpub(buffer);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[1].title).toBe("Chapter 2");
  });

  it("extracts body text from XHTML", async () => {
    const buffer = await createMockEpub();
    const chapters = await parseEpub(buffer);
    expect(chapters[0].body).toContain("rabbit hole");
    expect(chapters[0].body).toContain("stop falling");
    expect(chapters[1].body).toContain("Cheshire Cat");
  });

  it("strips HTML tags", async () => {
    const buffer = await createMockEpub();
    const chapters = await parseEpub(buffer);
    expect(chapters[0].body).not.toContain("<p>");
    expect(chapters[0].body).not.toContain("<h1>");
  });

  it("preserves reading order from spine", async () => {
    const buffer = await createMockEpub();
    const chapters = await parseEpub(buffer);
    expect(chapters[0].orderIndex).toBe(0);
    expect(chapters[1].orderIndex).toBe(1);
  });

  it("throws on invalid EPUB (no container.xml)", async () => {
    const zip = new JSZip();
    zip.file("mimetype", "application/epub+zip");
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    await expect(parseEpub(buffer)).rejects.toThrow("no container.xml");
  });
});
