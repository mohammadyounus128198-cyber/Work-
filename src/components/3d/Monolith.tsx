import { useMemo } from "react";

export function Monolith() {
  const positions = useMemo(
    () => [
      [-2.6, -1.1, -9.6],
      [2.7, -1.2, -10.4],
      [0.2, -1.5, -12.8],
    ],
    []
  );

  return (
    <group>
      {positions.map((position, index) => (
        <mesh key={index} position={position as [number, number, number]}>
          <boxGeometry args={[1.8, 8.8, 1.6]} />
          <meshStandardMaterial
            color="#071016"
            emissive="#13e7cf"
            emissiveIntensity={0.06}
            roughness={0.3}
            metalness={0.72}
            transparent
            opacity={0.42}
          />
          <mesh position={[0, 0, 0.82]}>
            <planeGeometry args={[1.72, 8.52]} />
            <meshBasicMaterial color="#12dcc7" transparent opacity={0.035} wireframe />
          </mesh>
        </mesh>
      ))}
    </group>
  );
}
