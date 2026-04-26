"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Html, OrbitControls, useGLTF } from "@react-three/drei";
import * as THREE from "three";

type BrainRegion = "amygdala" | "prefrontal_cortex" | "ventral_attention_network";

type BrainViewerProps = {
  region?: BrainRegion | null;
  className?: string;
};

const REGION_MATCHERS: Record<BrainRegion, string[]> = {
  amygdala: ["amygdala", "temporal", "limbic"],
  prefrontal_cortex: ["prefrontal", "frontal", "cortex"],
  ventral_attention_network: ["attention", "ventral", "parietal", "network"]
};

const REGION_COLORS: Record<BrainRegion, string> = {
  amygdala: "#f59e0b",
  prefrontal_cortex: "#8b5cf6",
  ventral_attention_network: "#34c759"
};

function FallbackMessage() {
  return (
    <Html center>
      <div className="rounded-2xl border border-white/10 bg-black/70 px-4 py-3 text-center text-sm text-white/80 backdrop-blur">
        Loading brain model…
      </div>
    </Html>
  );
}

function BrainModel({ region }: { region?: BrainRegion | null }) {
  const gltf = useGLTF("/models/brain.glb");
  const scene = useMemo(() => gltf.scene.clone(true), [gltf.scene]);

  useEffect(() => {
    const emissiveColor = region ? new THREE.Color(REGION_COLORS[region]) : new THREE.Color("#000000");
    const fallbackColor = new THREE.Color("#d8d0c4");

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;

      const originalMaterial = child.material;
      const baseMaterial = Array.isArray(originalMaterial) ? originalMaterial[0] : originalMaterial;
      const material = (baseMaterial?.clone?.() as THREE.MeshStandardMaterial | undefined) || new THREE.MeshStandardMaterial();
      const meshName = child.name.toLowerCase();
      const shouldHighlight =
        !!region && REGION_MATCHERS[region].some((token) => meshName.includes(token));

      material.color = shouldHighlight ? new THREE.Color(REGION_COLORS[region]) : fallbackColor;
      material.emissive = shouldHighlight ? emissiveColor : new THREE.Color("#000000");
      material.emissiveIntensity = shouldHighlight ? 0.65 : 0;
      material.roughness = 0.48;
      material.metalness = 0.12;

      child.material = material;
      child.castShadow = false;
      child.receiveShadow = false;
    });

    return () => {
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const material = child.material;
          if (Array.isArray(material)) {
            material.forEach((entry) => entry.dispose?.());
          } else {
            material.dispose?.();
          }
        }
      });
    };
  }, [region, scene]);

  return <primitive object={scene} position={[0, -0.2, 0]} scale={2.1} />;
}

export default function BrainViewer({ region, className = "" }: BrainViewerProps) {
  const [modelState, setModelState] = useState<"checking" | "ready" | "missing">("checking");

  useEffect(() => {
    let active = true;

    fetch("/models/brain.glb", { method: "HEAD" })
      .then((response) => {
        if (!active) return;
        setModelState(response.ok ? "ready" : "missing");
      })
      .catch(() => {
        if (!active) return;
        setModelState("missing");
      });

    return () => {
      active = false;
    };
  }, []);

  if (modelState !== "ready") {
    return (
      <div
        className={`relative flex min-h-[360px] items-center justify-center overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(38,38,38,0.88),rgba(8,8,10,1))] ${className}`}
      >
        <div className="max-w-sm rounded-[22px] border border-white/10 bg-black/35 px-6 py-5 text-center text-sm leading-7 text-white/78 backdrop-blur">
          {modelState === "checking"
            ? "Checking for brain model…"
            : "3D brain model not found yet. Place `brain.glb` in `frontend/public/models/` to enable the interactive viewer."}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden rounded-[26px] border border-white/10 bg-[radial-gradient(circle_at_50%_40%,rgba(38,38,38,0.88),rgba(8,8,10,1))] ${className}`}>
      <Canvas camera={{ fov: 34, position: [0, 0.2, 5.6] }} dpr={[1, 1.75]}>
        <ambientLight intensity={1.3} />
        <directionalLight intensity={1.8} position={[4, 5, 4]} />
        <directionalLight color="#7dd3fc" intensity={0.65} position={[-3, 1, 5]} />
        <Suspense fallback={<FallbackMessage />}>
          <group rotation={[0.08, 0.25, 0]}>
            <BrainModel region={region} />
          </group>
          <Environment preset="city" />
        </Suspense>
        <OrbitControls
          enableDamping
          enablePan={false}
          maxDistance={7.5}
          minDistance={3.6}
          rotateSpeed={0.7}
          zoomSpeed={0.75}
        />
      </Canvas>

      <div className="pointer-events-none absolute inset-x-4 bottom-4 rounded-[18px] bg-black/40 px-4 py-3 text-sm text-white/72 backdrop-blur">
        Drag to rotate. Scroll or pinch to zoom.
      </div>
    </div>
  );
}
