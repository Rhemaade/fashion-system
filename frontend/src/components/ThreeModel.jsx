import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { Suspense, useMemo, Component } from 'react';
import * as THREE from 'three';

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildAvatarMetrics(measurements) {
  const chest = Number(measurements?.chest || 38);
  const waist = Number(measurements?.waist || 30);
  const hips = Number(measurements?.hips || 40);
  const shoulders = Number(measurements?.shoulders || 17);
  const sleeve = Number(measurements?.sleeve || 24);

  return {
    shoulderWidth: clamp(shoulders * 0.052, 0.85, 1.55),
    chestRadius: clamp(chest * 0.0145, 0.5, 1),
    waistRadius: clamp(waist * 0.014, 0.42, 0.85),
    hipRadius: clamp(hips * 0.0145, 0.52, 1.05),
    armLength: clamp(sleeve * 0.045, 0.95, 1.5),
  };
}

function buildGarmentMetrics(metrics, outfitConfig) {
  const silhouetteScale = {
    fitted: 1.03,
    tailored: 1.08,
    relaxed: 1.15,
    oversized: 1.25,
    flowing: 1.2,
  }[outfitConfig?.silhouette || 'tailored'];

  return {
    chestRadius: metrics.chestRadius * silhouetteScale,
    waistRadius: metrics.waistRadius * silhouetteScale,
    hipRadius: metrics.hipRadius * silhouetteScale,
    shoulderWidth: metrics.shoulderWidth * (silhouetteScale > 1.2 ? 1.08 : 1.03),
    torsoHeight: outfitConfig?.topLength === 'mid-thigh' ? 0.9 : 0.72,
    legLength: outfitConfig?.garmentType === 'dress' ? 0.9 : 0.78,
    sleeveLength:
      outfitConfig?.sleeveLength === 'sleeveless'
        ? 0.05
        : outfitConfig?.sleeveLength === 'short'
          ? metrics.armLength * 0.45
          : outfitConfig?.sleeveLength === 'three-quarter'
            ? metrics.armLength * 0.75
            : metrics.armLength,
  };
}

function RealAvatar({ measurements }) {
  const { scene } = useGLTF('/models/avatar.glb');
  const metrics = useMemo(() => buildAvatarMetrics(measurements), [measurements]);
  const preparedAvatar = useMemo(() => {
    const clonedScene = scene.clone(true);

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const sourceMaterial = child.material;
        if (sourceMaterial) {
          child.material = sourceMaterial.clone();
          if ('roughness' in child.material && child.material.roughness == null) {
            child.material.roughness = 0.85;
          }
          if ('metalness' in child.material && child.material.metalness == null) {
            child.material.metalness = 0.05;
          }
        } else {
          child.material = new THREE.MeshStandardMaterial({
            color: '#d7b899',
            roughness: 0.88,
            metalness: 0.05,
          });
        }
      }
    });

    const initialBox = new THREE.Box3().setFromObject(clonedScene);
    const initialSize = initialBox.getSize(new THREE.Vector3());
    const targetHeight = 1.72;
    const baseScale = initialSize.y > 0 ? targetHeight / initialSize.y : 1;

    clonedScene.scale.setScalar(baseScale);

    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    clonedScene.position.x -= scaledCenter.x;
    clonedScene.position.z -= scaledCenter.z;
    clonedScene.position.y -= scaledBox.min.y;

    clonedScene.scale.x *= clamp(metrics.shoulderWidth / 1.08, 0.94, 1.04);
    clonedScene.scale.z *= clamp(metrics.hipRadius / 0.75, 0.94, 1.04);

    return clonedScene;
  }, [metrics, scene]);

  return <primitive object={preparedAvatar} position={[0, 0, 0]} />;
}

