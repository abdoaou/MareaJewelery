import { useMemo, Suspense } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { Environment, Sparkles, Html, OrbitControls } from '@react-three/drei'
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js'
import * as THREE from 'three'
import LoadingAnimation from './LoadingAnimation'

const BRACELET_MODEL = '/braclet/base.obj'

function LoadingIndicator() {
  return (
    <Html center>
      <LoadingAnimation size="sm" label={false} />
    </Html>
  )
}

function BraceletModel() {
  const obj = useLoader(OBJLoader, BRACELET_MODEL)

  const model = useMemo(() => {
    const clone = obj.clone(true)

    const goldMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#c9a962'),
      metalness: 1,
      roughness: 0.16,
      envMapIntensity: 2.8,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
    })

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh
        mesh.material = goldMaterial
        mesh.castShadow = true
        mesh.receiveShadow = true
      }
    })

    const box = new THREE.Box3().setFromObject(clone)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const scale = 2.4 / maxDim

    clone.scale.setScalar(scale)
    clone.position.sub(center.multiplyScalar(scale))

    return clone
  }, [obj])

  return <primitive object={model} />
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.35} />
      <spotLight
        position={[5, 8, 5]}
        angle={0.3}
        penumbra={1}
        intensity={2.2}
        color="#fff5e0"
        castShadow
      />
      <pointLight position={[-4, 2, -3]} intensity={1.4} color="#c9a962" />
      <pointLight position={[4, -2, 2]} intensity={0.7} color="#e8d5a3" />
      <directionalLight position={[0, 5, -5]} intensity={0.5} color="#ffffff" />

      <BraceletModel />

      <Sparkles
        count={100}
        scale={5}
        size={2}
        speed={0.35}
        opacity={0.55}
        color="#e8d5a3"
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enableZoom={false}
        autoRotate
        autoRotateSpeed={0.6}
        dampingFactor={0.08}
        enableDamping
      />

      <Environment preset="city" />
    </>
  )
}

export default function JewelryScene() {
  return (
    <div className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing">
      <Canvas
        camera={{ position: [0, 0.2, 4], fov: 42 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: 'transparent', touchAction: 'none' }}
      >
        <Suspense fallback={<LoadingIndicator />}>
          <Scene />
        </Suspense>
      </Canvas>
    </div>
  )
}
