import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useState } from "react";
import { InterferenceField } from "./InterferenceField";
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
        <PerspectiveCamera makeDefault position={[0, 2.5, 17]} fov={58} />
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
        <fog attach="fog" args={["#050a10", 16, 46]} />

        <ambientLight intensity={0.25} />
        <pointLight position={[0, 0.5, 1]} intensity={7.5} distance={18} color="#ff6b28" />
        <pointLight position={[8, 8, 9]} intensity={0.9} color={`hsl(${accentHue}, 100%, 58%)`} />
        <pointLight position={[-10, 7, -12]} intensity={0.75} color="#2a67ff" />
        <pointLight position={[0, -6, 10]} intensity={0.4} color="#4bdff7" />

        <InterferenceField hue={hue} speed={speed} complexity={complexity} frequency={frequency} />
        <LatticeNodes hue={hue} speed={speed} complexity={complexity} frequency={frequency} />
        <Monolith />

        <EffectComposer>
          <Bloom intensity={1.1} luminanceThreshold={0.2} luminanceSmoothing={0.92} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
