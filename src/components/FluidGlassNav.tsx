/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useRef, useState, useEffect, memo } from 'react';
import { Canvas, createPortal, useFrame, useThree, extend } from '@react-three/fiber';
import {
  useFBO,
  MeshTransmissionMaterial,
  Text,
  RoundedBox
} from '@react-three/drei';
import { easing } from 'maath';

interface NavItem {
  label: string;
  link: string;
  icon?: React.ReactNode;
}

interface FluidGlassNavProps {
  navItems: NavItem[];
  onNavigate?: (link: string) => void;
}

export default function FluidGlassNav({ navItems, onNavigate }: FluidGlassNavProps) {
  return (
    <Canvas 
      camera={{ position: [0, 0, 20], fov: 15 }} 
      gl={{ alpha: true }}
      style={{ 
        position: 'absolute', 
        inset: 0, 
        pointerEvents: 'none',
        zIndex: 0
      }}
    >
      <Bar navItems={navItems} onNavigate={onNavigate} />
    </Canvas>
  );
}

const Bar = memo(function Bar({ navItems, onNavigate }: FluidGlassNavProps) {
  const ref = useRef<THREE.Mesh>(null!);
  const buffer = useFBO();
  const { viewport: vp } = useThree();
  const [scene] = useState(() => new THREE.Scene());

  useFrame((state, delta) => {
    const { gl, viewport, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    // Lock to bottom
    const destY = -v.height / 2 + 0.35;
    easing.damp3(ref.current.position, [0, destY, 15], 0.15, delta);

    // Auto-scale based on viewport width
    const scaleX = v.width * 0.95;
    const scaleY = 0.6;
    const scaleZ = 0.2;
    easing.damp3(ref.current.scale, [scaleX, scaleY, scaleZ], 0.15, delta);

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);

    // Transparent background
    gl.setClearColor(0x000000, 0);
  });

  return (
    <>
      {createPortal(<></>, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <RoundedBox 
        ref={ref} 
        args={[1, 1, 0.15]}
        radius={0.05}
        smoothness={8}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          transmission={1}
          roughness={0}
          thickness={0.5}
          ior={1.2}
          chromaticAberration={0.15}
          anisotropy={0.1}
          distortion={0.1}
          distortionScale={0.5}
          temporalDistortion={0.1}
          color="#ffffff"
          attenuationColor="#ffffff"
          attenuationDistance={0.5}
          opacity={0.9}
          transparent
        />
      </RoundedBox>
      <NavItems navItems={navItems} onNavigate={onNavigate} />
    </>
  );
});

function NavItems({ navItems, onNavigate }: FluidGlassNavProps) {
  const group = useRef<THREE.Group>(null!);
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.8, fontSize: 0.12 },
    tablet: { max: 1023, spacing: 0.9, fontSize: 0.13 },
    desktop: { max: Infinity, spacing: 1.0, fontSize: 0.14 }
  };
  
  const getDevice = () => {
    const w = window.innerWidth;
    return w <= DEVICE.mobile.max ? 'mobile' : w <= DEVICE.tablet.max ? 'tablet' : 'desktop';
  };

  const [device, setDevice] = useState(getDevice());

  useEffect(() => {
    const onResize = () => setDevice(getDevice());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { spacing, fontSize } = DEVICE[device];

  useFrame(() => {
    if (!group.current) return;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);
    group.current.position.set(0, -v.height / 2 + 0.35, 15.2);

    group.current.children.forEach((child, i) => {
      child.position.x = (i - (navItems.length - 1) / 2) * spacing;
    });
  });

  const handleNavigate = (link: string) => {
    if (onNavigate) {
      onNavigate(link);
    } else if (link) {
      link.startsWith('#') ? (window.location.hash = link) : (window.location.href = link);
    }
  };

  return (
    <group ref={group} renderOrder={10}>
      {navItems.map(({ label, link }) => (
        <Text
          key={label}
          fontSize={fontSize}
          color="white"
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.004}
          outlineColor="#000000"
          outlineOpacity={0.8}
          renderOrder={10}
          onClick={(e) => {
            e.stopPropagation();
            handleNavigate(link);
          }}
          onPointerOver={() => (document.body.style.cursor = 'pointer')}
          onPointerOut={() => (document.body.style.cursor = 'auto')}
        >
          {label}
        </Text>
      ))}
    </group>
  );
}
