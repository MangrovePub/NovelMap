import type { FastifyInstance } from "fastify";
import { query } from "../../pg.js";

export async function registerStudioArcRoutes(server: FastifyInstance) {
  // ── List arcs ─────────────────────────────────────────────────────────────
  server.get<{ Params: { bookId: string } }>(
    "/api/studio/books/:bookId/arcs",
    async (req) => query(
      `SELECT arc_id, arc_name, arc_type, description
       FROM public.story_arcs WHERE book_id = $1
       ORDER BY arc_type DESC, arc_name`,
      [req.params.bookId]
    )
  );

  // ── Create arc ────────────────────────────────────────────────────────────
  server.post<{
    Params: { bookId: string };
    Body: { arc_name: string; arc_type?: string; description?: string };
  }>(
    "/api/studio/books/:bookId/arcs",
    async (req) => {
      const { arc_name, arc_type = "subplot", description } = req.body;
      const [arc] = await query(
        `INSERT INTO public.story_arcs (book_id, arc_name, arc_type, description)
         VALUES ($1, $2, $3, $4)
         RETURNING arc_id, arc_name, arc_type, description`,
        [req.params.bookId, arc_name, arc_type, description ?? null]
      );
      return arc;
    }
  );

  // ── Update arc ────────────────────────────────────────────────────────────
  server.patch<{
    Params: { arcId: string };
    Body: { arc_name?: string; arc_type?: string; description?: string };
  }>(
    "/api/studio/arcs/:arcId",
    async (req) => {
      const { arc_name, arc_type, description } = req.body;
      const [arc] = await query(
        `UPDATE public.story_arcs
         SET arc_name   = COALESCE($1, arc_name),
             arc_type   = COALESCE($2, arc_type),
             description = COALESCE($3, description)
         WHERE arc_id = $4
         RETURNING arc_id, arc_name, arc_type, description`,
        [arc_name ?? null, arc_type ?? null, description ?? null, req.params.arcId]
      );
      return arc;
    }
  );

  // ── Delete arc ────────────────────────────────────────────────────────────
  server.delete<{ Params: { arcId: string } }>(
    "/api/studio/arcs/:arcId",
    async (req) => {
      await query(`DELETE FROM public.story_arcs WHERE arc_id = $1`, [req.params.arcId]);
      return { deleted: true };
    }
  );

  // ── Storyboard data (arcs + chapters + scenes + assignments) ──────────────
  server.get<{ Params: { bookId: string } }>(
    "/api/studio/books/:bookId/storyboard",
    async (req) => {
      const { bookId } = req.params;

      const [arcs, rows] = await Promise.all([
        query(
          `SELECT arc_id, arc_name, arc_type, description
           FROM public.story_arcs WHERE book_id = $1
           ORDER BY arc_type DESC, arc_name`,
          [bookId]
        ),
        query(
          `SELECT
             c.chapter_id, c.chapter_index, c.chapter_number,
             c.title AS chapter_title, c.section_type,
             c.is_prologue, c.is_epilogue,
             s.scene_id, s.seq_in_chapter, s.subheader,
             s.word_count, s.location,
             COALESCE(
               (SELECT array_agg(arc_id::text)
                FROM public.scene_arc_mapping
                WHERE scene_id = s.scene_id),
               ARRAY[]::text[]
             ) AS arc_ids
           FROM public.chapters c
           LEFT JOIN public.scenes s ON s.chapter_id = c.chapter_id
           WHERE c.book_id = $1
           ORDER BY c.chapter_index, s.seq_in_chapter`,
          [bookId]
        ),
      ]);

      // Assemble flat rows into chapters-with-scenes
      const chapterMap = new Map<string, {
        chapter_id: string; chapter_index: number; chapter_number: number | null;
        chapter_title: string | null; section_type: string;
        is_prologue: boolean; is_epilogue: boolean;
        scenes: { scene_id: string; seq_in_chapter: number; subheader: string | null;
                  word_count: number; location: string | null; arc_ids: string[] }[];
      }>();

      for (const r of rows as Record<string, unknown>[]) {
        if (!chapterMap.has(r.chapter_id as string)) {
          chapterMap.set(r.chapter_id as string, {
            chapter_id: r.chapter_id as string,
            chapter_index: r.chapter_index as number,
            chapter_number: r.chapter_number as number | null,
            chapter_title: r.chapter_title as string | null,
            section_type: r.section_type as string,
            is_prologue: r.is_prologue as boolean,
            is_epilogue: r.is_epilogue as boolean,
            scenes: [],
          });
        }
        if (r.scene_id) {
          chapterMap.get(r.chapter_id as string)!.scenes.push({
            scene_id: r.scene_id as string,
            seq_in_chapter: r.seq_in_chapter as number,
            subheader: r.subheader as string | null,
            word_count: r.word_count as number,
            location: r.location as string | null,
            arc_ids: (r.arc_ids as string[]) ?? [],
          });
        }
      }

      return { arcs, chapters: Array.from(chapterMap.values()) };
    }
  );

  // ── Assign scene to arc ───────────────────────────────────────────────────
  server.post<{ Params: { sceneId: string; arcId: string } }>(
    "/api/studio/scenes/:sceneId/arcs/:arcId",
    async (req) => {
      await query(
        `INSERT INTO public.scene_arc_mapping (scene_id, arc_id)
         VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [req.params.sceneId, req.params.arcId]
      );
      return { assigned: true };
    }
  );

  // ── Remove scene from arc ─────────────────────────────────────────────────
  server.delete<{ Params: { sceneId: string; arcId: string } }>(
    "/api/studio/scenes/:sceneId/arcs/:arcId",
    async (req) => {
      await query(
        `DELETE FROM public.scene_arc_mapping WHERE scene_id = $1 AND arc_id = $2`,
        [req.params.sceneId, req.params.arcId]
      );
      return { unassigned: true };
    }
  );
}
