import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { BookModel } from "./BookModel.tsx";
import type { Manuscript } from "../../api/client.ts";
import { resolveCoverUrl } from "../../api/client.ts";

// Shelf plank geometry
function ShelfPlank({ y }: { y: number }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow>
      <boxGeometry args={[8, 0.15, 1.8]} />
      <meshStandardMaterial color="#5c3a1e" roughness={0.8} />
    </mesh>
  );
}

// Side panel
function SidePanel({ x }: { x: number }) {
  return (
    <mesh position={[x, 1.5, 0]}>
      <boxGeometry args={[0.15, 3.3, 1.8]} />
      <meshStandardMaterial color="#4a2e14" roughness={0.85} />
    </mesh>
  );
}

// Back panel
function BackPanel() {
  return (
    <mesh position={[0, 1.5, -0.85]}>
      <boxGeometry args={[8.3, 3.3, 0.08]} />
      <meshStandardMaterial color="#3d2510" roughness={0.9} />
    </mesh>
  );
}

// Book gradient colors for deterministic cover coloring
const SPINE_COLORS = [
  "#e94560",
  "#0f3460",
  "#533483",
  "#e9a045",
  "#45e9a0",
  "#4560e9",
  "#c23616",
  "#0097e6",
  "#8c7ae6",
  "#44bd32",
];

function hashTitle(title: string): number {
  let h = 0;
  for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function BookShelf3D({
  manuscripts,
  onSelect,
}: {
  manuscripts: Manuscript[];
  onSelect: (id: number) => void;
}) {
  // Lay books on shelves, max 6 per shelf row
  const booksPerShelf = 6;
  const shelves: Manuscript[][] = [];
  for (let i = 0; i < manuscripts.length; i += booksPerShelf) {
    shelves.push(manuscripts.slice(i, i + booksPerShelf));
  }

  return (
    <div className="w-full h-full min-h-[500px] rounded-xl overflow-hidden border border-[--color-bg-accent]">
      <Canvas shadows>
        {/* Fixed camera angle — a pleasant shelf view for screenshots */}
        <PerspectiveCamera makeDefault position={[0.5, 2.2, 5.5]} fov={48} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 8, 5]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <pointLight position={[-3, 4, 2]} intensity={0.5} color="#e9a045" />
        <Environment preset="apartment" />

        {/* Bookshelf structure */}
        <BackPanel />
        <SidePanel x={-4.07} />
        <SidePanel x={4.07} />

        {/* Shelf planks and books */}
        {shelves.map((shelfBooks, shelfIdx) => {
          const shelfY = 0.1 + shelfIdx * 1.5;
          return (
            <group key={shelfIdx}>
              <ShelfPlank y={shelfY} />
              {shelfBooks.map((m, bookIdx) => {
                const x = -3 + bookIdx * 1.2;
                const color = SPINE_COLORS[hashTitle(m.title) % SPINE_COLORS.length];
                const height = 0.9 + (hashTitle(m.title + "h") % 30) / 100;
                const thickness = 0.25 + (hashTitle(m.title + "t") % 20) / 100;
                return (
                  <BookModel
                    key={m.id}
                    position={[x, shelfY + 0.075 + height / 2, 0]}
                    title={m.title}
                    color={color}
                    height={height}
                    thickness={thickness}
                    coverUrl={resolveCoverUrl(m.cover_url)}
                    onClick={() => onSelect(m.id)}
                  />
                );
              })}
            </group>
          );
        })}

        {/* Top shelf plank */}
        <ShelfPlank y={0.1 + shelves.length * 1.5} />
      </Canvas>
    </div>
  );
}
