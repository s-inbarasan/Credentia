import React, { useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';

interface ThreeBackgroundProps {
  isWarping?: boolean;
  pulseIntensity?: number;
}

export const ThreeBackground: React.FC<ThreeBackgroundProps> = ({ 
  isWarping = false,
  pulseIntensity = 1
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);
  const linesRef = useRef<THREE.LineSegments | null>(null);

  const particleCount = 500;
  const positions = useMemo(() => new Float32Array(particleCount * 3), []);
  const velocities = useMemo(() => new Float32Array(particleCount * 3), []);

  const isWarpingRef = useRef(isWarping);
  useEffect(() => {
    isWarpingRef.current = isWarping;
  }, [isWarping]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    camera.position.z = 500;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Particles setup
    const geometry = new THREE.BufferGeometry();
    const particleCount = 1000;
    const positionsArray = new Float32Array(particleCount * 3);
    const velocitiesArray = new Float32Array(particleCount * 3);
    const sizesArray = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      positionsArray[i * 3] = (Math.random() - 0.5) * 1200;
      positionsArray[i * 3 + 1] = (Math.random() - 0.5) * 1200;
      positionsArray[i * 3 + 2] = (Math.random() - 0.5) * 1200;

      velocitiesArray[i * 3] = (Math.random() - 0.5) * 0.2;
      velocitiesArray[i * 3 + 1] = (Math.random() - 0.5) * 0.2;
      velocitiesArray[i * 3 + 2] = (Math.random() - 0.5) * 0.2;
      
      sizesArray[i] = Math.random() * 2 + 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positionsArray, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizesArray, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      color: 0x00f2ff,
      transparent: true,
      opacity: 0.4,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);
    particlesRef.current = particles;

    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    let time = 0;
    const animate = () => {
      time += 0.002;
      const positionsAttr = geometry.attributes.position as THREE.BufferAttribute;

      if (!isWarpingRef.current) {
        // Slow rotation for soothing effect
        particles.rotation.y += 0.001;
        particles.rotation.x += 0.0005;
        
        // Subtle camera drift
        camera.position.x = Math.sin(time * 0.4) * 80;
        camera.position.y = Math.cos(time * 0.2) * 80;
        camera.lookAt(0, 0, 0);
      }

      for (let i = 0; i < particleCount; i++) {
        const ix = i * 3;
        const iy = i * 3 + 1;
        const iz = i * 3 + 2;

        if (isWarpingRef.current) {
          // Warp Speed Effect
          positionsAttr.array[iz] += 15;
          if (positionsAttr.array[iz] > 500) {
            positionsAttr.array[iz] = -500;
            positionsAttr.array[ix] = (Math.random() - 0.5) * 1000;
            positionsAttr.array[iy] = (Math.random() - 0.5) * 1000;
          }
          // Reset rotation during warp
          particles.rotation.set(0, 0, 0);
        } else {
          // Soothing Floating Effect with subtle wave
          positionsAttr.array[ix] += velocitiesArray[ix] + Math.sin(time + i) * 0.05;
          positionsAttr.array[iy] += velocitiesArray[iy] + Math.cos(time + i) * 0.05;
          positionsAttr.array[iz] += velocitiesArray[iz];

          // Boundary check with smooth wrap
          if (Math.abs(positionsAttr.array[ix]) > 600) positionsAttr.array[ix] *= -0.99;
          if (Math.abs(positionsAttr.array[iy]) > 600) positionsAttr.array[iy] *= -0.99;
          if (Math.abs(positionsAttr.array[iz]) > 600) positionsAttr.array[iz] *= -0.99;
        }
      }

      // Breathing opacity
      if (!isWarpingRef.current) {
        material.opacity = 0.3 + Math.sin(time * 2) * 0.1;
      } else {
        material.opacity = 0.8;
      }

      positionsAttr.needsUpdate = true;
      renderer.render(scene, camera);
      requestRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className="fixed inset-0 pointer-events-none z-[-1] bg-black"
      style={{ background: 'radial-gradient(circle at center, #001a1a 0%, #000000 100%)' }}
    />
  );
};
