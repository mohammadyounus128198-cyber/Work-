import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useState } from "react";
import { LatticeNodes } from "./LatticeNodes";
import { Monolith } from "./Monolith";

interface LatticeSceneProps {
  hue?: number;
  speed?: number;
  complexity?: number;
  frequency?: number;
}

export function LatticeScene({ hue, speed, complexity, frequency }: LatticeSceneProps) {
  const [autoRotate, setAutoRotate] = useState(true);
  const accentHue = hue ?? 170;

  return (
    <div className="absolute inset-0 z-0">
      <Canvas gl={{ preserveDrawingBuffer: true }}>
        <PerspectiveCamera makeDefault position={[0, 5, 25]} fov={75} />
        <OrbitControls
          enableZoom
          enablePan
          enableRotate
          enableDamping
          autoRotate={autoRotate}
          autoRotateSpeed={(speed ?? 1) * 0.2}
          onStart={() => setAutoRotate(false)}
        />

        <color attach="background" args={["#050a10"]} />
        <fog attach="fog" args={["#050a10", 18, 62]} />

        <ambientLight intensity={0.65} />
        <pointLight position={[0, 1, 0]} intensity={22} distance={30} color="#ff5b3d" />
        <pointLight position={[10, 10, 10]} intensity={1.9} color={`hsl(${accentHue}, 100%, 58%)`} />
        <pointLight position={[-14, 8, -10]} intensity={1.35} color="#245dff" />
        <pointLight position={[0, -8, 12]} intensity={0.9} color="#4bdff7" />

        <LatticeNodes hue={hue} speed={speed} complexity={complexity} frequency={frequency} />
        <Monolith />

        <EffectComposer>
          <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
