import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

// 12 Realistic Donors & 5 Shelters in abstract coordinate space
const DONOR_NODES = [
  { id: 'd1', name: 'Metro Bistro & Bakery', x: -6.5, z: -3.5, type: 'Prepared Meals' },
  { id: 'd2', name: 'Grand Plaza Banquets', x: -4.0, z: -6.0, type: 'Event Buffet' },
  { id: 'd3', name: 'Spice Route Kitchen', x: -1.5, z: -2.5, type: 'Dal & Rice' },
  { id: 'd4', name: 'Daily Bakehouse', x: 2.0, z: -5.5, type: 'Fresh Breads' },
  { id: 'd5', name: 'Saffron Caterers', x: 5.5, z: -3.0, type: 'Dinner Trays' },
  { id: 'd6', name: 'Greenleaf Cafe', x: -6.0, z: 2.0, type: 'Salads & Wraps' },
  { id: 'd7', name: 'Urban Tandoor', x: -3.0, z: 4.5, type: 'Hot Rotis' },
  { id: 'd8', name: 'Harvest Bowl Kitchen', x: 0.5, z: 1.5, type: 'Wholesome Bowls' },
  { id: 'd9', name: 'City Banquet Hall', x: 4.5, z: 2.5, type: 'Event Surplus' },
  { id: 'd10', name: 'Taj Sweets & Snacks', x: 6.5, z: 5.0, type: 'Snacks & Breads' },
  { id: 'd11', name: 'Kaveri Pure Veg Kitchen', x: -1.0, z: -6.5, type: 'Pure Veg Meals' },
  { id: 'd12', name: 'Northwind Hotel Pantry', x: 3.5, z: -1.5, type: 'Breakfast Packs' },
];

const SHELTER_NODES = [
  { id: 's1', name: 'Hope Shelter Community Kitchen', x: -4.5, z: 0.5, capacity: '60 meals' },
  { id: 's2', name: 'Gurudwara Seva Rasoi', x: -1.0, z: 5.5, capacity: '120 meals' },
  { id: 's3', name: 'Night Care Ward 14', x: 3.0, z: 4.0, capacity: '45 meals' },
  { id: 's4', name: 'Anand Seva Home', x: -3.5, z: -3.0, capacity: '80 meals' },
  { id: 's5', name: 'East Side Meal Annex', x: 5.0, z: -1.0, capacity: '50 meals' },
];

const ACTIVE_MATCH_SCENARIOS = [
  {
    donorIdx: 0, // Metro Bistro
    shelterIdx: 0, // Hope Shelter
    score: 96,
    breakdown: 'Demand 35 • Urgency 25 • Proximity 20 • Storage 20',
    distance: '2.4 km',
    eta: '12 mins',
  },
  {
    donorIdx: 4, // Saffron Caterers
    shelterIdx: 4, // East Side Meal Annex
    score: 98,
    breakdown: 'Demand 35 • Urgency 25 • Proximity 20 • Storage 20',
    distance: '1.8 km',
    eta: '9 mins',
  },
  {
    donorIdx: 2, // Spice Route Kitchen
    shelterIdx: 1, // Gurudwara Seva Rasoi
    score: 92,
    breakdown: 'Demand 35 • Urgency 22 • Proximity 18 • Storage 20',
    distance: '3.1 km',
    eta: '14 mins',
  },
  {
    donorIdx: 6, // Urban Tandoor
    shelterIdx: 2, // Night Care Ward 14
    score: 95,
    breakdown: 'Demand 34 • Urgency 25 • Proximity 19 • Storage 20',
    distance: '2.8 km',
    eta: '11 mins',
  },
  {
    donorIdx: 3, // Daily Bakehouse
    shelterIdx: 3, // Anand Seva Home
    score: 90,
    breakdown: 'Demand 32 • Urgency 20 • Proximity 20 • Storage 18',
    distance: '3.5 km',
    eta: '16 mins',
  },
];

