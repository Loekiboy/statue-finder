/* eslint-disable react/no-unknown-property */
import * as THREE from 'three';
import { useRef, useState, useEffect, memo } from 'react';
import { Canvas, createPortal, useFrame, useThree } from '@react-three/fiber';
import {
  useFBO,
  MeshTransmissionMaterial,
  Text
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

  // Create a simple rounded box geometry
  const geometry = new THREE.BoxGeometry(10, 0.8, 0.2, 32, 32, 32);
  
  useFrame((state, delta) => {
    const { gl, viewport, camera } = state;
    const v = viewport.getCurrentViewport(camera, [0, 0, 15]);

    // Lock to bottom
    const destY = -v.height / 2 + 0.2;
    easing.damp3(ref.current.position, [0, destY, 15], 0.15, delta);

    // Auto-scale based on viewport width
    const desiredWidth = v.width * 0.95;
    const scaleX = desiredWidth / 10;
    ref.current.scale.set(scaleX, 0.8, 1);

    gl.setRenderTarget(buffer);
    gl.render(scene, camera);
    gl.setRenderTarget(null);
  });

  return (
    <>
      {createPortal(<></>, scene)}
      <mesh scale={[vp.width, vp.height, 1]}>
        <planeGeometry />
        <meshBasicMaterial map={buffer.texture} transparent />
      </mesh>
      <mesh 
        ref={ref} 
        geometry={geometry}
      >
        <MeshTransmissionMaterial
          buffer={buffer.texture}
          transmission={1}
          roughness={0}
          thickness={10}
          ior={1.15}
          chromaticAberration={0.1}
          anisotropy={0.01}
          color="#ffffff"
          attenuationColor="#ffffff"
          attenuationDistance={0.25}
        />
      </mesh>
      <NavItems navItems={navItems} onNavigate={onNavigate} />
    </>
  );
});

function NavItems({ navItems, onNavigate }: FluidGlassNavProps) {
  const group = useRef<THREE.Group>(null!);
  const { viewport, camera } = useThree();

  const DEVICE = {
    mobile: { max: 639, spacing: 0.5, fontSize: 0.08 },
    tablet: { max: 1023, spacing: 0.6, fontSize: 0.09 },
    desktop: { max: Infinity, spacing: 0.7, fontSize: 0.1 }
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
    group.current.position.set(0, -v.height / 2 + 0.2, 15.1);

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
          outlineWidth={0.002}
          outlineBlur="20%"
          outlineColor="#000"
          outlineOpacity={0.5}
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

