import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseScrivener } from "../src/parsers/scrivener.js";

const MOCK_SCRIVX = `<?xml version="1.0" encoding="UTF-8"?>
<ScrivenerProject>
  <Binder>
    <BinderItem UUID="draft-001" Type="DraftFolder">
      <Title>Manuscript</Title>
      <Children>
        <BinderItem UUID="ch1-folder" Type="Folder">
          <Title>Chapter 1</Title>
          <Children>
            <BinderItem UUID="scene-001" Type="Text">
              <Title>Opening</Title>
            </BinderItem>
            <BinderItem UUID="scene-002" Type="Text">
              <Title>Conflict</Title>
            </BinderItem>
          </Children>
        </BinderItem>
        <BinderItem UUID="ch2-folder" Type="Folder">
          <Title>Chapter 2</Title>
          <Children>
            <BinderItem UUID="scene-003" Type="Text">
              <Title>Resolution</Title>
            </BinderItem>
          </Children>
        </BinderItem>
      </Children>
    </BinderItem>
  </Binder>
</ScrivenerProject>`;

describe("parseScrivener", () => {
  let scrivDir: string;

  beforeEach(() => {
    // Create a mock .scriv bundle
    scrivDir = join(tmpdir(), `test-${Date.now()}.scriv`);
    mkdirSync(scrivDir, { recursive: true });
    writeFileSync(join(scrivDir, "TestProject.scrivx"), MOCK_SCRIVX);

    // Create content files
    const dataDir = join(scrivDir, "Files", "Data");
    for (const uuid of ["scene-001", "scene-002", "scene-003"]) {
      mkdirSync(join(dataDir, uuid), { recursive: true });
    }
    writeFileSync(join(dataDir, "scene-001", "content.rtf"), "{\\rtf1 Alice fell down the rabbit hole.}");
    writeFileSync(join(dataDir, "scene-002", "content.rtf"), "{\\rtf1 It was dark and long.}");
    writeFileSync(join(dataDir, "scene-003", "content.rtf"), "{\\rtf1 She met the Cheshire Cat.}");
  });

  afterEach(() => {
    rmSync(scrivDir, { recursive: true, force: true });
  });

  it("parses a .scriv bundle into chapters", () => {
    const chapters = parseScrivener(scrivDir);
    expect(chapters).toHaveLength(2);
    expect(chapters[0].title).toBe("Chapter 1");
    expect(chapters[1].title).toBe("Chapter 2");
  });

  it("combines scenes within a chapter folder", () => {
    const chapters = parseScrivener(scrivDir);
    // Chapter 1 has two scenes
    expect(chapters[0].body).toContain("rabbit hole");
    expect(chapters[0].body).toContain("dark and long");
  });

  it("preserves chapter order", () => {
    const chapters = parseScrivener(scrivDir);
    expect(chapters[0].orderIndex).toBe(0);
    expect(chapters[1].orderIndex).toBe(1);
  });

  it("throws on missing .scrivx", () => {
    const emptyDir = join(tmpdir(), `empty-${Date.now()}`);
    mkdirSync(emptyDir, { recursive: true });
    expect(() => parseScrivener(emptyDir)).toThrow("No .scrivx file found");
    rmSync(emptyDir, { recursive: true, force: true });
  });

  it("handles plain text content files", () => {
    // Add a text file instead of RTF
    const dataDir = join(scrivDir, "Files", "Data", "scene-001");
    writeFileSync(join(dataDir, "content.txt"), "Plain text scene.");
    rmSync(join(dataDir, "content.rtf"));
    const chapters = parseScrivener(scrivDir);
    expect(chapters[0].body).toContain("Plain text scene");
  });
});
