import { describe, it, expect } from "vitest";
import { parseMarkdown } from "../src/parsers/markdown.js";

const SAMPLE = `# Book Title

Some intro text.

## Chapter 1

Alice fell down the rabbit hole. It was dark and long.

## Chapter 2

She met the Cheshire Cat. He grinned widely.

## Chapter 3

The tea party was quite mad.
`;

describe("parseMarkdown", () => {
  it("splits on h2 headings by default", () => {
    const chapters = parseMarkdown(SAMPLE);
    expect(chapters).toHaveLength(4); // intro + 3 chapters
    expect(chapters[0].title).toBe("Untitled");
    expect(chapters[0].body).toContain("Book Title");
    expect(chapters[1].title).toBe("Chapter 1");
    expect(chapters[2].title).toBe("Chapter 2");
    expect(chapters[3].title).toBe("Chapter 3");
  });

  it("preserves chapter body text", () => {
    const chapters = parseMarkdown(SAMPLE);
    expect(chapters[1].body).toContain("rabbit hole");
    expect(chapters[2].body).toContain("Cheshire Cat");
  });

  it("assigns sequential order indexes", () => {
    const chapters = parseMarkdown(SAMPLE);
    expect(chapters.map((c) => c.orderIndex)).toEqual([0, 1, 2, 3]);
  });

  it("handles no headings — single chapter", () => {
    const chapters = parseMarkdown("Just a plain paragraph of text.");
    expect(chapters).toHaveLength(1);
    expect(chapters[0].title).toBe("Untitled");
    expect(chapters[0].body).toBe("Just a plain paragraph of text.");
  });

  it("handles empty input", () => {
    const chapters = parseMarkdown("");
    expect(chapters).toHaveLength(0);
  });

  it("supports configurable heading depth", () => {
    const md = `# Part One\n\nIntro\n\n# Part Two\n\nMore text`;
    const chapters = parseMarkdown(md, 1);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Part One");
    expect(chapters[1].title).toBe("Part Two");
  });
});
