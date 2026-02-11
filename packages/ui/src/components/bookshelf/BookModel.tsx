import { useRef, useState, useMemo, Suspense } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import { TextureLoader, RepeatWrapping, MeshStandardMaterial, type Mesh } from "three";

interface BookProps {
  position: [number, number, number];
  title: string;
  color: string;
  height: number;
  thickness: number;
  coverUrl?: string | null;
  onClick: () => void;
}

// Wrap proportions: [back ~42%] [spine ~6%] [front ~52%]
const BACK_END = 0.42;
const SPINE_START = 0.42;
const SPINE_END = 0.48;
const FRONT_START = 0.48;

function TexturedBook({
  position,
  title,
  color,
  height,
  thickness,
  coverUrl,
  onClick,
}: BookProps & { coverUrl: string }) {
  const meshRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [pullOut, setPullOut] = useState(0);

  const texture = useLoader(TextureLoader, coverUrl);

  const materials = useMemo(() => {
    const frontTex = texture.clone();
    frontTex.wrapS = RepeatWrapping;
    frontTex.offset.x = FRONT_START;
    frontTex.repeat.x = 1 - FRONT_START;
    frontTex.needsUpdate = true;

    const backTex = texture.clone();
    backTex.wrapS = RepeatWrapping;
    backTex.offset.x = 0;
    backTex.repeat.x = BACK_END;
    backTex.needsUpdate = true;

    const spineTex = texture.clone();
    spineTex.wrapS = RepeatWrapping;
    spineTex.offset.x = SPINE_START;
    spineTex.repeat.x = SPINE_END - SPINE_START;
    spineTex.needsUpdate = true;

    const pageMat = new MeshStandardMaterial({ color: "#f5f0e8", roughness: 0.9 });

    return [
      new MeshStandardMaterial({ map: frontTex }),  // +X: front cover
      new MeshStandardMaterial({ map: backTex }),    // -X: back cover
      pageMat,                                       // +Y: top edge
      pageMat,                                       // -Y: bottom edge
      new MeshStandardMaterial({ map: spineTex }),    // +Z: spine
      new MeshStandardMaterial({ color }),            // -Z: hidden
    ];
  }, [texture, color]);

  useFrame(() => {
    const target = hovered ? 0.4 : 0;
    setPullOut((prev) => prev + (target - prev) * 0.1);
    if (meshRef.current) {
      meshRef.current.position.z = position[2] + pullOut;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      castShadow
      receiveShadow
      material={materials}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <boxGeometry args={[thickness, height, 1.2]} />
    </mesh>
  );
}

function FlatBook({
  position,
  title,
  color,
  height,
  thickness,
  onClick,
}: BookProps) {
  const meshRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [pullOut, setPullOut] = useState(0);

  useFrame(() => {
    const target = hovered ? 0.4 : 0;
    setPullOut((prev) => prev + (target - prev) * 0.1);
    if (meshRef.current) {
      meshRef.current.position.z = position[2] + pullOut;
    }
  });

  const spineText =
    title.length > 18 ? title.slice(0, 16) + "\u2026" : title;

  return (
    <group>
      <mesh
        ref={meshRef}
        position={position}
        castShadow
        receiveShadow
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        <boxGeometry args={[thickness, height, 1.2]} />
        <meshStandardMaterial
          color={hovered ? "#ffffff" : color}
          roughness={0.6}
          metalness={0.1}
        />
      </mesh>

      <Text
        position={[
          position[0] - thickness / 2 - 0.001,
          position[1],
          position[2] + pullOut,
        ]}
        rotation={[0, -Math.PI / 2, Math.PI / 2]}
        fontSize={0.08}
        maxWidth={height * 0.85}
        color="#f0e6d3"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {spineText}
      </Text>
    </group>
  );
}

export function BookModel(props: BookProps) {
  if (props.coverUrl) {
    return (
      <Suspense fallback={<FlatBook {...props} />}>
        <TexturedBook {...props} coverUrl={props.coverUrl} />
      </Suspense>
    );
  }
  return <FlatBook {...props} />;
}
