import type { FastifyInstance } from "fastify";
import { SnapshotStore } from "@novelmap/core";
import { db } from "../db.js";

const snapshots = new SnapshotStore(db);

export function registerSnapshotRoutes(server: FastifyInstance) {
  // List snapshots for a project
  server.get<{ Params: { pid: string } }>(
    "/api/projects/:pid/snapshots",
    async (req) => {
      const pid = Number(req.params.pid);
      return snapshots.list(pid);
    }
  );

  // Create a new snapshot
  server.post<{ Params: { pid: string } }>(
    "/api/projects/:pid/snapshots",
    async (req) => {
      const pid = Number(req.params.pid);
      return snapshots.create(pid);
    }
  );

  // Get a single snapshot
  server.get<{ Params: { pid: string; sid: string } }>(
    "/api/projects/:pid/snapshots/:sid",
    async (req) => {
      const sid = Number(req.params.sid);
      return snapshots.get(sid);
    }
  );

  // Restore a snapshot
  server.post<{ Params: { pid: string; sid: string } }>(
    "/api/projects/:pid/snapshots/:sid/restore",
    async (req) => {
      const sid = Number(req.params.sid);
      snapshots.restore(sid);
      return { restored: true, snapshotId: sid };
    }
  );

  // Diff two snapshots
  server.get<{ Params: { pid: string; sidA: string; sidB: string } }>(
    "/api/projects/:pid/snapshots/:sidA/diff/:sidB",
    async (req) => {
      const sidA = Number(req.params.sidA);
      const sidB = Number(req.params.sidB);
      return snapshots.diff(sidA, sidB);
    }
  );

  // Delete a snapshot
  server.delete<{ Params: { pid: string; sid: string } }>(
    "/api/projects/:pid/snapshots/:sid",
    async (req) => {
      const sid = Number(req.params.sid);
      db.db.prepare("DELETE FROM snapshot WHERE id = ?").run(sid);
      return { deleted: true };
    }
  );
}
