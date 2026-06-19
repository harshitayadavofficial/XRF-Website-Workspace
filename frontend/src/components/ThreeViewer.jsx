import { Suspense, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Float, useGLTF, Html, Bounds } from "@react-three/drei";

function FallbackModel() {
  const ref = useRef();
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.4;
  });
  return (
    <group ref={ref}>
      {/* Stylised "instrument" - gold cylinder body with detector head */}
      <mesh position={[0, -0.4, 0]} castShadow>
        <cylinderGeometry args={[0.9, 1.1, 0.6, 64]} />
        <meshStandardMaterial color="#1f1f23" metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.2, 0]} castShadow>
        <cylinderGeometry args={[0.55, 0.9, 0.6, 64]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <cylinderGeometry args={[0.35, 0.55, 0.4, 64]} />
        <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <torusGeometry args={[0.4, 0.05, 24, 64]} />
        <meshStandardMaterial color="#E5C158" metalness={1} roughness={0.15} emissive="#7a5b00" emissiveIntensity={0.4} />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <sphereGeometry args={[0.18, 32, 32]} />
        <meshStandardMaterial color="#D4AF37" metalness={1} roughness={0.05} />
      </mesh>
    </group>
  );
}

function GLBModel({ src }) {
  const { scene } = useGLTF(src);
  return <primitive object={scene} />;
}

export default function ThreeViewer({ src, className = "", autoRotate = true, height = 420 }) {
  const isGLB = src && (/\.gl(b|tf)(\?|$)/i.test(src));
  return (
    <div className={`relative w-full overflow-hidden rounded-lg border bg-gradient-to-br from-background to-secondary/40 ${className}`} style={{ height }} data-testid="three-viewer">
      <Canvas shadows camera={{ position: [2.2, 1.4, 2.6], fov: 45 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <spotLight position={[5, 8, 5]} angle={0.3} penumbra={1} intensity={1.2} castShadow />
        <pointLight position={[-3, -2, -4]} intensity={0.5} color="#D4AF37" />
        <Suspense fallback={<Html center><span className="text-xs text-muted-foreground">Loading model…</span></Html>}>
          <Bounds fit clip observe margin={1.3}>
            <Float speed={1.2} rotationIntensity={0.2} floatIntensity={0.3}>
              {isGLB ? <GLBModel src={src} /> : <FallbackModel />}
            </Float>
          </Bounds>
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls enablePan={false} enableZoom autoRotate={autoRotate} autoRotateSpeed={0.6} minDistance={2} maxDistance={6} />
      </Canvas>
      {/* HUD */}
      <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-md border bg-background/70 backdrop-blur px-2 py-1 text-[10px] uppercase tracking-widest text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" /> 360° • drag to rotate • scroll to zoom
      </div>
    </div>
  );
}
