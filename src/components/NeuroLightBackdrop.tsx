import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

type NeuroLightBackdropProps = {
  visible: boolean;
};

function disposeMaterial(material: THREE.Material | THREE.Material[]) {
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  material.dispose();
}

function disposeSceneObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
    if (!mesh.isMesh) return;
    mesh.geometry.dispose();
    disposeMaterial(mesh.material);
  });
}

function computeRenderableWorldCenter(object: THREE.Object3D) {
  const bounds = new THREE.Box3();
  const temp = new THREE.Box3();
  let hasGeometry = false;

  object.updateMatrixWorld(true);
  object.traverse((child) => {
    const target = child as THREE.Mesh<THREE.BufferGeometry> & THREE.Points<THREE.BufferGeometry>;
    const isRenderable = target.isMesh || target.isPoints;
    if (!isRenderable || !target.geometry) return;

    const geometry = target.geometry;
    if (!geometry.boundingBox) geometry.computeBoundingBox();
    if (!geometry.boundingBox) return;

    temp.copy(geometry.boundingBox);
    temp.applyMatrix4(target.matrixWorld);
    if (!Number.isFinite(temp.min.x) || !Number.isFinite(temp.max.x)) return;

    if (!hasGeometry) {
      bounds.copy(temp);
      hasGeometry = true;
      return;
    }
    bounds.union(temp);
  });

  return hasGeometry ? bounds.getCenter(new THREE.Vector3()) : null;
}

