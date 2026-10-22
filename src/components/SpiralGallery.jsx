import { useEffect, useRef } from "react";
import * as THREE from "three";
import Lenis from "lenis";
import { vertexShader, fragmentShader } from "../gallery/shaders";
import { CONFIG } from "../gallery/config";
import "./styles/SpiralGallery.css";

const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

export default function SpiralGallery({ heroTextRef, nextRef }) {
  const galleryRef = useRef(null);
  const spaceRef = useRef(null);

  useEffect(() => {
    const galleryEl = galleryRef.current;
    const scrollSpace = spaceRef.current;
    const heroText = heroTextRef?.current;
    const nextSection = nextRef?.current;
    if (!galleryEl || !scrollSpace) return;

    const lenis = new Lenis({ autoRaf: true });

    const totalTiles = Math.floor(
      CONFIG.tilesPerRevolution * CONFIG.revolutions,
    );
    const angleStep = (Math.PI * 2) / CONFIG.tilesPerRevolution;

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(
      75,
      galleryEl.clientWidth / galleryEl.clientHeight,
      0.1,
      1000,
    );
    camera.position.z = CONFIG.cameraZ;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(galleryEl.clientWidth, galleryEl.clientHeight);
    galleryEl.appendChild(renderer.domElement);

    const textureLoader = new THREE.TextureLoader();
    const textures = Array.from({ length: CONFIG.totalImages }, (_, i) =>
      textureLoader.load(`${import.meta.env.BASE_URL}mami${i + 1}.jpg`, (t) => {
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      }),
    );

    const cameraPositionUniform = {
      value: new THREE.Vector3(0, 0, CONFIG.cameraZ),
    };

    /* ---------- build the spiral ---------- */

    const tileEdgesY = [0];

    for (let i = 0; i < totalTiles; i++) {
      const progress = i / totalTiles;
      const radius =
        CONFIG.startRadius + (CONFIG.endRadius - CONFIG.startRadius) * progress;
      const arcWidth = (2 * Math.PI * radius) / CONFIG.tilesPerRevolution;
      const tileHeight = arcWidth * CONFIG.tileHeightRatio;
      tileEdgesY.push(
        tileEdgesY[i] -
          (tileHeight + CONFIG.spiralGap) / CONFIG.tilesPerRevolution,
      );
    }

    const spiral = new THREE.Group();
    scene.add(spiral);

    const tileMeshes = [];

    for (let i = 0; i < totalTiles; i++) {
      const progress = i / totalTiles;
      const radius =
        CONFIG.startRadius + (CONFIG.endRadius - CONFIG.startRadius) * progress;
      const arcWidth = (2 * Math.PI * radius) / CONFIG.tilesPerRevolution;
      const tileHeight = arcWidth * CONFIG.tileHeightRatio;
      const tileAngle = arcWidth / radius + CONFIG.tileOverlap;

      const centerY = (tileEdgesY[i] + tileEdgesY[i + 1]) / 2;
      const slope = tileEdgesY[i + 1] - tileEdgesY[i];

      const positions = [];
      const uvCoords = [];
      const indices = [];
      const segments = CONFIG.tileSegments;

      for (let row = 0; row <= 1; row++) {
        for (let col = 0; col <= segments; col++) {
          const angle = (col / segments - 0.5) * tileAngle;
          positions.push(
            Math.sin(angle) * radius,
            (row - 0.5) * tileHeight + (col / segments - 0.5) * slope,
            Math.cos(angle) * radius,
          );
          uvCoords.push(col / segments, row);
        }
      }

      for (let col = 0; col < segments; col++) {
        const current = col;
        const below = current + segments + 1;
        indices.push(
          current,
          below,
          current + 1,
          below,
          below + 1,
          current + 1,
        );
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      geometry.setAttribute(
        "uv",
        new THREE.Float32BufferAttribute(uvCoords, 2),
      );
      geometry.setIndex(indices);
      geometry.computeVertexNormals();

      const material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uMap: { value: textures[i % CONFIG.totalImages] },
          uCameraPosition: cameraPositionUniform,
          uHover: { value: 0 },
        },
        side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = centerY;
      mesh.userData.hover = 0;
      tileMeshes.push(mesh);

      const tile = new THREE.Group();
      tile.rotation.y = i * angleStep;
      tile.add(mesh);
      spiral.add(tile);
    }

    const spiralHeight = Math.abs(tileEdgesY[totalTiles]);

    /* ---------- parallax hand-off ---------- */

    let handoffScroll = 0;

    // scroll position where the top edge of the spiral reaches the top of the
    // viewport; the next section starts rising at exactly that scroll value
    function computeHandoff() {
      const vh = window.innerHeight;
      const canvasH = galleryEl.clientHeight;
      const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
      const depth = camera.position.z - CONFIG.startRadius;
      const topY =
        (((2 * Math.PI * CONFIG.startRadius) / CONFIG.tilesPerRevolution) *
          CONFIG.tileHeightRatio) /
        2;

      let s = 0;
      const maxS = vh * CONFIG.scrollMultiplier;
      for (; s < maxS; s += 2) {
        const p = Math.min(s / (vh * CONFIG.scrollMultiplier), 1);
        const camY = -(p * spiralHeight * CONFIG.cameraYMultiplier);
        const ndcY = (topY - camY) / (depth * tanHalfFov);
        const topInViewport = ((1 - ndcY) / 2) * canvasH - s;
        if (topInViewport <= 0) break;
      }

      handoffScroll = s + CONFIG.handoffOffset * vh;
      scrollSpace.style.height = `${handoffScroll + vh}px`;
    }
    computeHandoff();

    /* ---------- scroll + mouse ---------- */

    let scrollY = window.pageYOffset;
    let spinVelocity = 0;

    lenis.on("scroll", (e) => {
      scrollY = window.pageYOffset;
      spinVelocity = e.velocity * CONFIG.scrollRotationMultiplier;
    });

    let mouseX = 0,
      mouseY = 0,
      smoothX = 0,
      smoothY = 0;
    let clientX = 0,
      clientY = 0,
      hasMouse = false;

    const onMouseMove = (e) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
      clientX = e.clientX;
      clientY = e.clientY;
      hasMouse = true;
    };
    const onMouseLeave = () => {
      hasMouse = false;
    };

    window.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseleave", onMouseLeave);

    let isMobile = window.innerWidth < 1000;

    /* ---------- hover pop-out ---------- */

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    function updateHover() {
      let hit = null;

      if (hasMouse && !isMobile) {
        const rect = renderer.domElement.getBoundingClientRect();
        const coverTop = nextSection
          ? nextSection.getBoundingClientRect().top
          : Infinity;
        const inside =
          clientX >= rect.left &&
          clientX <= rect.right &&
          clientY >= rect.top &&
          clientY <= rect.bottom;

        if (inside && clientY < coverTop) {
          pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
          pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
          raycaster.setFromCamera(pointer, camera);
          const hits = raycaster.intersectObjects(tileMeshes, false);
          if (hits.length) hit = hits[0].object;
        }
      }

      for (const mesh of tileMeshes) {
        const target = mesh === hit ? 1 : 0;
        mesh.userData.hover +=
          (target - mesh.userData.hover) * CONFIG.hoverSmoothing;
        const h = mesh.userData.hover;
        mesh.scale.setScalar(1 + h * CONFIG.hoverScale);
        mesh.material.uniforms.uHover.value = h;
      }
    }

    /* ---------- loop ---------- */

    let rafId;

    function animate() {
      rafId = requestAnimationFrame(animate);

      const vh = window.innerHeight;

      const progress = Math.min(scrollY / (vh * CONFIG.scrollMultiplier), 1);
      camera.position.y +=
        (-(progress * spiralHeight * CONFIG.cameraYMultiplier) -
          camera.position.y) *
        CONFIG.cameraSmoothing;

      // 0 -> 1 while the next section travels up over the fixed hero
      const exit = clamp((scrollY - handoffScroll) / vh, 0, 1);

      const galleryShift =
        scrollY <= handoffScroll
          ? scrollY
          : handoffScroll +
            (scrollY - handoffScroll) * CONFIG.galleryExitSpeed;
      galleryEl.style.transform = `translate3d(0, ${-galleryShift}px, 0)`;
      galleryEl.style.visibility = exit >= 1 ? "hidden" : "visible";

      if (heroText) heroText.style.opacity = 1 - exit * 0.6;

      if (!isMobile) {
        smoothX += (mouseX - smoothX) * 0.02;
        smoothY += (mouseY - smoothY) * 0.02;
        spiral.rotation.x = smoothY * CONFIG.parallaxStrength;
        spiral.rotation.z = -smoothX * CONFIG.parallaxStrength * 0.3;
      }

      cameraPositionUniform.value.copy(camera.position);

      spiral.rotation.y += CONFIG.baseRotationSpeed + spinVelocity;
      spinVelocity *= CONFIG.rotationDecay;

      if (exit < 1) {
        renderer.render(scene, camera);
        updateHover();
      }
    }

    animate();

    const onResize = () => {
      isMobile = window.innerWidth < 1000;
      camera.aspect = galleryEl.clientWidth / galleryEl.clientHeight;
      camera.position.z = isMobile ? 15 : CONFIG.cameraZ;
      camera.updateProjectionMatrix();
      renderer.setSize(galleryEl.clientWidth, galleryEl.clientHeight);
      computeHandoff();
    };
    window.addEventListener("resize", onResize);

    /* ---------- cleanup (StrictMode / hot reload safe) ---------- */

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("resize", onResize);
      lenis.destroy();

      scene.traverse((obj) => {
        if (obj.isMesh) {
          obj.geometry.dispose();
          obj.material.dispose();
        }
      });
      textures.forEach((t) => t.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, [heroTextRef, nextRef]);

  return (
    <>
      <div className="gallery" ref={galleryRef} />
      <div className="scroll-space" ref={spaceRef} />
    </>
  );
}