function GarmentLayer({ measurements, outfitConfig }) {
  const metrics = useMemo(() => buildAvatarMetrics(measurements), [measurements]);
  const garmentMetrics = useMemo(() => buildGarmentMetrics(metrics, outfitConfig), [metrics, outfitConfig]);

  if (!outfitConfig) return null;

  const topCenterY = 1.1;
  const armY = 1.3;
  const materialRoughness = {
    satin: 0.3,
    silk: 0.35,
    denim: 0.82,
    wool: 0.7,
    linen: 0.78,
    cotton: 0.74,
    fleece: 0.88,
  }[outfitConfig.material] || 0.7;

  return (
    <group>
      <mesh position={[0, topCenterY, 0]} castShadow receiveShadow>
        <cylinderGeometry
          args={[
            garmentMetrics.waistRadius,
            garmentMetrics.chestRadius,
            garmentMetrics.torsoHeight,
            32,
          ]}
        />
        <meshStandardMaterial color={outfitConfig.primaryColor} roughness={materialRoughness} metalness={0.08} />
      </mesh>

      {outfitConfig.garmentType === 'dress' ? (
        <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
          <coneGeometry args={[garmentMetrics.hipRadius * 1.45, garmentMetrics.legLength * 1.55, 32]} />
          <meshStandardMaterial color={outfitConfig.primaryColor} roughness={materialRoughness} metalness={0.04} />
        </mesh>
      ) : (
        <>
          {[-1, 1].map((side) => (
            <mesh key={`trouser-${side}`} position={[side * 0.22, garmentMetrics.legLength / 2, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[0.2, 0.24, garmentMetrics.legLength, 20]} />
              <meshStandardMaterial color={outfitConfig.primaryColor} roughness={materialRoughness} metalness={0.05} />
            </mesh>
          ))}
          {outfitConfig.catalogId === 'senator-set' && (
            <mesh position={[0, 0.95, 0.02]} castShadow receiveShadow>
              <cylinderGeometry args={[garmentMetrics.hipRadius * 1.1, garmentMetrics.chestRadius, garmentMetrics.torsoHeight * 1.28, 28]} />
              <meshStandardMaterial color={outfitConfig.primaryColor} roughness={materialRoughness} metalness={0.05} />
            </mesh>
          )}
        </>
      )}

      {[-1, 1].map((side) => (
        <mesh key={`sleeve-${side}`} position={[side * (garmentMetrics.shoulderWidth / 2 + 0.08), armY, 0]} castShadow receiveShadow>
          <capsuleGeometry args={[outfitConfig.sleeveLength === 'sleeveless' ? 0.001 : 0.14, garmentMetrics.sleeveLength, 8, 16]} />
          <meshStandardMaterial color={outfitConfig.primaryColor} roughness={materialRoughness} metalness={0.06} />
        </mesh>
      ))}

      {outfitConfig.detailFlags?.embroidery && (
        <mesh position={[0, topCenterY + garmentMetrics.torsoHeight * 0.22, garmentMetrics.chestRadius + 0.01]}>
          <torusGeometry args={[0.18, 0.015, 12, 32]} />
          <meshStandardMaterial color={outfitConfig.accentColor} roughness={0.45} metalness={0.35} />
        </mesh>
      )}

      {outfitConfig.detailFlags?.belt && (
        <mesh position={[0, 0.98, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[garmentMetrics.waistRadius * 1.02, 0.025, 8, 48]} />
          <meshStandardMaterial color={outfitConfig.accentColor} roughness={0.5} metalness={0.25} />
        </mesh>
      )}
    </group>
  );
}

class GarmentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.outfitConfig?.catalogId !== this.props.outfitConfig?.catalogId) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

function GLBGarment({ outfitConfig, metrics }) {
  const { scene } = useGLTF(`/models/garments/${outfitConfig.catalogId}.glb`);

  const materialRoughness = {
    satin: 0.3,
    silk: 0.35,
    denim: 0.82,
    wool: 0.7,
    linen: 0.78,
    cotton: 0.74,
    fleece: 0.88,
  }[outfitConfig.material] || 0.7;

  const preparedGarment = useMemo(() => {
    const clonedScene = scene.clone(true);

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        child.material = new THREE.MeshStandardMaterial({
          color: outfitConfig.primaryColor,
          roughness: materialRoughness,
          metalness: 0.05
        });
      }
    });

    clonedScene.scale.x *= clamp(metrics.shoulderWidth / 1.08, 0.94, 1.04);
    clonedScene.scale.z *= clamp(metrics.hipRadius / 0.75, 0.94, 1.04);

    return clonedScene;
  }, [scene, outfitConfig, metrics, materialRoughness]);

  return <primitive object={preparedGarment} position={[0, 0, 0]} />;
}

