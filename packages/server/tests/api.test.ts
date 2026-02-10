import { vi, describe, it, expect, beforeAll, afterAll } from "vitest";

// Mock the db module with an in-memory database before route imports
vi.mock("../src/db.js", async () => {
  const core = await import("@novelmap/core");
  return { db: new core.Database() };
});

import Fastify from "fastify";
import { registerProjectRoutes } from "../src/routes/projects.js";
import { registerEntityRoutes } from "../src/routes/entities.js";
import { registerRelationshipRoutes } from "../src/routes/relationships.js";
import { registerSnapshotRoutes } from "../src/routes/snapshots.js";

const app = Fastify();

beforeAll(async () => {
  registerProjectRoutes(app);
  registerEntityRoutes(app);
  registerRelationshipRoutes(app);
  registerSnapshotRoutes(app);
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

// ─── Projects ───────────────────────────────────────────────

describe("Projects API", () => {
  it("creates a project", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects",
      payload: { name: "Test Series", path: "test-series" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Test Series");
    expect(body.id).toBeTypeOf("number");
  });

  it("lists projects", async () => {
    const res = await app.inject({ method: "GET", url: "/api/projects" });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].name).toBe("Test Series");
  });

  it("gets a project by id", async () => {
    const res = await app.inject({ method: "GET", url: "/api/projects/1" });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Test Series");
  });

  it("updates a project", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/projects/1",
      payload: { name: "Renamed Series" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Renamed Series");
  });
});

// ─── Entities ───────────────────────────────────────────────

describe("Entities API", () => {
  it("creates an entity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/1/entities",
      payload: { name: "Aragorn", type: "character", metadata: { role: "king" } },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.name).toBe("Aragorn");
    expect(body.type).toBe("character");
    expect(body.metadata.role).toBe("king");
  });

  it("creates a second entity", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/1/entities",
      payload: { name: "Rivendell", type: "location" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().type).toBe("location");
  });

  it("lists entities for a project", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/1/entities",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(2);
  });

  it("filters entities by type", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/1/entities?type=character",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.length).toBe(1);
    expect(body[0].name).toBe("Aragorn");
  });

  it("updates an entity", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/entities/1",
      payload: { name: "Strider" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().name).toBe("Strider");
  });

  it("deletes an entity", async () => {
    // Create one to delete
    const create = await app.inject({
      method: "POST",
      url: "/api/projects/1/entities",
      payload: { name: "Temp", type: "artifact" },
    });
    const id = create.json().id;

    const del = await app.inject({
      method: "DELETE",
      url: `/api/entities/${id}`,
    });
    expect(del.statusCode).toBe(204);

    // Verify it's gone
    const list = await app.inject({
      method: "GET",
      url: "/api/projects/1/entities?type=artifact",
    });
    expect(list.json().length).toBe(0);
  });
});

// ─── Relationships ──────────────────────────────────────────

describe("Relationships API", () => {
  it("creates a relationship", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/1/relationships",
      payload: {
        source_entity_id: 1,
        target_entity_id: 2,
        type: "visited",
      },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.type).toBe("visited");
    expect(body.source_entity_id).toBe(1);
  });

  it("lists relationships for a project", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/1/relationships",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
  });

  it("deletes a relationship", async () => {
    const del = await app.inject({
      method: "DELETE",
      url: "/api/relationships/1",
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({
      method: "GET",
      url: "/api/projects/1/relationships",
    });
    expect(list.json().length).toBe(0);
  });
});

// ─── Snapshots ──────────────────────────────────────────────

describe("Snapshots API", () => {
  it("creates a snapshot", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/projects/1/snapshots",
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.id).toBeTypeOf("number");
    expect(body.project_id).toBe(1);
  });

  it("lists snapshots", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/projects/1/snapshots",
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().length).toBe(1);
  });

  it("diffs two snapshots", async () => {
    // Create a second entity, then a second snapshot
    await app.inject({
      method: "POST",
      url: "/api/projects/1/entities",
      payload: { name: "Gandalf", type: "character" },
    });
    const snap2 = await app.inject({
      method: "POST",
      url: "/api/projects/1/snapshots",
    });
    const sid2 = snap2.json().id;

    const diff = await app.inject({
      method: "GET",
      url: `/api/projects/1/snapshots/1/diff/${sid2}`,
    });
    expect(diff.statusCode).toBe(200);
    const body = diff.json();
    expect(body.entities).toBeDefined();
    expect(body.entities.added.length).toBeGreaterThanOrEqual(1);
  });

  it("deletes a snapshot", async () => {
    const del = await app.inject({
      method: "DELETE",
      url: "/api/projects/1/snapshots/1",
    });
    expect(del.statusCode).toBe(200);
    expect(del.json().deleted).toBe(true);
  });
});

// ─── Project deletion ───────────────────────────────────────

describe("Project deletion", () => {
  it("deletes a project", async () => {
    const del = await app.inject({
      method: "DELETE",
      url: "/api/projects/1",
    });
    expect(del.statusCode).toBe(204);

    const list = await app.inject({ method: "GET", url: "/api/projects" });
    expect(list.json().length).toBe(0);
  });
});