export default function Hero3DCanvas() {
  const mountRef = useRef(null);
  const [activeMatch, setActiveMatch] = useState(ACTIVE_MATCH_SCENARIOS[0]);
  const [badgePos, setBadgePos] = useState({ x: 0, y: 0, visible: false });
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    // 1. Accessibility & Hardware Capability Check
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setIsSupported(false);
      return;
    }

    const testCanvas = document.createElement('canvas');
    const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
    if (!gl) {
      setIsSupported(false);
      return;
    }

    const container = mountRef.current;
    if (!container) return;

    let width = container.clientWidth || 560;
    let height = container.clientHeight || 420;

    // 2. Three.js Scene, Camera & Renderer
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(14, 16, 18);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    // DPR capped at 1.5 strictly per performance requirements
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    container.appendChild(renderer.domElement);

    // 3. Warm Ambient & Directional Lighting
    const ambientLight = new THREE.AmbientLight(0xfff7ed, 1.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xfff1e6, 1.6);
    dirLight.position.set(12, 20, 10);
    scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0xe8f0ea, 0.8);
    fillLight.position.set(-10, 12, -10);
    scene.add(fillLight);

    // 4. Stylised Warm City Grid Plane
    const gridGroup = new THREE.Group();
    scene.add(gridGroup);

    // Subtle base plane
    const planeGeo = new THREE.PlaneGeometry(24, 24);
    const planeMat = new THREE.MeshBasicMaterial({
      color: 0xf5eee3,
      transparent: true,
      opacity: 0.6,
    });
    const basePlane = new THREE.Mesh(planeGeo, planeMat);
    basePlane.rotation.x = -Math.PI / 2;
    basePlane.position.y = -0.02;
    gridGroup.add(basePlane);

    // Grid lines
    const gridHelper = new THREE.GridHelper(22, 22, 0xd0c2ad, 0xe2d6c5);
    gridHelper.position.y = 0.01;
    gridGroup.add(gridHelper);

    // 5. Abstract Stylised Low-Rise Isometric Buildings
    const buildingsGroup = new THREE.Group();
    scene.add(buildingsGroup);

    const buildingMatA = new THREE.MeshLambertMaterial({ color: 0xf4eee4 });
    const buildingMatB = new THREE.MeshLambertMaterial({ color: 0xe8dfd2 });

    const buildingLayouts = [
      { x: -5, z: -5, w: 1.8, h: 0.9, d: 1.6 },
      { x: -2, z: -4, w: 1.4, h: 1.4, d: 1.4 },
      { x: 3, z: -4, w: 2.0, h: 0.7, d: 1.6 },
      { x: 5, z: -5, w: 1.6, h: 1.2, d: 1.5 },
      { x: -7, z: 0, w: 1.5, h: 0.8, d: 2.0 },
      { x: -3, z: 1, w: 1.6, h: 1.5, d: 1.4 },
      { x: 2, z: 0, w: 1.8, h: 1.1, d: 1.8 },
      { x: 6, z: 1, w: 1.4, h: 0.6, d: 1.6 },
      { x: -5, z: 4, w: 1.6, h: 1.3, d: 1.6 },
      { x: 1, z: 4, w: 2.2, h: 0.8, d: 1.5 },
      { x: 4, z: 5, w: 1.5, h: 1.0, d: 1.7 },
      { x: -1, z: -1, w: 1.4, h: 0.5, d: 1.4 },
    ];

    buildingLayouts.forEach((b) => {
      const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
      const mesh = new THREE.Mesh(geo, Math.random() > 0.5 ? buildingMatA : buildingMatB);
      mesh.position.set(b.x, b.h / 2, b.z);
      buildingsGroup.add(mesh);
    });

    // 6. Donor Nodes (~12 nodes in terracotta palette)
    const donorGroup = new THREE.Group();
    scene.add(donorGroup);

    const donorGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.5, 16);
    const donorMat = new THREE.MeshLambertMaterial({ color: 0xc44824 }); // Terracotta mark

    const donorHaloMat = new THREE.MeshBasicMaterial({
      color: 0xc44824,
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
    });
    const donorHaloGeo = new THREE.RingGeometry(0.38, 0.62, 24);

    DONOR_NODES.forEach((d) => {
      const mesh = new THREE.Mesh(donorGeo, donorMat);
      mesh.position.set(d.x, 0.25, d.z);
      donorGroup.add(mesh);

      const halo = new THREE.Mesh(donorHaloGeo, donorHaloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(d.x, 0.03, d.z);
      donorGroup.add(halo);
    });

    // 7. Shelter Nodes (~5 nodes in forest green palette)
    const shelterGroup = new THREE.Group();
    scene.add(shelterGroup);

    const shelterGeo = new THREE.CylinderGeometry(0.42, 0.46, 0.75, 16);
    const shelterMat = new THREE.MeshLambertMaterial({ color: 0x1f6f43 }); // Forest green

    const shelterHaloMat = new THREE.MeshBasicMaterial({
      color: 0x1f6f43,
      transparent: true,
      opacity: 0.28,
      side: THREE.DoubleSide,
    });
    const shelterHaloGeo = new THREE.RingGeometry(0.55, 0.88, 24);

    SHELTER_NODES.forEach((s) => {
      const mesh = new THREE.Mesh(shelterGeo, shelterMat);
      mesh.position.set(s.x, 0.38, s.z);
      shelterGroup.add(mesh);

      const halo = new THREE.Mesh(shelterHaloGeo, shelterHaloMat);
      halo.rotation.x = -Math.PI / 2;
      halo.position.set(s.x, 0.03, s.z);
      shelterGroup.add(halo);
    });

    // 8. Dynamic Animated 3D Arc & Score Breakdown
    let currentScenarioIdx = 0;
    let arcProgress = 0; // 0 to 1
    let arcPhase = 'drawing'; // 'drawing' | 'holding' | 'fading'
    let arcHoldTimer = 0;

    let arcLineMesh = null;
    let currentCurve = null;

    const createArcCurve = (dIdx, sIdx) => {
      const donor = DONOR_NODES[dIdx];
      const shelter = SHELTER_NODES[sIdx];
      const start = new THREE.Vector3(donor.x, 0.5, donor.z);
      const end = new THREE.Vector3(shelter.x, 0.75, shelter.z);
      const midX = (start.x + end.x) / 2;
      const midZ = (start.z + end.z) / 2;
      const dist = start.distanceTo(end);
      const peakY = Math.max(3.0, dist * 0.65);
      const control = new THREE.Vector3(midX, peakY, midZ);

      return new THREE.QuadraticBezierCurve3(start, control, end);
    };

    const buildArcGeometry = (curve, progress) => {
      const pointsCount = Math.max(8, Math.floor(64 * progress));
      const points = [];
      for (let i = 0; i <= pointsCount; i++) {
        const t = (i / pointsCount) * progress;
        points.push(curve.getPoint(t));
      }
      return new THREE.BufferGeometry().setFromPoints(points);
    };

    const arcMaterial = new THREE.LineBasicMaterial({
      color: 0xc44824,
      linewidth: 3,
      transparent: true,
      opacity: 0.95,
    });

    currentCurve = createArcCurve(
      ACTIVE_MATCH_SCENARIOS[0].donorIdx,
      ACTIVE_MATCH_SCENARIOS[0].shelterIdx
    );
    const initialGeo = buildArcGeometry(currentCurve, 0.01);
    arcLineMesh = new THREE.Line(initialGeo, arcMaterial);
    scene.add(arcLineMesh);

    // 9. Mouse Parallax Damping
    let targetRotationY = 0;
    let currentRotationY = 0;
    let targetRotationX = 0;
    let currentRotationX = 0;

    const handleMouseMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.12;
      targetRotationX = y * 0.08;
    };

    container.addEventListener('mousemove', handleMouseMove);

    // 10. IntersectionObserver: Pause Rendering when Offscreen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.1 }
    );
    observer.observe(container);

    // 11. Animation Render Loop
    let animationFrameId = null;
    let lastTime = performance.now();

    const animate = (currentTime) => {
      animationFrameId = requestAnimationFrame(animate);

      if (!isVisible) return; // Saves GPU/battery when offscreen

      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Parallax smooth interpolation
      currentRotationY += (targetRotationY - currentRotationY) * 0.05;
      currentRotationX += (targetRotationX - currentRotationX) * 0.05;

      camera.position.x = 14 + Math.sin(currentRotationY) * 3;
      camera.position.y = 16 + currentRotationX * 3;
      camera.lookAt(0, 0.5, 0);

      // Arc progress lifecycle
      if (arcPhase === 'drawing') {
        arcProgress += delta * 1.25;
        if (arcProgress >= 1) {
          arcProgress = 1;
          arcPhase = 'holding';
          arcHoldTimer = 0;
        }
      } else if (arcPhase === 'holding') {
        arcHoldTimer += delta;
        if (arcHoldTimer >= 2.8) {
          arcPhase = 'fading';
        }
      } else if (arcPhase === 'fading') {
        arcProgress -= delta * 1.8;
        if (arcProgress <= 0) {
          arcProgress = 0.01;
          arcPhase = 'drawing';
          currentScenarioIdx = (currentScenarioIdx + 1) % ACTIVE_MATCH_SCENARIOS.length;
          const nextMatch = ACTIVE_MATCH_SCENARIOS[currentScenarioIdx];
          setActiveMatch(nextMatch);
          currentCurve = createArcCurve(nextMatch.donorIdx, nextMatch.shelterIdx);
        }
      }

      // Update arc line geometry
      if (arcLineMesh && currentCurve) {
        arcLineMesh.geometry.dispose();
        arcLineMesh.geometry = buildArcGeometry(currentCurve, Math.max(0.01, arcProgress));
        arcMaterial.opacity = Math.min(1, arcProgress * 1.2);
      }

      // Calculate 2D position for 3D Floating Score Badge
      if (currentCurve && container) {
        const midPoint = currentCurve.getPoint(0.5);
        const screenPos = midPoint.clone().project(camera);

        const x = (screenPos.x * 0.5 + 0.5) * width;
        const y = (-(screenPos.y * 0.5) + 0.5) * height - 28;

        setBadgePos({
          x: Math.round(x),
          y: Math.round(y),
          visible: arcProgress > 0.4 && arcPhase !== 'fading',
        });
      }

      renderer.render(scene, camera);
    };

    animationFrameId = requestAnimationFrame(animate);

    // 12. Responsive Resize Handler
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 560;
      height = container.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    };

    window.addEventListener('resize', handleResize);

    // 13. Resource Disposal Cleanup
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousemove', handleMouseMove);

      if (animationFrameId) cancelAnimationFrame(animationFrameId);

      planeGeo.dispose();
      planeMat.dispose();
      gridHelper.dispose();
      buildingMatA.dispose();
      buildingMatB.dispose();
      donorGeo.dispose();
      donorMat.dispose();
      donorHaloGeo.dispose();
      donorHaloMat.dispose();
      shelterGeo.dispose();
      shelterMat.dispose();
      shelterHaloGeo.dispose();
      shelterHaloMat.dispose();
      arcMaterial.dispose();
      if (arcLineMesh) arcLineMesh.geometry.dispose();

      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  if (!isSupported) {
    return null; // Graceful fallback
  }

  const currentDonor = DONOR_NODES[activeMatch.donorIdx];
  const currentShelter = SHELTER_NODES[activeMatch.shelterIdx];

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '420px',
        backgroundColor: '#FAF4EB',
        borderRadius: 'var(--radius-card)',
        border: '1px solid var(--color-soft-border)',
        boxShadow: '4px 6px 0px var(--color-card-bevel)',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* 3D Canvas Mount Point */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          touchAction: 'pan-y',
          cursor: 'grab',
        }}
      />

      {/* Floating 3D Match Pill Badge */}
      {badgePos.visible && (
        <div
          style={{
            position: 'absolute',
            left: `${badgePos.x}px`,
            top: `${badgePos.y}px`,
            transform: 'translate(-50%, -100%)',
            pointerEvents: 'none',
            zIndex: 10,
            animation: 'badgeFadeIn 0.25s ease-out forwards',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFDF9',
              border: '1.5px solid var(--color-terracotta)',
              borderRadius: '12px',
              padding: '0.45rem 0.85rem',
              boxShadow: '0 4px 12px rgba(196, 72, 36, 0.25)',
              whiteSpace: 'nowrap',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.15rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  backgroundColor: 'var(--color-terracotta)',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '6px',
                }}
              >
                {activeMatch.score}% Match
              </span>
              <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--color-coffee-dark)' }}>
                {activeMatch.eta} (~{activeMatch.distance})
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--color-muted-slate)', marginTop: '0.1rem' }}>
              {activeMatch.breakdown}
            </div>
          </div>
        </div>
      )}

      {/* Top Legend Overlay */}
      <div
        style={{
          position: 'absolute',
          top: '0.85rem',
          left: '1rem',
          right: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          pointerEvents: 'none',
          zIndex: 5,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-terracotta)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-coffee-dark)' }}>
              12 Donors
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-forest-green)',
                display: 'inline-block',
              }}
            />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-coffee-dark)' }}>
              5 Shelters
            </span>
          </div>
        </div>

        <div
          style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            color: 'var(--color-muted-slate)',
            backgroundColor: '#FFFDF9',
            padding: '0.2rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid var(--color-soft-border)',
            boxShadow: '0 1px 0 var(--color-card-bevel)',
          }}
        >
          Interactive City Grid (Abstract)
        </div>
      </div>

      {/* Bottom Route Status Bar */}
      <div
        style={{
          position: 'absolute',
          bottom: '0.85rem',
          left: '1rem',
          right: '1rem',
          backgroundColor: '#FFFDF9',
          padding: '0.5rem 0.85rem',
          borderRadius: '10px',
          border: '1px solid var(--color-soft-border)',
          boxShadow: '0 2px 0 var(--color-card-bevel)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.76rem',
          zIndex: 5,
          pointerEvents: 'none',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <strong style={{ color: 'var(--color-terracotta)' }}>{currentDonor.name}</strong>
          <span style={{ color: 'var(--color-muted-slate)' }}>&rarr;</span>
          <strong style={{ color: 'var(--color-forest-green)' }}>{currentShelter.name}</strong>
        </div>
        <div style={{ color: 'var(--color-muted-slate)', fontSize: '0.72rem' }}>
          Intake: <strong>{currentShelter.capacity}</strong> • Food: <strong>{currentDonor.type}</strong>
        </div>
      </div>
    </div>
  );
}