function RemoteGLBGarment({ modelUrl }) {
  // Use proxy to avoid CORS
  const proxyUrl = modelUrl.startsWith('http')
    ? `http://localhost:5000/designs/asset?url=${encodeURIComponent(modelUrl)}`
    : modelUrl;

  const { scene } = useGLTF(proxyUrl);

  const preparedGarment = useMemo(() => {
    const clonedScene = scene.clone(true);

    // Normalize and scale the mesh to match avatar torso roughly
    const box = new THREE.Box3().setFromObject(clonedScene);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);

    if (maxDim > 0) {
      const targetHeight = 0.8; // Approximate height of the torso
      clonedScene.scale.setScalar(targetHeight / maxDim);
    }

    const scaledBox = new THREE.Box3().setFromObject(clonedScene);
    const scaledCenter = scaledBox.getCenter(new THREE.Vector3());

    // T-pose torso is roughly centered at y=1.1
    clonedScene.position.x -= scaledCenter.x;
    clonedScene.position.z -= scaledCenter.z;
    clonedScene.position.y -= (scaledCenter.y - 1.1);

    clonedScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });

    return clonedScene;
  }, [scene]);

  return <primitive object={preparedGarment} position={[0, 0, 0]} />;
}

function Stage() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <circleGeometry args={[4.5, 64]} />
        <meshStandardMaterial color="#dfd6c8" roughness={0.98} />
      </mesh>
      <gridHelper args={[10, 20, '#d6d3d1', '#e7e5e4']} position={[0, 0.01, 0]} />
    </>
  );
}

export default function ThreeModel({ measurements, outfitConfig, modelUrl }) {
  return (
    <div className="w-full h-[560px] border rounded-lg overflow-hidden bg-stone-50 shadow-inner relative">
      <Canvas camera={{ position: [0, 2.4, 7], fov: 40 }} shadows>
        <color attach="background" args={['#f7f4ee']} />
        <ambientLight intensity={0.95} />
        <directionalLight position={[5, 8, 5]} intensity={1.25} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} />
        <directionalLight position={[-3, 5, -2]} intensity={0.45} />
        <Stage />
        <Suspense fallback={null}>
          {!modelUrl && <RealAvatar measurements={measurements} />}
          {modelUrl ? (
            <GarmentErrorBoundary
              outfitConfig={outfitConfig}
              fallback={null}
            >
              <RemoteGLBGarment modelUrl={modelUrl} />
            </GarmentErrorBoundary>
          ) : outfitConfig ? (
            <GarmentErrorBoundary
              outfitConfig={outfitConfig}
              fallback={<GarmentLayer measurements={measurements} outfitConfig={outfitConfig} />}
            >
              <GLBGarment
                outfitConfig={outfitConfig}
                metrics={buildAvatarMetrics(measurements)}
              />
            </GarmentErrorBoundary>
          ) : (
            <GarmentLayer measurements={measurements} outfitConfig={outfitConfig} />
          )}
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls makeDefault minDistance={4} maxDistance={10} maxPolarAngle={Math.PI / 1.6} />
      </Canvas>
      {!outfitConfig && (
        <div className="absolute top-4 left-4 bg-white/85 px-3 py-1 rounded-full text-xs font-semibold shadow text-stone-600">
          Choose a garment prompt to preview the fitted outfit.
        </div>
      )}
    </div>
  );
}

useGLTF.preload('/models/avatar.glb');
