import { Canvas, useLoader } from '@react-three/fiber';
import { OrbitControls, Environment, useTexture } from '@react-three/drei';
import { Suspense, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

function AvatarWithTexture({ textureUrl }) {
  const texture = textureUrl ? useTexture(textureUrl) : null;

  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1, 1);
  }

  // --- HOW TO USE YOUR .OBJ FILE ---
  // 1. Place your .obj file inside: frontend/public/models/avatar.obj
  // 2. Uncomment the OBJ loader block below!
  // 3. Delete the <mesh><capsuleGeometry/></mesh> return block tightly beneath it.

  const obj = useLoader(OBJLoader, '/models/avatar.obj');
  const clonedObj = useMemo(() => obj.clone(), [obj]);

  useEffect(() => {
    if (clonedObj) {
      clonedObj.traverse((child) => {
        if (child.isMesh) {
          child.material = new THREE.MeshStandardMaterial({
            color: textureUrl ? 0xffffff : 0xc0c0c0,
            map: texture,
            roughness: 0.4,
            metalness: 0.1
          });
        }
      });
    }
  }, [clonedObj, texture, textureUrl]);

  // The scale value handles models exported in different units (e.g. centimeters instead of meters).
  // Adjust this 0.05 value up or down depending on how large your specific model is!
  return <primitive object={clonedObj} scale={0.25} position={[0, -2, 0]} />;

  // return (
  //   <mesh castShadow receiveShadow>
  //     <capsuleGeometry args={[1, 3.5, 4, 32]} />
  //     <meshStandardMaterial 
  //       color={textureUrl ? "#ffffff" : "#c0c0c0"} 
  //       map={texture} 
  //       roughness={0.4} 
  //       metalness={0.1}
  //     />
  //   </mesh>
  // );
}

export default function ThreeModel({ activeTexture }) {
  return (
    <div className="w-full h-[500px] border rounded-lg overflow-hidden bg-gray-50 shadow-inner relative">
      <Canvas camera={{ position: [0, 2, 8], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} castShadow />
        <Suspense fallback={null}>
          <AvatarWithTexture textureUrl={activeTexture} />
          <Environment preset="studio" />
        </Suspense>
        <OrbitControls
          makeDefault
          autoRotate={activeTexture ? false : true}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
          enablePan={true}
        />
      </Canvas>
      {/* Loading Overlay Mock */}
      {!activeTexture && (
        <div className="absolute top-4 left-4 bg-white/80 px-3 py-1 rounded-full text-xs font-semibold shadow text-gray-600">
          Waiting for Design...
        </div>
      )}
    </div>
  );
}
