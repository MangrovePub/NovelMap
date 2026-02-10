import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Database } from "../src/db/database.js";
import { ProjectStore } from "../src/core/projects.js";

describe("ProjectStore", () => {
  let db: Database;
  let store: ProjectStore;

  beforeEach(() => {
    db = new Database(":memory:");
    store = new ProjectStore(db);
  });

  afterEach(() => {
    db.close();
  });

  it("creates a project", () => {
    const project = store.create("My Series", "/path/to/series");
    expect(project.id).toBe(1);
    expect(project.name).toBe("My Series");
    expect(project.path).toBe("/path/to/series");
    expect(project.created_at).toBeDefined();
  });

  it("gets a project by id", () => {
    store.create("Test", "/test");
    const project = store.get(1);
    expect(project.name).toBe("Test");
  });

  it("throws on missing project", () => {
    expect(() => store.get(999)).toThrow("Project not found: 999");
  });

  it("lists all projects", () => {
    store.create("A", "/a");
    store.create("B", "/b");
    const projects = store.list();
    expect(projects).toHaveLength(2);
  });

  it("updates a project", () => {
    store.create("Old Name", "/old");
    const updated = store.update(1, { name: "New Name" });
    expect(updated.name).toBe("New Name");
    expect(updated.path).toBe("/old");
  });

  it("deletes a project", () => {
    store.create("Doomed", "/doomed");
    store.delete(1);
    expect(() => store.get(1)).toThrow();
  });

  it("throws on deleting missing project", () => {
    expect(() => store.delete(999)).toThrow("Project not found: 999");
  });
});