export default function NeuroLightBackdrop({ visible }: NeuroLightBackdropProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const [loadDeferredScene, setLoadDeferredScene] = useState(false);

  useEffect(() => {
    if (!visible || loadDeferredScene) return;

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let idleId: number | null = null;
    const startLoading = () => setLoadDeferredScene(true);

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(startLoading, { timeout: 2400 });
    } else {
      timeoutId = setTimeout(startLoading, 1400);
    }

    return () => {
      if (idleId !== null && 'cancelIdleCallback' in window) {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [visible, loadDeferredScene]);

  useEffect(() => {
    if (!loadDeferredScene) return;
    const container = containerRef.current;
    if (!container) return;

    const isMobile = window.matchMedia('(max-width: 820px)').matches;
    const modelUrl = `${import.meta.env.BASE_URL}projects/brain_point_cloud.glb`;
    const preferPointsOnly = /brain_point_cloud\.glb$/i.test(modelUrl);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: !isMobile,
      powerPreference: 'high-performance',
    });
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.1 : 1.6));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = isMobile ? 0.84 : 0.9;
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);
    const modelPivot = new THREE.Group();
    root.add(modelPivot);

    const ambient = new THREE.AmbientLight(0xffffff, 0.32);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0xaec8ff, 15, 34, 2);
    keyLight.position.set(3.6, 1.8, 6.5);
    scene.add(keyLight);

    const fillLight = new THREE.PointLight(0x7bb8ff, 7, 28, 2);
    fillLight.position.set(-4.2, -1.4, 4.2);
    scene.add(fillLight);

    const rimLight = new THREE.PointLight(0x5a84ff, 10, 30, 2);
    rimLight.position.set(-5.8, 2.2, -4.8);
    scene.add(rimLight);

    const backGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        color: 0x84a6ff,
        opacity: 0.035,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    backGlow.scale.set(isMobile ? 4.4 : 5.8, isMobile ? 4.4 : 5.8, 1);
    backGlow.position.set(0, 0.15, -1.8);
    root.add(backGlow);

    let model: THREE.Object3D | null = null;
    let fallbackMesh: THREE.Mesh | null = null;
    let disposed = false;

    const fitModel = (brain: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(brain);
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z, 0.001);
      const target = isMobile ? 3.47 : 4.27;
      const scale = target / maxDim;

      brain.scale.setScalar(scale);
      brain.position.set(0, 0, 0);

      const worldCenter = computeRenderableWorldCenter(brain);
      if (worldCenter) {
        const localCenter = brain.parent ? brain.parent.worldToLocal(worldCenter.clone()) : worldCenter;
        brain.position.sub(localCenter);
      }
      brain.updateMatrixWorld(true);
    };

    const stylizeModel = (brain: THREE.Object3D) => {
      brain.traverse((child) => {
        const line = child as THREE.Line<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
        const lineLike = line.isLine || (child as THREE.Object3D & { isLineSegments?: boolean }).isLineSegments || (line as THREE.LineLoop).isLineLoop;
        if (lineLike) {
          line.visible = false;
          return;
        }

        const mesh = child as THREE.Mesh<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
        if (mesh.isMesh) {
          if (preferPointsOnly) {
            mesh.visible = false;
            return;
          }
          const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materialList.forEach((material) => {
            if (material instanceof THREE.MeshStandardMaterial) {
              material.roughness = Math.max(material.roughness, 0.72);
              material.metalness = Math.min(material.metalness, 0.03);
              material.wireframe = false;
              material.color.setRGB(0.62, 0.76, 0.9);
              material.emissive.setHex(0x1e3450);
              material.emissiveIntensity = 0.02;
            }
          });
          return;
        }

        const points = child as THREE.Points<THREE.BufferGeometry, THREE.Material | THREE.Material[]>;
        if (points.isPoints) {
          const materialList = Array.isArray(points.material) ? points.material : [points.material];
          materialList.forEach((material) => {
            if (material instanceof THREE.PointsMaterial) {
              material.color.setRGB(0.47, 0.66, 0.9);
              material.opacity = Math.min(material.opacity ?? 1, 0.62);
              material.transparent = true;
            }
          });
        }
      });
    };

    const fallback = () => {
      const geometry = new THREE.IcosahedronGeometry(1.5, 4);
      const material = new THREE.MeshStandardMaterial({
        color: 0x9ab7d9,
        roughness: 0.72,
        metalness: 0.02,
        emissive: new THREE.Color(0x1e3450),
        emissiveIntensity: 0.03,
      });
      fallbackMesh = new THREE.Mesh(geometry, material);
      modelPivot.add(fallbackMesh);
    };

    const loader = new GLTFLoader();
    loader.load(
      modelUrl,
      (gltf) => {
        if (disposed) return;
        model = gltf.scene;
        stylizeModel(model);
        fitModel(model);
        modelPivot.add(model);
      },
      undefined,
      () => {
        if (disposed) return;
        fallback();
      },
    );

    const resize = () => {
      const width = Math.max(container.clientWidth, 1);
      const height = Math.max(container.clientHeight, 1);
      camera.aspect = width / height;
      camera.position.set(0, 0.22, width < height ? 12.8 : 10.4);
      camera.lookAt(0, 0, 0);
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();

    const clock = new THREE.Clock();
    let rafId = 0;
    const animate = () => {
      const elapsed = clock.getElapsedTime();
      const spinAngle = elapsed * 0.14;
      root.position.x = 0;
      root.position.y = 0;
      root.rotation.set(0, 0, 0);
      modelPivot.rotation.set(0, spinAngle + Math.PI * 0.15, 0);
      (backGlow.material as THREE.SpriteMaterial).opacity = 0.028 + Math.sin(elapsed * 0.28) * 0.007;

      if (visibleRef.current) {
        renderer.render(scene, camera);
      }

      rafId = window.requestAnimationFrame(animate);
    };
    animate();

    window.addEventListener('resize', resize);

    return () => {
      disposed = true;
      window.removeEventListener('resize', resize);
      if (rafId) window.cancelAnimationFrame(rafId);

      // dispose all scene objects (lights, meshes, sprites, model)
      disposeSceneObject(scene);
      scene.traverse((child) => {
        if (child instanceof THREE.Sprite) {
          child.material.dispose();
          if (child.material.map) child.material.map.dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [loadDeferredScene]);

  return <div className={`neuro-light-backdrop${visible ? ' is-visible' : ''}`} aria-hidden="true" ref={containerRef} />;
}
