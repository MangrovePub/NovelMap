import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Text } from "@react-three/drei";
import type { Mesh } from "three";

export function BookModel({
  position,
  title,
  color,
  height,
  thickness,
  onClick,
}: {
  position: [number, number, number];
  title: string;
  color: string;
  height: number;
  thickness: number;
  onClick: () => void;
}) {
  const meshRef = useRef<Mesh>(null!);
  const [hovered, setHovered] = useState(false);
  const [pullOut, setPullOut] = useState(0);

  // Animate pull-out on hover
  useFrame(() => {
    const target = hovered ? 0.4 : 0;
    setPullOut((prev) => prev + (target - prev) * 0.1);
    if (meshRef.current) {
      meshRef.current.position.z = position[2] + pullOut;
    }
  });

  // Truncate title for spine
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

      {/* Spine text */}
      <Text
        position={[
          position[0] - thickness / 2 - 0.001,
          position[1],
          position[2] + pullOut,
        ]}
        rotation={[0, -Math.PI / 2, Math.PI / 2]}
        fontSize={0.08}
        maxWidth={height * 0.85}
        color="#e0e0e0"
        anchorX="center"
        anchorY="middle"
        font={undefined}
      >
        {spineText}
      </Text>
    </group>
  );
}
