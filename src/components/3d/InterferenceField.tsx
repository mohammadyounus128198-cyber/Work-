import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { getInterferenceEmitters, INTERFERENCE_EMITTER_COUNT } from "../../lib/frequency-map";

interface InterferenceFieldProps {
  hue?: number;
  speed?: number;
  complexity?: number;
  frequency?: number;
}

const vertexShader = `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

const fragmentShader = `
  #define EMITTER_COUNT ${INTERFERENCE_EMITTER_COUNT}

  uniform float uTime;
  uniform float uSpeed;
  uniform float uComplexity;
  uniform float uFrequency;
  uniform float uHue;
  uniform vec3 uEmitterPositions[EMITTER_COUNT];
  uniform float uEmitterAmplitudes[EMITTER_COUNT];
  uniform float uEmitterFalloffs[EMITTER_COUNT];
  uniform float uEmitterFrequencies[EMITTER_COUNT];

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  vec3 spectralMap(float x) {
    vec3 deepBlue = vec3(0.03, 0.08, 0.26);
    vec3 cyan = vec3(0.13, 0.68, 0.92);
    vec3 emerald = vec3(0.13, 0.82, 0.56);
    vec3 amber = vec3(0.98, 0.68, 0.08);
    vec3 orange = vec3(0.98, 0.38, 0.07);
    vec3 red = vec3(0.92, 0.16, 0.14);

    if (x < 0.18) return mix(deepBlue, cyan, x / 0.18);
    if (x < 0.38) return mix(cyan, emerald, (x - 0.18) / 0.20);
    if (x < 0.60) return mix(emerald, amber, (x - 0.38) / 0.22);
    if (x < 0.82) return mix(amber, orange, (x - 0.60) / 0.22);
    return mix(orange, red, (x - 0.82) / 0.18);
  }

  vec3 applyHueAccent(vec3 color, float hue) {
    float accent = clamp((sin(radians(hue)) + 1.0) * 0.5, 0.0, 1.0);
    vec3 teal = vec3(0.06, 0.95, 0.83);
    return mix(color, mix(color, teal, 0.22), accent * 0.14);
  }

  void main() {
    vec3 rayDir = normalize(vWorldPosition - cameraPosition);
    float intensity = 0.0;
    float coherence = 0.0;

    for (int sampleIndex = 0; sampleIndex < 4; sampleIndex++) {
      float depth = 4.0 + float(sampleIndex) * (2.2 + uComplexity * 0.8);
      vec3 samplePoint = rayDir * depth;

      for (int i = 0; i < EMITTER_COUNT; i++) {
        vec3 delta = samplePoint - uEmitterPositions[i];
        float dist = length(delta);
        float falloff = exp(-uEmitterFalloffs[i] * dist * dist * 0.07);
        float wave = sin(uTime * uEmitterFrequencies[i] - dist * (0.85 + float(i) * 0.035));
        float contribution = uEmitterAmplitudes[i] * (0.5 + 0.5 * wave) * falloff;
        intensity += contribution;
        coherence += uEmitterAmplitudes[i] * abs(cos(uTime * uEmitterFrequencies[i] - dist * 0.55)) * falloff;
      }
    }

    intensity /= 4.0;
    coherence /= 4.0;

    float centerGlow = exp(-pow(length(rayDir.xy) * 1.55, 2.0));
    float vignette = smoothstep(1.12, 0.15, length(vUv - 0.5));
    float shellMask = smoothstep(0.02, 0.95, intensity * 0.9 + centerGlow * 0.45);
    float highlight = pow(clamp(coherence, 0.0, 1.0), 3.2) * 0.55;
    float normalized = clamp(intensity * 0.95 + centerGlow * 0.32 + highlight * 0.3, 0.0, 1.0);

    vec3 color = spectralMap(normalized);
    color = applyHueAccent(color, uHue);
    color += vec3(1.0, 0.94, 0.82) * highlight * (0.35 + centerGlow * 0.4);

    float alpha = clamp(shellMask * vignette * 0.56 + centerGlow * 0.18, 0.0, 0.72);
    gl_FragColor = vec4(color, alpha);
  }
`;

export function InterferenceField({
  hue = 170,
  speed = 1.0,
  complexity = 1.0,
  frequency = 1.0,
}: InterferenceFieldProps) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uTime: { value: 0 },
          uSpeed: { value: speed },
          uComplexity: { value: complexity },
          uFrequency: { value: frequency },
          uHue: { value: hue },
          uEmitterPositions: { value: Array.from({ length: INTERFERENCE_EMITTER_COUNT }, () => new THREE.Vector3()) },
          uEmitterAmplitudes: { value: new Float32Array(INTERFERENCE_EMITTER_COUNT) },
          uEmitterFalloffs: { value: new Float32Array(INTERFERENCE_EMITTER_COUNT) },
          uEmitterFrequencies: { value: new Float32Array(INTERFERENCE_EMITTER_COUNT) },
        },
        vertexShader,
        fragmentShader,
      }),
    []
  );

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const emitters = getInterferenceEmitters(time * Math.max(speed, 0.4), frequency, complexity);
    const positions = material.uniforms.uEmitterPositions.value as THREE.Vector3[];
    const amplitudes = material.uniforms.uEmitterAmplitudes.value as Float32Array;
    const falloffs = material.uniforms.uEmitterFalloffs.value as Float32Array;
    const frequencies = material.uniforms.uEmitterFrequencies.value as Float32Array;

    material.uniforms.uTime.value = time * (0.55 + speed * 0.25);
    material.uniforms.uSpeed.value = speed;
    material.uniforms.uComplexity.value = complexity;
    material.uniforms.uFrequency.value = frequency;
    material.uniforms.uHue.value = hue;

    emitters.forEach((emitter, index) => {
      positions[index].set(...emitter.position);
      amplitudes[index] = emitter.amplitude;
      falloffs[index] = emitter.falloff;
      frequencies[index] = emitter.visualFrequency;
    });
  });

  return (
    <mesh>
      <sphereGeometry args={[24, 64, 64]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}
