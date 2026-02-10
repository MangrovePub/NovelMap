import { motion } from "framer-motion";
import { BookCard } from "./BookCard.tsx";
import type { Manuscript, Entity } from "../../api/client.ts";

const container = {
  animate: { transition: { staggerChildren: 0.05 } },
};

const item = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" as const } },
};

export function BookGrid({
  manuscripts,
  entities,
}: {
  manuscripts: Manuscript[];
  entities: Entity[];
}) {
  return (
    <motion.div
      className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-5"
      variants={container}
      initial="initial"
      animate="animate"
    >
      {manuscripts.map((m) => (
        <motion.div key={m.id} variants={item}>
          <BookCard
            manuscript={m}
            entityCount={entities.filter((e) => e.project_id === m.project_id).length}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
