// Khung nhìn 3D của Am Mây (Three.js r128, WebGL). Mọi mô hình dựng từ khối
// hình học trong code, không có tệp 3D. Logic game vẫn chạy trên mặt bằng
// 360×640 của world.js; ở đây 1 đơn vị 3D = 10 điểm mặt bằng.
// Kéo để xoay quanh am, chụm hai ngón (hoặc lăn chuột) để gần/xa, chạm để đi.

import { MODEL_SLOTS } from "./assets.js";
import { TUNING } from "./tuning.js";
import { CUSHIONS, HOTSPOTS, LAYOUT, hitTest, zoneOf } from "./world.js";

const U = 10;
const to3 = (x, y) => ({ X: (x - 180) / U, Z: (y - 400) / U });
const from3 = (X, Z) => ({ x: X * U + 180, y: Z * U + 400 });

const COLORS = {
  grass: 0x5d6b4c,
  stone: 0xa39d8f,
  stoneDark: 0x8d877a,
  wood: 0x4e2618,
  woodLight: 0x6e3a22,
  pillar: 0x8c2f1e,
  tile: 0x6b3326,
  tileEdge: 0x4a2219,
  gold: 0xd8b45a,
  bronze: 0x8a6d34,
  cushion: 0x9b5a28,
  wall: 0xcfc5ad,
  leaf: 0x355d3a,
  bamboo: 0x6d8a45,
  water: 0x2f5d63,
  skin: 0xefc7a2,
  hair: 0x2b2220,
};
const ROBE = { lam: 0x6f86a0, nau: 0x7b5236, trang: 0xe8e2d4 };
const LANTERN = { sen: 0xf3a6b9, do: 0xe2574a, vang: 0xf2c35b };

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {any} THREE  thư viện Three.js (bản UMD r128)
 */
export function createView3D(canvas, THREE) {
  const V3 = THREE.Vector3;
  // Throws when WebGL is unavailable; main.js then falls back to 2D.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  const cores = globalThis.navigator?.hardwareConcurrency ?? 8;
  const lowEnd = cores <= 4;
  renderer.setPixelRatio(Math.min(globalThis.devicePixelRatio || 1, lowEnd ? 1.25 : 1.75));
  renderer.shadowMap.enabled = !lowEnd;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.5, 900);
  scene.fog = new THREE.Fog(0xe6eef0, 80, 300);

  const lambert = (color, extra = {}) => new THREE.MeshLambertMaterial({ color, ...extra });
  const M = {
    grass: lambert(COLORS.grass),
    stone: lambert(COLORS.stone),
    stoneDark: lambert(COLORS.stoneDark),
    wood: lambert(COLORS.wood),
    woodLight: lambert(COLORS.woodLight),
    pillar: lambert(COLORS.pillar),
    tile: lambert(COLORS.tile, { side: THREE.DoubleSide }),
    tileEdge: lambert(COLORS.tileEdge),
    wall: lambert(COLORS.wall),
    cushion: lambert(COLORS.cushion),
    cushionTop: lambert(0x7a4520),
    leaf: lambert(COLORS.leaf),
    leaf2: lambert(0x41703f),
    leaf3: lambert(0x2c4f33),
    bamboo: lambert(COLORS.bamboo),
    bambooLeaf: lambert(0x4f6b34, { side: THREE.DoubleSide }),
    trunk: lambert(0x5b4636),
    bark: lambert(0x7d6a57),
    white: lambert(0xfbf6ea),
    rock: lambert(0x7f7a70),
    lotusLeaf: lambert(0x4f7f45, { side: THREE.DoubleSide }),
    lotus: lambert(0xf2b3c2),
    lotusCore: lambert(0xf2cf5b),
    moss: lambert(0x7c8a6a),
    skin: lambert(COLORS.skin),
    hair: lambert(COLORS.hair),
    dark: lambert(0x2a120b),
    lacquer: lambert(0x6a1f14),
    candle: lambert(0xe9dcc0),
    gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.55, roughness: 0.35, emissive: 0x5a4210 }),
    bronze: new THREE.MeshStandardMaterial({ color: COLORS.bronze, metalness: 0.7, roughness: 0.4 }),
    water: new THREE.MeshPhongMaterial({ color: COLORS.water, shininess: 90, specular: 0x6a9a9a }),
    flame: new THREE.MeshBasicMaterial({ color: 0xffd27a }),
    ember: new THREE.MeshBasicMaterial({ color: 0xff7a3c }),
    stick: lambert(0xa3402c),
  };

  // ── Canvas textures ───────────────────────────────────────────────────────
  function canvasTex(w, h, draw) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.anisotropy = 4;
    return t;
  }
  const glowTex = canvasTex(64, 64, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 1, w / 2, w / 2, w / 2);
    r.addColorStop(0, "rgba(255,255,255,1)");
    r.addColorStop(0.35, "rgba(255,255,255,0.45)");
    r.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = r;
    g.fillRect(0, 0, w, w);
  });
  const glow = (color, size, opacity = 0.8) => {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTex,
        color,
        transparent: true,
        opacity,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        fog: false,
      }),
    );
    s.scale.set(size, size, 1);
    return s;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  function mesh(geo, mat, x = 0, y = 0, z = 0, { cast = true, receive = false } = {}) {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = receive;
    return m;
  }
  function box(w, h, d, mat, x, y, z, opts) {
    return mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, opts);
  }
  function beam(a, b, r, mat) {
    const dir = new V3().subVectors(b, a);
    const len = dir.length();
    const m = mesh(new THREE.CylinderGeometry(r, r, len, 6), mat);
    m.position.copy(a).addScaledVector(dir, 0.5);
    m.quaternion.setFromUnitVectors(new V3(0, 1, 0), dir.normalize());
    return m;
  }

  /**
   * Mái chùa Việt: mái chái (hip roof) có mặt lõm và bốn góc đầu đao cong vút.
   * Đáy mái ở y=0, nóc ở y=h. Trả về group gồm mặt mái, bờ nóc, bờ dải và đầu đao.
   */
  function vietRoof(w, d, h, curl, mats = { tile: M.tile, edge: M.tileEdge }) {
    const g = new THREE.Group();
    const rl = Math.max(0.2, w - d * 0.95);
    const zone = Math.min(w, d) * 0.42;
    const N = 18;
    const Mrows = 7;
    const cornerLift = (dist) => {
      const u = Math.min(1, dist / zone);
      return Math.pow(1 - u, 2.2);
    };
    const pos = [];
    const pushQuad = (a, b, c, d2) => pos.push(...a, ...b, ...c, ...a, ...c, ...d2);
    function face(eave, ridge) {
      const grid = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N;
        const e = eave(s);
        const r = ridge(s);
        const col = [];
        for (let j = 0; j <= Mrows; j++) {
          const t = j / Mrows;
          // concave profile: flat near the eave, steep near the ridge
          col.push([e[0] + (r[0] - e[0]) * t, e[1] + (r[1] - e[1]) * Math.pow(t, 1.6), e[2] + (r[2] - e[2]) * t]);
        }
        grid.push(col);
      }
      for (let i = 0; i < N; i++) {
        for (let j = 0; j < Mrows; j++) pushQuad(grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]);
      }
    }
    const eaveFB = (zs) => (s) => {
      const x = (s - 0.5) * w;
      const k = cornerLift(w / 2 - Math.abs(x));
      return [x + Math.sign(x) * curl * 0.6 * k, curl * k, zs * (d / 2 + curl * 0.6 * k)];
    };
    const eaveLR = (xs) => (s) => {
      const z = (s - 0.5) * d;
      const k = cornerLift(d / 2 - Math.abs(z));
      return [xs * (w / 2 + curl * 0.6 * k), curl * k, z + Math.sign(z) * curl * 0.6 * k];
    };
    face(eaveFB(1), (s) => [(s - 0.5) * rl, h, 0]);
    face(eaveFB(-1), (s) => [(s - 0.5) * rl, h, 0]);
    face(eaveLR(1), () => [rl / 2, h, 0]);
    face(eaveLR(-1), () => [-rl / 2, h, 0]);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    geo.computeVertexNormals();
    const roof = mesh(geo, mats.tile);
    g.add(roof);
    // bờ nóc (ridge) and bờ dải (hips) with upturned tips
    g.add(box(rl + 0.4, 0.28, 0.34, mats.edge, 0, h + 0.1, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const tip = new V3(sx * (w / 2 + curl * 0.6), curl, sz * (d / 2 + curl * 0.6));
        g.add(beam(tip, new V3((sx * rl) / 2, h + 0.05, 0), 0.12, mats.edge));
        const horn = mesh(new THREE.ConeGeometry(0.13, curl * 1.1 + 0.3, 6), mats.edge);
        horn.position.copy(tip).add(new V3(sx * 0.18, 0.32, sz * 0.18));
        horn.rotation.z = -sx * 0.6;
        horn.rotation.x = sz * 0.6;
        g.add(horn);
      }
    }
    return g;
  }

  /** Thân chuông đồng: profile tiện quay (lathe). Đỉnh ở y=0, miệng ở y=-2. */
  function bellMesh() {
    // Profile runs bottom → top so the lathe's faces point outward.
    const p = [
      [0.74, -2.02],
      [0.82, -2],
      [0.7, -1.75],
      [0.6, -1.2],
      [0.58, -0.45],
      [0.5, -0.12],
      [0.32, 0],
      [0.001, 0],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    const g = new THREE.Group();
    g.add(mesh(new THREE.LatheGeometry(p, 20), M.bronze));
    for (const y of [-0.6, -1.3]) g.add(mesh(new THREE.TorusGeometry(0.61, 0.03, 4, 20), M.bronze, 0, y, 0));
    g.children[1].rotation.x = Math.PI / 2;
    g.children[2].rotation.x = Math.PI / 2;
    const loop = mesh(new THREE.TorusGeometry(0.16, 0.05, 4, 10), M.bronze, 0, 0.12, 0);
    g.add(loop);
    return g;
  }

  // ── Bầu trời, ánh sáng ────────────────────────────────────────────────────
  const skyGeo = new THREE.SphereGeometry(600, 24, 12);
  skyGeo.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(skyGeo.attributes.position.count * 3), 3));
  const sky = new THREE.Mesh(
    skyGeo,
    new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false }),
  );
  scene.add(sky);
  const topC = new THREE.Color();
  const botC = new THREE.Color();
  function paintSky(top, bottom) {
    topC.setStyle(top);
    botC.setStyle(bottom);
    const pos = skyGeo.attributes.position;
    const col = skyGeo.attributes.color;
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const t = Math.min(1, Math.max(0, pos.getY(i) / 600 / 0.55));
      c.copy(botC).lerp(topC, Math.pow(t, 0.8));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
    scene.fog.color.copy(botC);
  }

  const starGeo = new THREE.BufferGeometry();
  {
    const r = rng(99);
    const arr = [];
    for (let i = 0; i < 500; i++) {
      const th = r() * Math.PI * 2;
      const ph = Math.acos(0.08 + r() * 0.92);
      arr.push(560 * Math.sin(ph) * Math.cos(th), 560 * Math.cos(ph), 560 * Math.sin(ph) * Math.sin(th));
    }
    starGeo.setAttribute("position", new THREE.Float32BufferAttribute(arr, 3));
  }
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0xfffaeb, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false }),
  );
  scene.add(stars);

  const moonCanvas = document.createElement("canvas");
  moonCanvas.width = 128;
  moonCanvas.height = 128;
  const moonTex = new THREE.CanvasTexture(moonCanvas);
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
  const moonGlow = glow(0xfff0c8, 120, 0.35);
  const moonDir = new V3(0.28, 0.4, -1).normalize();
  moon.position.copy(moonDir).multiplyScalar(520);
  moonGlow.position.copy(moon.position);
  scene.add(moonGlow, moon);
  let moonKey = "";
  function paintMoon(phase) {
    const key = phase.toFixed(2);
    if (key === moonKey) return;
    moonKey = key;
    const g = moonCanvas.getContext("2d");
    g.clearRect(0, 0, 128, 128);
    const illum = (1 - Math.cos(phase * Math.PI * 2)) / 2;
    if (illum < 0.03) {
      moonTex.needsUpdate = true;
      return;
    }
    g.save();
    g.beginPath();
    g.arc(64, 64, 56, 0, Math.PI * 2);
    g.clip();
    g.fillStyle = "#fbf1d6";
    g.fillRect(0, 0, 128, 128);
    g.fillStyle = "rgba(230,214,180,0.6)";
    for (const [x, y, r] of [
      [46, 50, 9],
      [78, 74, 12],
      [58, 86, 6],
    ]) {
      g.beginPath();
      g.arc(x, y, r, 0, Math.PI * 2);
      g.fill();
    }
    const waxing = phase < 0.5;
    g.globalCompositeOperation = "destination-out";
    g.beginPath();
    g.arc(64 + 112 * illum * (waxing ? -1 : 1), 64, 56, 0, Math.PI * 2);
    g.fill();
    g.restore();
    moonTex.needsUpdate = true;
  }

  const hemi = new THREE.HemisphereLight(0xdfe9ff, 0x4f5a3c, 0.8);
  const sun = new THREE.DirectionalLight(0xfff1d8, 0.9);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 220 });
  sun.shadow.bias = -0.0008;
  scene.add(hemi, sun, sun.target);
  const hallLight = new THREE.PointLight(0xffb46a, 1.2, 22, 1.6);
  hallLight.position.set(0, 4.2, -16.6);
  scene.add(hallLight);

  // ── Mặt đất ───────────────────────────────────────────────────────────────
  const ground = mesh(new THREE.PlaneGeometry(900, 900), M.grass, 0, 0, 0, { cast: false, receive: true });
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  {
    const r = rng(3);
    const tuft = new THREE.InstancedMesh(new THREE.ConeGeometry(0.07, 0.38, 3), lambert(0x6f7d55), 700);
    const m4 = new THREE.Matrix4();
    let n = 0;
    while (n < 700) {
      const x = -60 + r() * 120;
      const z = -50 + r() * 100;
      const inYard = x > -21.5 && x < 21.5 && z > -33.5 && z < 23.5;
      if (inYard && !(x < -17 || x > 17 || z > 6.8 || z < -31)) continue;
      m4.makeTranslation(x, 0.19, z);
      tuft.setMatrixAt(n++, m4);
    }
    scene.add(tuft);
  }

  // Sân gạch Bát Tràng (sân trước chính điện)
  const c0 = to3(LAYOUT.courtyard.x, LAYOUT.courtyard.y);
  const c1 = to3(LAYOUT.courtyard.x + LAYOUT.courtyard.w, LAYOUT.courtyard.y + LAYOUT.courtyard.h);
  {
    const tex = canvasTex(640, 160, (g) => {
      const r = rng(11);
      g.fillStyle = "#b99b7c";
      g.fillRect(0, 0, 640, 160);
      for (let y = 0; y < 5; y++) {
        for (let x = 0; x < 20; x++) {
          const v = r();
          g.fillStyle = v < 0.33 ? "#b8714f" : v < 0.66 ? "#ad6849" : "#c07a57";
          g.fillRect(x * 32 + 1.5, y * 32 + 1.5, 29, 29);
        }
      }
    });
    const w = c1.X - c0.X;
    const d = c1.Z - c0.Z;
    scene.add(box(w + 0.8, 0.12, d + 0.4, lambert(0x8d6b55), (c0.X + c1.X) / 2, 0.04, (c0.Z + c1.Z) / 2, { cast: false, receive: true }));
    const yard = mesh(new THREE.PlaneGeometry(w, d), lambert(0xc9b8a8, { map: tex }), (c0.X + c1.X) / 2, 0.11, (c0.Z + c1.Z) / 2, {
      cast: false,
      receive: true,
    });
    yard.rotation.x = -Math.PI / 2;
    scene.add(yard);
  }
  // Lối đi đá
  for (let z = 7.4; z < 21; z += 1.5) scene.add(box(3.6, 0.12, 1.25, M.stone, 0, 0.06, z, { cast: false, receive: true }));

  // Tường bao
  const walls = new THREE.Group();
  scene.add(walls);
  {
    const H = 1.4;
    const segs = [
      [-21, -33, -21, 23],
      [21, -33, 21, 23],
      [-21, -33, 21, -33],
      [-21, 23, -6.8, 23],
      [6.8, 23, 21, 23],
    ];
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0);
      const along = x0 === x1 ? "z" : "x";
      const w = along === "x" ? len : 0.5;
      const d = along === "z" ? len : 0.5;
      walls.add(box(w, H, d, M.wall, (x0 + x1) / 2, H / 2, (z0 + z1) / 2, { receive: true }));
      walls.add(box(w + 0.3, 0.22, d + 0.3, M.tile, (x0 + x1) / 2, H + 0.11, (z0 + z1) / 2));
    }
  }

  // ── Chính điện 200 chỗ ────────────────────────────────────────────────────
  // hallShell: nền, cột, vách, mái (một mô hình tải ngoài có thể thay phần này).
  // hallInside: sàn, bệ thờ, tượng, bàn hương, đèn lồng (luôn giữ).
  const FLOOR = 0.6;
  const H0 = to3(LAYOUT.hall.x, LAYOUT.hall.y);
  const H1 = to3(LAYOUT.hall.x + LAYOUT.hall.w, LAYOUT.hall.y + LAYOUT.hall.h);
  const hallBox = { x0: H0.X, x1: H1.X, z0: H0.Z, z1: H1.Z, cx: (H0.X + H1.X) / 2, cz: (H0.Z + H1.Z) / 2, w: H1.X - H0.X, d: H1.Z - H0.Z };
  const inHallFootprint = (X, Z) => X > hallBox.x0 && X < hallBox.x1 && Z > hallBox.z0 && Z < hallBox.z1;
  const floorAt = (X, Z) => (inHallFootprint(X, Z) ? FLOOR : 0);
  const hall = new THREE.Group(); // shell
  const hallInside = new THREE.Group();
  hallInside.userData.kind = "altar";
  const roofMats = {
    tile: lambert(COLORS.tile, { side: THREE.DoubleSide, transparent: true }),
    edge: lambert(COLORS.tileEdge, { transparent: true }),
    wood: lambert(COLORS.wood, { transparent: true }),
    gold: new THREE.MeshStandardMaterial({ color: COLORS.gold, metalness: 0.55, roughness: 0.35, transparent: true }),
    moss: lambert(0x7c8a6a, { transparent: true }),
  };
  const hallRoof = new THREE.Group();
  const lanterns3d = [];
  {
    const { cx, cz, w, d } = hallBox;
    hall.add(box(w + 0.8, FLOOR, d + 0.8, M.stone, cx, FLOOR / 2, cz, { receive: true }));
    [
      [14, 0.45, hallBox.z1 + 0.45],
      [15, 0.25, hallBox.z1 + 0.95],
    ].forEach(([sw, sh, z]) => hall.add(box(sw, sh, 0.5, M.stoneDark, cx, sh / 2, z, { receive: true })));
    // Floor of lacquered planks
    const planks = canvasTex(256, 256, (g) => {
      g.fillStyle = "#6a3a26";
      g.fillRect(0, 0, 256, 256);
      g.strokeStyle = "rgba(255,220,180,0.08)";
      for (let y = 0; y < 256; y += 16) {
        g.beginPath();
        g.moveTo(0, y);
        g.lineTo(256, y);
        g.stroke();
      }
    });
    planks.wrapS = planks.wrapT = THREE.RepeatWrapping;
    planks.repeat.set(4, 4);
    const floor = mesh(new THREE.PlaneGeometry(w, d), lambert(0xffffff, { map: planks }), cx, FLOOR + 0.01, cz, { cast: false, receive: true });
    floor.rotation.x = -Math.PI / 2;
    hallInside.add(floor);
    // Pillars around the hall (open front and sides, like a great hall with its doors folded away)
    const PH = 5.6;
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.34, PH, 10);
    const baseGeo = new THREE.CylinderGeometry(0.46, 0.5, 0.25, 10);
    const pillarAt = (x, z) => {
      hall.add(mesh(pillarGeo, M.pillar, x, FLOOR + PH / 2, z));
      hall.add(mesh(baseGeo, M.stoneDark, x, FLOOR + 0.12, z));
    };
    for (const x of [-16, -11.6, -7.4, 7.4, 11.6, 16]) pillarAt(x, hallBox.z1 - 0.5);
    for (let z = hallBox.z1 - 5.3; z > hallBox.z0 + 1; z -= 4.8) {
      pillarAt(-16, z);
      pillarAt(16, z);
    }
    // Back wall, low side balustrades, beams
    hall.add(box(w, PH, 0.4, M.wood, cx, FLOOR + PH / 2, hallBox.z0 + 0.2, { receive: true }));
    for (const sx of [-1, 1]) hall.add(box(0.3, 0.9, d - 1.6, M.woodLight, sx * 16.15, FLOOR + 0.45, cz - 0.4));
    hall.add(box(w + 0.6, 0.5, 0.5, M.wood, cx, FLOOR + PH, hallBox.z1 - 0.5));
    for (const sx of [-1, 1]) hall.add(box(0.5, 0.5, d, M.wood, sx * 16, FLOOR + PH, cz));
    // Dais (bệ thờ), seated figure, halo, candles
    const D0 = to3(LAYOUT.dais.x, LAYOUT.dais.y);
    const D1 = to3(LAYOUT.dais.x + LAYOUT.dais.w, LAYOUT.dais.y + LAYOUT.dais.h);
    const dz = (D0.Z + D1.Z) / 2;
    hallInside.add(box(D1.X - D0.X + 1.6, 0.5, D1.Z - D0.Z, M.lacquer, 0, FLOOR + 0.25, dz));
    hallInside.add(box(D1.X - D0.X, 0.5, D1.Z - D0.Z - 1.4, M.lacquer, 0, FLOOR + 0.75, dz - 0.7));
    hallInside.add(box(D1.X - D0.X + 1.7, 0.08, 0.1, M.gold, 0, FLOOR + 0.5, D1.Z));
    const fy = FLOOR + 1.0;
    const fz = D0.Z + 2.6;
    hallInside.add(mesh(new THREE.CylinderGeometry(1.9, 1.6, 0.5, 18), lambert(0xc98f9b), 0, fy + 0.25, fz));
    const legs = mesh(new THREE.SphereGeometry(1, 18, 10), M.gold, 0, fy + 0.8, fz);
    legs.scale.set(1.8, 0.7, 1.25);
    hallInside.add(legs);
    hallInside.add(mesh(new THREE.CylinderGeometry(0.75, 1.25, 2.3, 16), M.gold, 0, fy + 2.1, fz - 0.1));
    hallInside.add(mesh(new THREE.SphereGeometry(0.68, 18, 14), M.gold, 0, fy + 3.65, fz - 0.1));
    hallInside.add(mesh(new THREE.TorusGeometry(1.5, 0.08, 6, 48), M.gold, 0, fy + 3.65, fz - 0.9));
    const haloGlow = glow(0xffd58a, 8, 0.55);
    haloGlow.position.set(0, fy + 3.6, fz - 0.7);
    hallInside.add(haloGlow);
    hall.userData.candles = [];
    for (const sx of [-1, 1]) {
      hallInside.add(mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8), M.candle, sx * 3.2, FLOOR + 1.4, D1.Z - 1.2));
      const fl = mesh(new THREE.ConeGeometry(0.08, 0.28, 6), M.flame, sx * 3.2, FLOOR + 1.95, D1.Z - 1.2, { cast: false });
      const gl = glow(0xffc070, 1.6, 0.7);
      gl.position.set(sx * 3.2, FLOOR + 1.95, D1.Z - 1.2);
      hallInside.add(fl, gl);
      hall.userData.candles.push(fl, gl);
    }
    // Altar table for the incense bowl
    const inc0 = to3(LAYOUT.incense.x, LAYOUT.incense.y);
    hallInside.add(box(3.6, 0.9, 1.4, M.lacquer, inc0.X, FLOOR + 0.45, inc0.Z));
    hallInside.add(box(3.8, 0.08, 1.5, M.gold, inc0.X, FLOOR + 0.92, inc0.Z));
    // Name board on the back wall
    const board = canvasTex(256, 48, (g) => {
      g.fillStyle = "#b8903c";
      g.fillRect(0, 0, 256, 48);
      g.strokeStyle = "#7a5a1e";
      g.lineWidth = 4;
      g.strokeRect(3, 3, 250, 42);
      g.fillStyle = "#5a1e12";
      g.font = "600 26px 'Be Vietnam Pro', system-ui, sans-serif";
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText("AM MÂY", 128, 26);
    });
    hall.userData.board = board;
    // Hoành phi on the front beam, facing the courtyard (the halo fills the back wall)
    hall.add(mesh(new THREE.PlaneGeometry(6, 1.1), lambert(0xffffff, { map: board }), 0, FLOOR + PH - 0.6, hallBox.z1 - 0.2, { cast: false }));
    // Hanging lanterns (đèn lồng) along the hall
    for (const z of [-25, -18, -11, -4.5]) {
      for (const x of [-9, 9]) {
        const l = mesh(new THREE.SphereGeometry(0.42, 12, 8), lambert(0xc0392b, { emissive: 0x401008 }), x, FLOOR + 4.4, z, { cast: false });
        l.scale.y = 1.25;
        const gl = glow(0xffb070, 3.2, 0.5);
        gl.position.set(x, FLOOR + 4.4, z);
        hallInside.add(l, gl);
        lanterns3d.push(gl);
      }
    }
    // Roof: two tiers over the whole hall; fades out while you are inside
    const lower = vietRoof(w + 3.2, d + 3.2, 4.2, 1.5, roofMats);
    lower.position.set(cx, FLOOR + PH + 0.25, cz);
    hallRoof.add(lower);
    hallRoof.add(box(22, 1.6, 12, roofMats.wood, cx, FLOOR + PH + 3.4, cz));
    const upper = vietRoof(26, 15, 3.6, 1.1, roofMats);
    upper.position.set(cx, FLOOR + PH + 4.1, cz);
    hallRoof.add(upper);
    const ridgeY = FLOOR + PH + 4.1 + 3.8;
    hallRoof.add(mesh(new THREE.SphereGeometry(0.5, 14, 10), roofMats.gold, 0, ridgeY + 0.6, cz));
    for (const sx of [-1, 1]) {
      const curve = new THREE.CatmullRomCurve3(
        [
          [0.9, 0.1],
          [1.7, 0.9],
          [2.6, 0.25],
          [3.5, 0.95],
          [4.3, 0.45],
        ].map(([x, y]) => new V3(sx * x, ridgeY + y, cz)),
      );
      hallRoof.add(mesh(new THREE.TubeGeometry(curve, 24, 0.14, 6, false), roofMats.moss));
    }
    hallRoof.traverse((o) => {
      if (o.isMesh) o.castShadow = false; // keep the seated rows lit
    });
    hall.add(hallRoof);
  }
  scene.add(hall, hallInside);
  const hallLights = [
    [0, 4.6, -24],
    [0, 4.6, -14],
    [0, 4.6, -5],
  ].map(([x, y, z]) => {
    const l = new THREE.PointLight(0xffb46a, 0.8, 20, 1.6);
    l.position.set(x, FLOOR + y, z);
    scene.add(l);
    return l;
  });
  let roofOpacity = 1;

  // ── Đỉnh hương (bát hương) trên bàn trước bệ thờ ─────────────────────────
  const inc = to3(LAYOUT.incense.x, LAYOUT.incense.y);
  const BOWL_Y = FLOOR + 0.92 - 0.5; // legs stand on the altar table
  const bowl = new THREE.Group();
  bowl.userData.kind = "altar";
  bowl.position.set(inc.X, BOWL_Y, inc.Z);
  bowl.add(
    mesh(
      new THREE.LatheGeometry(
        [
          [0.001, 0.75],
          [0.45, 0.72],
          [0.72, 0.95],
          [0.8, 1.25],
          [0.7, 1.32],
        ].map(([r, y]) => new THREE.Vector2(r, y)),
        18,
      ),
      M.bronze,
    ),
  );
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    bowl.add(mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.3, 6), M.bronze, Math.cos(a) * 0.45, 0.65, Math.sin(a) * 0.45));
  }
  bowl.add(mesh(new THREE.CylinderGeometry(0.66, 0.66, 0.06, 18), lambert(0x6d6253), 0, 1.25, 0, { cast: false }));
  scene.add(bowl);
  const sticks = [];
  for (let i = 0; i < TUNING.incense.maxDrawnSticks; i++) {
    const s = mesh(new THREE.CylinderGeometry(0.022, 0.022, 1, 4), M.stick, 0, 0, 0, { cast: false });
    const tip = mesh(new THREE.SphereGeometry(0.04, 6, 4), M.ember, 0, 0, 0, { cast: false });
    const a = i * 2.39996;
    const rr = 0.12 + ((i * 37) % 10) * 0.045;
    s.userData.base = new V3(inc.X + Math.cos(a) * rr, BOWL_Y + 1.27, inc.Z + Math.sin(a) * rr);
    s.visible = tip.visible = false;
    scene.add(s, tip);
    sticks.push({ s, tip });
  }
  const smokeMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xdcdce2, transparent: true, opacity: 0.2, depthWrite: false });
  const smoke = [];
  for (let i = 0; i < 70; i++) {
    const sp = new THREE.Sprite(smokeMat.clone());
    sp.visible = false;
    scene.add(sp);
    smoke.push({ sp, born: -99, x: 0, z: 0, y: 0, seed: 0 });
  }
  let smokeCursor = 0;

  // ── Gác chuông (sân trước, bên trái) ──────────────────────────────────────
  const bt = to3(LAYOUT.bellTower.x + LAYOUT.bellTower.w / 2, LAYOUT.bellTower.y + LAYOUT.bellTower.h / 2);
  const bellTower = new THREE.Group();
  bellTower.userData.kind = "bell";
  bellTower.position.set(bt.X, 0, bt.Z);
  bellTower.add(box(5.6, 0.5, 5.6, M.stone, 0, 0.25, 0, { receive: true }));
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) bellTower.add(mesh(new THREE.CylinderGeometry(0.17, 0.2, 4.7, 8), M.pillar, sx * 2.1, 2.85, sz * 2.1));
  }
  for (const sz of [-1, 1]) bellTower.add(box(4.6, 0.3, 0.3, M.wood, 0, 5.1, sz * 2.1));
  for (const sx of [-1, 1]) bellTower.add(box(0.3, 0.3, 4.6, M.wood, sx * 2.1, 5.1, 0));
  bellTower.add(box(0.25, 0.25, 4.6, M.wood, 0, 4.95, 0));
  const bl = vietRoof(6.6, 6.6, 1.2, 0.45);
  bl.position.y = 5.25;
  bellTower.add(bl);
  bellTower.add(box(3, 0.7, 3, M.wood, 0, 6.6, 0));
  const bu = vietRoof(4.2, 4.2, 1.0, 0.35);
  bu.position.y = 6.9;
  bellTower.add(bu);
  const bellPivot = new THREE.Group();
  bellPivot.position.set(0, 4.85, 0);
  const bell = bellMesh();
  bell.position.y = -0.1;
  bellPivot.add(bell);
  bellTower.add(bellPivot);
  const striker = mesh(new THREE.CylinderGeometry(0.16, 0.16, 2.2, 8), M.bark, 1.75, 3.55, 0);
  striker.rotation.z = Math.PI / 2;
  bellTower.add(striker);
  scene.add(bellTower);
  const bellBase = new V3(bellTower.position.x, 0.08, bellTower.position.z);
  const rippleMeshes = [];
  for (let i = 0; i < 12; i++) {
    const r = mesh(
      new THREE.RingGeometry(0.94, 1, 64),
      new THREE.MeshBasicMaterial({ color: 0xf0ce78, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }),
      bellBase.x,
      0.14,
      bellBase.z,
      { cast: false },
    );
    r.rotation.x = -Math.PI / 2;
    r.visible = false;
    scene.add(r);
    rippleMeshes.push(r);
  }

  // ── 200 bồ đoàn (instanced: hai lệnh vẽ cho cả điện) ─────────────────────
  const cushionBody = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.55, 0.6, 0.18, 14), M.cushion, CUSHIONS.length);
  const topGeo = new THREE.CircleGeometry(0.36, 14);
  topGeo.rotateX(-Math.PI / 2);
  const cushionTop = new THREE.InstancedMesh(topGeo, M.cushionTop, CUSHIONS.length);
  {
    const m4 = new THREE.Matrix4();
    for (const c of CUSHIONS) {
      const p = to3(c.x, c.y);
      m4.makeTranslation(p.X, FLOOR + 0.1, p.Z);
      cushionBody.setMatrixAt(c.index, m4);
      m4.makeTranslation(p.X, FLOOR + 0.195, p.Z);
      cushionTop.setMatrixAt(c.index, m4);
    }
  }
  cushionBody.receiveShadow = true;
  cushionBody.userData.cushionInstanced = true;
  cushionTop.userData.cushionInstanced = true;
  scene.add(cushionBody, cushionTop);
  const cushionMeshes = [cushionBody, cushionTop];

  // ── Hồ sen ────────────────────────────────────────────────────────────────
  const pondGroup = new THREE.Group();
  pondGroup.userData.kind = "pond";
  const pa = to3(LAYOUT.pond.x, LAYOUT.pond.y);
  const pb = to3(LAYOUT.pond.x + LAYOUT.pond.w, LAYOUT.pond.y + LAYOUT.pond.h);
  const pondC = { X: (pa.X + pb.X) / 2, Z: (pa.Z + pb.Z) / 2, w: pb.X - pa.X, d: pb.Z - pa.Z };
  {
    const rounded = (w, d, r) => {
      const s = new THREE.Shape();
      s.moveTo(-w / 2 + r, -d / 2);
      s.lineTo(w / 2 - r, -d / 2);
      s.quadraticCurveTo(w / 2, -d / 2, w / 2, -d / 2 + r);
      s.lineTo(w / 2, d / 2 - r);
      s.quadraticCurveTo(w / 2, d / 2, w / 2 - r, d / 2);
      s.lineTo(-w / 2 + r, d / 2);
      s.quadraticCurveTo(-w / 2, d / 2, -w / 2, d / 2 - r);
      s.lineTo(-w / 2, -d / 2 + r);
      s.quadraticCurveTo(-w / 2, -d / 2, -w / 2 + r, -d / 2);
      return s;
    };
    const rim = rounded(pondC.w + 0.8, pondC.d + 0.8, 2.2);
    rim.holes.push(rounded(pondC.w, pondC.d, 1.8));
    const rimMesh = mesh(new THREE.ExtrudeGeometry(rim, { depth: 0.4, bevelEnabled: false }), lambert(0x8f8a7a), pondC.X, 0.4, pondC.Z, {
      receive: true,
    });
    rimMesh.rotation.x = Math.PI / 2;
    pondGroup.add(rimMesh);
    const water = mesh(new THREE.ShapeGeometry(rounded(pondC.w, pondC.d, 1.8)), M.water, pondC.X, 0.16, pondC.Z, { cast: false, receive: true });
    water.rotation.x = -Math.PI / 2;
    pondGroup.add(water);
    const r = rng(5);
    for (let i = 0; i < 18; i++) {
      const lf = mesh(new THREE.CircleGeometry(0.5 + r() * 0.5, 14, 0.3, Math.PI * 2 - 0.45), M.lotusLeaf, 0, 0, 0, { cast: false });
      lf.rotation.x = -Math.PI / 2;
      lf.rotation.z = r() * 6;
      lf.position.set(pondC.X + (r() - 0.5) * (pondC.w - 2), 0.19, pondC.Z + (r() - 0.5) * (pondC.d - 2));
      pondGroup.add(lf);
    }
    for (let i = 0; i < 7; i++) {
      const fl = lotusFlower(M.lotus);
      fl.position.set(pondC.X + (r() - 0.5) * (pondC.w - 2.5), 0.2, pondC.Z + (r() - 0.5) * (pondC.d - 2.5));
      pondGroup.add(fl);
    }
  }
  scene.add(pondGroup);

  function lotusFlower(mat, scale = 1) {
    const g = new THREE.Group();
    const petal = new THREE.SphereGeometry(0.16, 6, 4);
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Mesh(petal, mat);
      const a = (i / 7) * Math.PI * 2;
      p.scale.set(0.7, 1.6, 0.45);
      p.position.set(Math.cos(a) * 0.14, 0.18, Math.sin(a) * 0.14);
      p.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
      g.add(p);
    }
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 4), M.lotusCore);
    core.position.y = 0.16;
    g.add(core);
    g.scale.setScalar(scale);
    return g;
  }

  // Đèn hoa đăng (pool)
  const lanternPool = [];
  for (let i = 0; i < 24; i++) {
    const mat = lambert(0xffffff, { emissive: 0x331a10 });
    const g = lotusFlower(mat, 1.25);
    const flame = mesh(new THREE.SphereGeometry(0.07, 6, 4), M.flame, 0, 0.42, 0, { cast: false });
    const gl = glow(0xffd28a, 2.6, 0.7);
    gl.position.y = 0.45;
    g.add(flame, gl);
    g.visible = false;
    scene.add(g);
    lanternPool.push({ g, mat, gl });
  }

  // ── Vườn: bảo tháp, cây đại, đá ───────────────────────────────────────────
  {
    const st = to3(310, 576);
    const stupa = new THREE.Group();
    stupa.position.set(st.X, 0, st.Z);
    let y = 0;
    for (let i = 0; i < 5; i++) {
      const w = 2.4 - i * 0.3;
      stupa.add(box(w, 0.85, w, M.stone, 0, y + 0.42, 0, { receive: true }));
      stupa.add(box(w + 0.5, 0.18, w + 0.5, M.stoneDark, 0, y + 0.9, 0));
      y += 0.99;
    }
    stupa.add(mesh(new THREE.ConeGeometry(0.4, 1.1, 8), M.stone, 0, y + 0.55, 0));
    stupa.add(mesh(new THREE.SphereGeometry(0.2, 10, 8), M.gold, 0, y + 1.2, 0));
    scene.add(stupa);

    const fr = to3(246, 572);
    const r = rng(21);
    const trunkCurve = new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(-0.6, 1.4, 0.2), new V3(0.5, 2.6, -0.2), new V3(0.1, 3.6, 0)]);
    const tree = new THREE.Group();
    tree.position.set(fr.X, 0, fr.Z);
    tree.add(mesh(new THREE.TubeGeometry(trunkCurve, 16, 0.26, 7, false), M.bark));
    const ends = [new V3(-1.9, 4.6, 0.6), new V3(1.9, 4.4, -0.4), new V3(0.3, 5.2, 0.3)];
    const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(0.12, 6, 4), M.white, 60);
    const m4 = new THREE.Matrix4();
    let n = 0;
    for (const e of ends) {
      tree.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0.1, 3.5, 0), new V3(e.x * 0.5, e.y - 0.5, e.z * 0.5), e]), 10, 0.14, 6), M.bark));
      const cl = mesh(new THREE.IcosahedronGeometry(1.05, 0), M.leaf2, e.x, e.y + 0.3, e.z);
      cl.scale.set(1.3, 0.75, 1.1);
      tree.add(cl);
      for (let k = 0; k < 20; k++) {
        m4.makeTranslation(e.x + (r() - 0.5) * 2.2, e.y + 0.65 + r() * 0.35, e.z + (r() - 0.5) * 1.8);
        flowers.setMatrixAt(n++, m4);
      }
    }
    tree.add(flowers);
    scene.add(tree);
    for (const [x, y, s] of [
      [272, 574, 0.6],
      [340, 578, 0.45],
      [224, 578, 0.4],
    ]) {
      const p = to3(x, y);
      const rock = mesh(new THREE.DodecahedronGeometry(s, 0), M.rock, p.X, s * 0.35, p.Z);
      rock.scale.y = 0.6;
      scene.add(rock);
    }
  }

  // ── Cây bồ đề ─────────────────────────────────────────────────────────────
  {
    const t = to3(LAYOUT.tree.trunkX, LAYOUT.tree.trunkY);
    const tree = new THREE.Group();
    tree.position.set(t.X, 0, t.Z);
    tree.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 0, 0), new V3(-0.5, 2.5, 0), new V3(0.4, 4.6, -0.3), new V3(-0.6, 6.4, -0.6)]), 16, 0.55, 8), M.trunk));
    tree.add(mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new V3(0, 3.8, 0), new V3(-1.8, 5, 0.4), new V3(-3.2, 6.6, 0.8)]), 10, 0.3, 6), M.trunk));
    const r = rng(13);
    const mats = [M.leaf, M.leaf2, M.leaf3];
    for (let i = 0; i < 11; i++) {
      const c = mesh(new THREE.IcosahedronGeometry(1.8 + r() * 1.2, 0), mats[i % 3], -1 + (r() - 0.5) * 6, 7 + r() * 2.6, -0.6 + (r() - 0.5) * 5);
      c.rotation.set(r() * 3, r() * 3, 0);
      tree.add(c);
    }
    scene.add(tree);
  }

  // ── Cổng tam quan ─────────────────────────────────────────────────────────
  const gate = new THREE.Group();
  scene.add(gate);
  {
    const gz = 23;
    const shape = new THREE.Shape();
    shape.moveTo(-6.8, 0);
    shape.lineTo(6.8, 0);
    shape.lineTo(6.8, 4.4);
    shape.lineTo(-6.8, 4.4);
    shape.lineTo(-6.8, 0);
    const arch = (cx, w, h) => {
      const p = new THREE.Path();
      p.moveTo(cx - w / 2, 0);
      p.lineTo(cx - w / 2, h - w / 2);
      p.absarc(cx, h - w / 2, w / 2, Math.PI, 0, true);
      p.lineTo(cx + w / 2, 0);
      p.lineTo(cx - w / 2, 0);
      return p;
    };
    shape.holes.push(arch(0, 3.4, 3.6), arch(-4.2, 2.0, 2.7), arch(4.2, 2.0, 2.7));
    const wall = mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.9, bevelEnabled: false }), M.wall, 0, 0, gz - 0.45, { receive: true });
    gate.add(wall);
    const r1 = vietRoof(15, 2.6, 0.9, 0.5);
    r1.position.set(0, 4.4, gz);
    gate.add(r1);
    gate.add(box(6.6, 0.8, 1.6, M.wall, 0, 5.4, gz));
    const r2 = vietRoof(7.4, 2.4, 0.85, 0.45);
    r2.position.set(0, 5.75, gz);
    gate.add(r2);
  }

  // ── Lũy tre và núi xa ─────────────────────────────────────────────────────
  {
    const r = rng(7);
    const groves = [
      [-26, -20],
      [-27, 0],
      [-25, 16],
      [26, -18],
      [27, 2],
      [25, 17],
      [-12, -35],
      [10, -36],
      [-30, 30],
      [30, 30],
    ];
    const stalkGeo = new THREE.CylinderGeometry(0.09, 0.11, 1, 5);
    stalkGeo.translate(0, 0.5, 0);
    const stalks = new THREE.InstancedMesh(stalkGeo, M.bamboo, groves.length * 9);
    const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.1, 0.2), M.bambooLeaf, groves.length * 9 * 9);
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let si = 0;
    let li = 0;
    for (const [gx, gz] of groves) {
      for (let k = 0; k < 9; k++) {
        const x = gx + (r() - 0.5) * 4;
        const z = gz + (r() - 0.5) * 4;
        const h = 7 + r() * 5;
        const tx = (r() - 0.5) * 0.25;
        const tz = (r() - 0.5) * 0.25;
        e.set(tx, 0, tz);
        q.setFromEuler(e);
        m4.compose(new V3(x, 0, z), q, new V3(1, h, 1));
        stalks.setMatrixAt(si++, m4);
        for (let j = 0; j < 9; j++) {
          const t = 0.45 + (j / 9) * 0.55;
          const lx = x + Math.sin(tz) * h * t * -1 + (r() - 0.5) * 1.4;
          const lz = z + Math.sin(tx) * h * t + (r() - 0.5) * 1.4;
          e.set(r() * 0.6 - 0.3, r() * Math.PI * 2, r() * 0.8 - 0.4);
          q.setFromEuler(e);
          m4.compose(new V3(lx, h * t, lz), q, new V3(1, 1, 1));
          leaves.setMatrixAt(li++, m4);
        }
      }
    }
    stalks.castShadow = true;
    scene.add(stalks, leaves);

    const mr = rng(31);
    for (let i = 0; i < 26; i++) {
      const a = -Math.PI * 0.95 + (i / 25) * Math.PI * 1.9 + (mr() - 0.5) * 0.1;
      const dist = 170 + mr() * 160;
      const h = 40 + mr() * 70;
      const geo = new THREE.ConeGeometry(30 + mr() * 40, h, 7, 1).toNonIndexed();
      geo.computeVertexNormals();
      const tone = new THREE.Color(0x6d849a).lerp(new THREE.Color(0x9db4c9), mr());
      const m = mesh(geo, lambert(tone), Math.sin(a) * dist, h / 2 - 4, -Math.cos(a) * dist, { cast: false });
      m.rotation.y = mr() * 3;
      scene.add(m);
    }
  }
  // Mây: soft cloud sprites drifting over the mountains
  const cloudMat = new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
  const clouds = [];
  {
    const r = rng(41);
    for (let i = 0; i < 14; i++) {
      const sp = new THREE.Sprite(cloudMat);
      const a = (r() - 0.5) * Math.PI * 1.6;
      const d = 140 + r() * 140;
      sp.position.set(Math.sin(a) * d, 26 + r() * 40, -Math.cos(a) * d);
      sp.scale.set(70 + r() * 70, 14 + r() * 10, 1);
      sp.userData = { a, d, speed: 0.004 + r() * 0.006 };
      scene.add(sp);
      clouds.push(sp);
    }
  }
  // Đom đóm
  const fireflyGeo = new THREE.BufferGeometry();
  fireflyGeo.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(14 * 3), 3));
  const fireflies = new THREE.Points(
    fireflyGeo,
    new THREE.PointsMaterial({ color: 0xdcff96, size: 3, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false }),
  );
  scene.add(fireflies);

  // ── Nhân vật ──────────────────────────────────────────────────────────────
  const lathe = (pts, mat) =>
    mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 16), mat);
  function makePerson(robeKey, headKey, self) {
    const robeMat = lambert(ROBE[robeKey] ?? ROBE.lam);
    const g = new THREE.Group();
    const lower = lathe(
      [
        [0.001, 0],
        [0.56, 0],
        [0.5, 0.25],
        [0.42, 0.6],
        [0.38, 0.76],
        [0.001, 0.76],
      ],
      robeMat,
    );
    const legs = mesh(new THREE.SphereGeometry(0.5, 14, 8), robeMat, 0, 0.17, 0.12);
    legs.scale.set(1.25, 0.42, 1.0);
    legs.visible = false;
    const upper = new THREE.Group();
    upper.position.y = 0.72;
    upper.add(
      lathe(
        [
          [0.001, 0],
          [0.41, 0],
          [0.37, 0.34],
          [0.27, 0.55],
          [0.15, 0.63],
          [0.001, 0.63],
        ],
        robeMat,
      ),
    );
    const head = mesh(new THREE.SphereGeometry(0.31, 16, 12), M.skin, 0, 0.93, 0);
    upper.add(head);
    if (headKey === "troc") {
      upper.add(mesh(new THREE.SphereGeometry(0.075, 8, 6), M.hair, 0, 1.21, 0.1));
    } else {
      const hair = mesh(new THREE.SphereGeometry(0.335, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair, 0, 0.95, -0.02);
      hair.rotation.x = -0.32;
      upper.add(hair);
    }
    for (const sx of [-1, 1]) upper.add(box(0.09, 0.018, 0.02, M.hair, sx * 0.11, 0.92, 0.3, { cast: false }));
    const hands = mesh(new THREE.ConeGeometry(0.08, 0.3, 6), M.skin, 0, 0.4, 0.34);
    hands.visible = false;
    upper.add(hands);
    g.add(lower, legs, upper);
    let ring = null;
    if (self) {
      ring = mesh(
        new THREE.RingGeometry(0.72, 0.86, 40),
        new THREE.MeshBasicMaterial({ color: 0xf0ce78, transparent: true, opacity: 0.85, depthWrite: false }),
        0,
        0.16,
        0,
        { cast: false },
      );
      ring.rotation.x = -Math.PI / 2;
      g.add(ring);
    }
    const pulse = mesh(
      new THREE.TorusGeometry(0.6, 0.03, 4, 24),
      new THREE.MeshBasicMaterial({ color: 0xf0ce78, transparent: true, opacity: 0 }),
      0,
      2.2,
      0,
      { cast: false },
    );
    pulse.rotation.x = Math.PI / 2;
    g.add(pulse);
    scene.add(g);
    return { g, lower, legs, upper, hands, ring, pulse, robeKey, headKey, heading: Math.PI, prev: null };
  }
  /** @type {Map<string, any>} */
  const people = new Map();

  function syncPerson(id, p, t, self) {
    let c = people.get(id);
    if (c && (c.robeKey !== p.robe || c.headKey !== p.head)) {
      scene.remove(c.g);
      c = null;
    }
    if (!c) {
      c = makePerson(p.robe, p.head, self);
      people.set(id, c);
    }
    c.seen = true;
    const pos = to3(p.x, p.y);
    const walking = p.pose === "walk" || p.walking;
    if (c.prev && walking) {
      const dx = pos.X - c.prev.X;
      const dz = pos.Z - c.prev.Z;
      if (dx * dx + dz * dz > 1e-6) c.targetHeading = Math.atan2(dx, dz);
    } else if (!walking) {
      c.targetHeading = Math.PI; // face the hall
    }
    c.prev = pos;
    let dh = (c.targetHeading ?? c.heading) - c.heading;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    c.heading += dh * 0.2;
    c.g.rotation.y = c.heading;

    const sit = p.pose === "sit";
    const pose = walking ? "walk" : p.pose;
    let down = 0;
    if (pose === "bow") {
      const k = p.bowT ?? 0;
      down = k < 0.35 ? k / 0.35 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
    }
    const bob = pose === "walk" ? Math.abs(Math.sin(t * 9 + p.x)) * 0.07 : 0;
    const onCushion = sit || (p.seat != null && pose === "bow");
    c.g.position.set(pos.X, floorAt(pos.X, pos.Z) + (onCushion ? 0.2 : 0.02) + bob, pos.Z);
    c.g.scale.setScalar(PERSON_SCALE);
    c.lower.visible = !sit;
    c.legs.visible = sit;
    c.lower.scale.y = 1 - 0.45 * down;
    c.upper.position.y = sit ? 0.3 : 0.72 - 0.34 * down;
    c.upper.rotation.x = down * 1.15;
    c.g.rotation.z = pose === "walk" ? Math.sin(t * 9 + p.x) * 0.05 : 0;
    c.hands.visible = pose === "join" || pose === "sit" || pose === "bow";
    if (c.ring) c.ring.material.opacity = 0.55 + 0.3 * Math.sin(t * 2.4);
    const pl = p.pulse ?? 0;
    c.pulse.material.opacity = Math.max(0, pl) * 0.8;
    c.pulse.scale.setScalar(1 + (1 - pl) * 0.8);
  }

  // ── Đám đông: người chơi khác vẽ bằng InstancedMesh (vài lệnh vẽ cho 200 người) ──
  const PERSON_SCALE = 0.8;
  const crowd = (() => {
    const N = TUNING.room.capacity;
    const latheGeo = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 12);
    const lowerGeo = latheGeo([
      [0.001, 0],
      [0.56, 0],
      [0.5, 0.25],
      [0.42, 0.6],
      [0.38, 0.76],
      [0.001, 0.76],
    ]);
    const upperGeo = latheGeo([
      [0.001, 0],
      [0.41, 0],
      [0.37, 0.34],
      [0.27, 0.55],
      [0.15, 0.63],
      [0.001, 0.63],
    ]);
    const legsGeo = new THREE.SphereGeometry(0.5, 12, 6);
    legsGeo.scale(1.25, 0.42, 1.0);
    const robeMat = lambert(0xffffff);
    const parts = {
      lower: new THREE.InstancedMesh(lowerGeo, robeMat, N),
      legs: new THREE.InstancedMesh(legsGeo, robeMat, N),
      upper: new THREE.InstancedMesh(upperGeo, robeMat, N),
      head: new THREE.InstancedMesh(new THREE.SphereGeometry(0.31, 12, 8), M.skin, N),
      hair: new THREE.InstancedMesh(new THREE.SphereGeometry(0.335, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.56), M.hair, N),
      tuft: new THREE.InstancedMesh(new THREE.SphereGeometry(0.075, 6, 4), M.hair, N),
    };
    // Create the per-instance color buffer before the first draw: three.js r128 decides
    // whether a material uses instance colors when it first compiles its shader.
    const white = new THREE.Color(0xffffff);
    for (const key of ["lower", "legs", "upper"]) for (let i = 0; i < N; i++) parts[key].setColorAt(i, white);
    for (const m of Object.values(parts)) {
      m.castShadow = true;
      m.count = 0;
      m.frustumCulled = false; // instances spread across the whole yard
      scene.add(m);
    }
    const color = new THREE.Color();
    const base = new THREE.Matrix4();
    const tmp = new THREE.Matrix4();
    const pivot = new THREE.Matrix4();
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    const q = new THREE.Quaternion();
    const yAxis = new V3(0, 1, 0);
    const state = new Map(); // id → { heading, prev }

    function update(peers, t) {
      let i = 0;
      const alive = new Set();
      for (const p of peers) {
        if (i >= N) break;
        alive.add(p.id);
        const pos = to3(p.x, p.y);
        const st = state.get(p.id) ?? { heading: Math.PI, prev: null };
        const walking = p.walking;
        if (walking && st.prev) {
          const dx = pos.X - st.prev.X;
          const dz = pos.Z - st.prev.Z;
          if (dx * dx + dz * dz > 1e-6) st.target = Math.atan2(dx, dz);
        } else if (!walking) st.target = Math.PI;
        let dh = (st.target ?? st.heading) - st.heading;
        dh = Math.atan2(Math.sin(dh), Math.cos(dh));
        st.heading += dh * 0.2;
        st.prev = pos;
        state.set(p.id, st);

        const sit = p.pose === "sit" && !walking;
        let down = 0;
        if (p.pose === "bow" && !walking) {
          const k = p.bowT ?? 0;
          down = k < 0.35 ? k / 0.35 : k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
        }
        const onCushion = sit || (p.seat != null && p.pose === "bow");
        const bob = walking ? Math.abs(Math.sin(t * 9 + p.x)) * 0.07 : 0;
        q.setFromAxisAngle(yAxis, st.heading);
        base.compose(new V3(pos.X, floorAt(pos.X, pos.Z) + (onCushion ? 0.2 : 0.02) + bob, pos.Z), q, new V3(PERSON_SCALE, PERSON_SCALE, PERSON_SCALE));

        parts.lower.setMatrixAt(i, sit ? zero : tmp.copy(base).multiply(new THREE.Matrix4().makeScale(1, 1 - 0.45 * down, 1)));
        parts.legs.setMatrixAt(i, sit ? tmp.copy(base).multiply(new THREE.Matrix4().makeTranslation(0, 0.17, 0.12)) : zero);
        pivot.copy(base).multiply(new THREE.Matrix4().makeTranslation(0, sit ? 0.3 : 0.72 - 0.34 * down, 0));
        pivot.multiply(new THREE.Matrix4().makeRotationX(down * 1.15));
        parts.upper.setMatrixAt(i, pivot);
        parts.head.setMatrixAt(i, tmp.copy(pivot).multiply(new THREE.Matrix4().makeTranslation(0, 0.93, 0)));
        if (p.head === "troc") {
          parts.hair.setMatrixAt(i, zero);
          parts.tuft.setMatrixAt(i, tmp.copy(pivot).multiply(new THREE.Matrix4().makeTranslation(0, 1.21, 0.1)));
        } else {
          parts.tuft.setMatrixAt(i, zero);
          parts.hair.setMatrixAt(i, tmp.copy(pivot).multiply(new THREE.Matrix4().makeTranslation(0, 0.95, -0.02)).multiply(new THREE.Matrix4().makeRotationX(-0.32)));
        }
        color.setHex(ROBE[p.robe] ?? ROBE.lam);
        // A soft brighten on mõ / chuỗi hạt so neighbours notice, without any text.
        if (p.pulse > 0) color.lerp(new THREE.Color(0xf0ce78), p.pulse * 0.5);
        parts.lower.setColorAt(i, color);
        parts.legs.setColorAt(i, color);
        parts.upper.setColorAt(i, color);
        i++;
      }
      for (const m of Object.values(parts)) {
        m.count = i;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      for (const id of state.keys()) if (!alive.has(id)) state.delete(id);
    }
    return { update };
  })();

  // ── Camera ────────────────────────────────────────────────────────────────
  const cam = {
    theta: 0,
    phi: 0.88,
    radius: 40,
    target: new V3(0, 0, -5),
    want: { theta: 0, phi: 0.88, radius: 40 },
    userZoomed: false,
  };
  function defaultRadius() {
    return camera.aspect < 0.75 ? 44 : camera.aspect < 1.1 ? 40 : 34;
  }

  function resize() {
    const w = canvas.clientWidth || 1;
    const h = canvas.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = camera.aspect < 0.75 ? 56 : 42;
    camera.updateProjectionMatrix();
    if (!cam.userZoomed) cam.want.radius = defaultRadius();
  }

  function updateCamera(st, dt) {
    const meditating = st.meditating;
    const p = to3(st.me.x, st.me.y);
    const portrait = camera.aspect < 0.75;
    const focus = meditating
      ? new V3(p.X, 0.8, p.Z)
      : new V3(p.X * (portrait ? 0.75 : 0.35), 0, p.Z * (portrait ? 0.7 : 0.45) - (portrait ? 3 : 6));
    cam.target.lerp(focus, Math.min(1, dt * 2.2));
    const want = meditating ? { theta: cam.want.theta + (st.reduceMotion ? 0 : dt * 0.05), phi: 1.05, radius: 15 } : cam.want;
    if (meditating) cam.want.theta = want.theta;
    const k = Math.min(1, dt * 3.5);
    cam.theta += (want.theta - cam.theta) * k;
    cam.phi += (want.phi - cam.phi) * k;
    cam.radius += (want.radius - cam.radius) * k;
    const sp = Math.sin(cam.phi);
    camera.position.set(
      cam.target.x + cam.radius * sp * Math.sin(cam.theta),
      cam.target.y + cam.radius * Math.cos(cam.phi),
      cam.target.z + cam.radius * sp * Math.cos(cam.theta),
    );
    camera.lookAt(cam.target.x, cam.target.y + 1.5, cam.target.z);
  }

  // ── Input: kéo xoay, chụm thu phóng, chạm để đi ──────────────────────────
  const pointers = new Map();
  let drag = null;
  let tapHandler = () => {};
  let takenFn = () => new Set();
  const listeners = [];
  const on = (el, type, fn, opts) => {
    el.addEventListener(type, fn, opts);
    listeners.push([el, type, fn, opts]);
  };
  on(canvas, "pointerdown", (ev) => {
    canvas.setPointerCapture?.(ev.pointerId);
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (pointers.size === 1) drag = { x0: ev.clientX, y0: ev.clientY, moved: false, pinch: null };
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      drag = { ...(drag ?? {}), moved: true, pinch: { d: Math.hypot(a.x - b.x, a.y - b.y), r: cam.want.radius } };
    }
  });
  on(canvas, "pointermove", (ev) => {
    const prev = pointers.get(ev.pointerId);
    if (!prev || !drag) return;
    const dx = ev.clientX - prev.x;
    const dy = ev.clientY - prev.y;
    pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
    if (drag.pinch && pointers.size >= 2) {
      const [a, b] = [...pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      cam.want.radius = Math.min(80, Math.max(12, (drag.pinch.r * drag.pinch.d) / Math.max(1, d)));
      cam.userZoomed = true;
      return;
    }
    if (!drag.moved && Math.hypot(ev.clientX - drag.x0, ev.clientY - drag.y0) < 8) return;
    drag.moved = true;
    cam.want.theta -= dx * 0.006;
    cam.want.phi = Math.min(1.38, Math.max(0.45, cam.want.phi - dy * 0.004));
  });
  const end = (ev) => {
    const wasTap = drag && !drag.moved && pointers.size === 1;
    pointers.delete(ev.pointerId);
    if (pointers.size === 0) {
      if (wasTap && ev.type === "pointerup") tapHandler(pick(ev.clientX, ev.clientY));
      drag = null;
    }
  };
  on(canvas, "pointerup", end);
  on(canvas, "pointercancel", end);
  on(
    canvas,
    "wheel",
    (ev) => {
      ev.preventDefault();
      cam.want.radius = Math.min(80, Math.max(12, cam.want.radius * (1 + Math.sign(ev.deltaY) * 0.1)));
      cam.userZoomed = true;
    },
    { passive: false },
  );
  on(globalThis, "keydown", (ev) => {
    if (ev.target && /INPUT|TEXTAREA|BUTTON/.test(ev.target.tagName)) return;
    if (ev.key === "ArrowLeft") cam.want.theta += 0.15;
    else if (ev.key === "ArrowRight") cam.want.theta -= 0.15;
    else if (ev.key === "ArrowUp") cam.want.phi = Math.max(0.45, cam.want.phi - 0.08);
    else if (ev.key === "ArrowDown") cam.want.phi = Math.min(1.38, cam.want.phi + 0.08);
    else if (ev.key === "+" || ev.key === "=") cam.want.radius = Math.max(12, cam.want.radius * 0.9);
    else if (ev.key === "-") cam.want.radius = Math.min(80, cam.want.radius * 1.1);
    else return;
    cam.userZoomed = true;
  });

  const raycaster = new THREE.Raycaster();
  const groundPlane = new THREE.Plane(new V3(0, 1, 0), -0.1);
  const floorPlane = new THREE.Plane(new V3(0, 1, 0), -FLOOR);
  // Invisible volume over the dais: raycast still hits it, so tapping the altar walks there.
  const altarPick = (() => {
    const D0 = to3(LAYOUT.dais.x, LAYOUT.dais.y);
    const D1 = to3(LAYOUT.dais.x + LAYOUT.dais.w, LAYOUT.dais.y + LAYOUT.dais.h + 14);
    const m = new THREE.Mesh(new THREE.BoxGeometry(D1.X - D0.X, 6, D1.Z - D0.Z), new THREE.MeshBasicMaterial({ visible: false }));
    m.position.set((D0.X + D1.X) / 2, FLOOR + 3, (D0.Z + D1.Z) / 2);
    m.userData.kind = "altar";
    scene.add(m);
    return m;
  })();
  const interactive = [altarPick, bowl, bellTower, pondGroup, ...cushionMeshes];

  /** Đổi điểm chạm thành kết quả giống world.hitTest (cushion/altar/bell/pond/walk/taken). */
  function pick(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const taken = takenFn();
    const hits = raycaster.intersectObjects(interactive, true);
    for (const h of hits) {
      let o = h.object;
      if (o.userData.cushionInstanced && h.instanceId != null) {
        const c = CUSHIONS[h.instanceId];
        return taken.has(c.index) ? { kind: "taken", cushion: c.index } : { kind: "cushion", cushion: c.index, stand: { x: c.x, y: c.y } };
      }
      while (o && o.userData.cushion === undefined && !o.userData.kind) o = o.parent;
      if (!o) continue;
      if (o.userData.cushion !== undefined) {
        const c = CUSHIONS[o.userData.cushion];
        return taken.has(c.index) ? { kind: "taken", cushion: c.index } : { kind: "cushion", cushion: c.index, stand: { x: c.x, y: c.y } };
      }
      const spot = HOTSPOTS.find((s) => s.kind === o.userData.kind);
      if (spot) return { kind: spot.kind, stand: spot.stand };
    }
    const f = raycaster.ray.intersectPlane(floorPlane, new V3());
    if (f && inHallFootprint(f.x, f.z)) return hitTest(from3(f.x, f.z), taken);
    const g = raycaster.ray.intersectPlane(groundPlane, new V3());
    if (!g) return null;
    return hitTest(from3(g.x, g.z), taken);
  }

  // ── Khung hình ────────────────────────────────────────────────────────────
  let lastT = null;
  let lastSkyKey = "";
  function render(st) {
    const { t, env } = st;
    const dt = lastT == null ? 0.016 : Math.min(0.1, t - lastT);
    lastT = t;
    const night = env.sky.night;
    const k = Math.min(1, env.sky.dark / 0.5);

    const skyKey = `${env.sky.top}|${env.sky.bottom}`;
    if (skyKey !== lastSkyKey) {
      paintSky(env.sky.top, env.sky.bottom);
      lastSkyKey = skyKey;
    }
    stars.material.opacity = night ? 0.9 * k : 0;
    stars.rotation.y = t * 0.002;
    paintMoon(st.dayInfo.moonPhase);
    const ram = st.dayInfo.special === "ram";
    moon.visible = moonGlow.visible = night;
    moon.scale.setScalar(ram ? 46 : 36);
    moonGlow.material.opacity = ram ? 0.5 : 0.3;

    // Sun travels east (+X) to west over the southern sky; at night the moon lights the yard.
    const a = Math.min(1, Math.max(0, (env.hour - 6) / 12)) * Math.PI;
    const dir = night ? new V3(-moonDir.x, 0.8, 0.4) : new V3(Math.cos(a), Math.max(0.15, Math.sin(a)), 0.55);
    sun.position.copy(dir.normalize().multiplyScalar(90));
    sun.color.set(night ? 0x9fb0ff : 0xfff1d8);
    sun.intensity = night ? 0.3 : 0.72 - k * 0.35;
    hemi.intensity = 0.62 - k * 0.38;
    hemi.color.set(night ? 0x6070a0 : 0xdfe9ff);
    const flick = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 7.3);
    hallLight.intensity = (1.1 + k * 1.6) * flick;
    for (const l of hallLights) l.intensity = (0.5 + k * 1.2) * flick;
    for (const g of lanterns3d) g.material.opacity = 0.25 + k * 0.6;
    // Lift the roof away while you are inside the hall, so the seated rows show.
    const inside = st.entered && zoneOf(st.me) === "hall";
    roofOpacity += ((inside ? 0.12 : 1) - roofOpacity) * Math.min(1, dt * 4);
    for (const m of Object.values(roofMats)) {
      m.opacity = roofOpacity;
      m.depthWrite = roofOpacity > 0.95;
    }
    for (const c of hall.userData.candles) c.scale.setScalar(0.9 + 0.2 * flick);
    cloudMat.opacity = night ? 0.08 : 0.55;
    for (const c of clouds) {
      if (!st.reduceMotion) c.userData.a += c.userData.speed * dt;
      c.position.x = Math.sin(c.userData.a) * c.userData.d;
      c.position.z = -Math.cos(c.userData.a) * c.userData.d;
    }

    // Bell swing + striker
    const ba = t - st.bellSwing;
    const swing = ba > 0 && ba < 5 ? Math.sin(ba * 5) * 0.16 * Math.exp(-ba * 1.0) : 0;
    bellPivot.rotation.x = swing;
    striker.position.x = 1.75 + (ba > 0 && ba < 0.6 ? -Math.sin((ba / 0.6) * Math.PI) * 0.75 : 0);

    // Ripples (bell sound spreading through the yard)
    let ri = 0;
    for (const r0 of st.ripples) {
      for (let j = 0; j < 3 && ri < rippleMeshes.length; j++) {
        const age = t - r0 - j * 0.5;
        if (age < 0 || age > 5) continue;
        const m = rippleMeshes[ri++];
        m.visible = true;
        m.scale.setScalar(1 + age * 9);
        m.material.opacity = 0.5 * (1 - age / 5);
      }
    }
    for (; ri < rippleMeshes.length; ri++) rippleMeshes[ri].visible = false;

    // Incense sticks, embers and smoke
    for (let i = 0; i < sticks.length; i++) {
      const s = st.sticks[i];
      const { s: m, tip } = sticks[i];
      m.visible = tip.visible = !!s;
      if (!s) continue;
      const len = 1.1 * (1 - s.burn * 0.75);
      const b = m.userData.base;
      m.scale.y = len;
      m.position.set(b.x, b.y + len / 2, b.z);
      tip.position.set(b.x, b.y + len, b.z);
      if (!st.reduceMotion && Math.random() < 0.06) {
        const p = smoke[smokeCursor++ % smoke.length];
        Object.assign(p, { born: t, x: b.x, y: b.y + len, z: b.z, seed: Math.random() * 10 });
      }
    }
    for (const p of smoke) {
      const age = t - p.born;
      if (age < 0 || age > 4.5) {
        p.sp.visible = false;
        continue;
      }
      p.sp.visible = true;
      p.sp.position.set(p.x + Math.sin(age * 1.4 + p.seed) * (0.1 + age * 0.25), p.y + age * 0.9, p.z + Math.cos(age + p.seed) * age * 0.12);
      p.sp.scale.setScalar(0.25 + age * 0.35);
      p.sp.material.opacity = 0.32 * (1 - age / 4.5);
    }

    // Lanterns
    for (let i = 0; i < lanternPool.length; i++) {
      const l = st.lanterns[i];
      const L = lanternPool[i];
      L.g.visible = !!l;
      if (!l) continue;
      const p = to3(l.pos.x, l.pos.y);
      L.g.position.set(p.X, 0.2 + Math.sin(t * 1.3 + i) * 0.03, p.Z);
      L.g.rotation.y = t * 0.1 + i;
      L.mat.color.setHex(LANTERN[l.color] ?? LANTERN.sen);
      L.mat.emissive.setHex(night ? 0x5a3010 : 0x2a1408);
      L.gl.material.opacity = (night ? 0.85 : 0.45) * l.pos.fade;
      L.g.scale.setScalar(1.25 * Math.max(0.2, l.pos.fade));
    }

    // Fireflies
    fireflies.material.opacity = night && !st.reduceMotion ? 0.9 : 0;
    if (night) {
      const arr = fireflyGeo.attributes.position.array;
      for (let i = 0; i < 14; i++) {
        arr[i * 3] = pondC.X - 6 + ((i * 3.7) % 14) + Math.sin(t * 0.5 + i) * 1.2;
        arr[i * 3 + 1] = 0.8 + Math.sin(t * 0.7 + i * 2) * 0.5;
        arr[i * 3 + 2] = pondC.Z - 6 + ((i * 5.3) % 12) + Math.cos(t * 0.4 + i) * 1.2;
      }
      fireflyGeo.attributes.position.needsUpdate = true;
    }

    // People
    for (const c of people.values()) c.seen = false;
    if (st.entered) {
      syncPerson("me", st.me, t, true);
    }
    crowd.update(st.entered ? st.peers : [], t);
    for (const [id, c] of people) {
      if (!c.seen) {
        scene.remove(c.g);
        people.delete(id);
      }
    }

    updateCamera(st, dt);
    sun.target.position.copy(cam.target);
    renderer.render(scene, camera);
  }

  function onTap(handler, takenSeats) {
    tapHandler = handler;
    takenFn = takenSeats;
  }

  function worldToScreen(x, y, h = 0) {
    const p = to3(x, y);
    const v = new V3(p.X, h, p.Z).project(camera);
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + ((v.x + 1) / 2) * rect.width, y: rect.top + ((1 - v.y) / 2) * rect.height };
  }

  function invalidate() {
    // Redraw the name board once web fonts have loaded.
    const tex = hall.userData.board;
    const g = tex.image.getContext("2d");
    g.fillStyle = "#b8903c";
    g.fillRect(4, 4, 248, 40);
    g.fillStyle = "#5a1e12";
    g.font = "600 26px 'Be Vietnam Pro', system-ui, sans-serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("AM MÂY", 128, 26);
    tex.needsUpdate = true;
  }

  // ── Mô hình tải ngoài (glTF/GLB) ──────────────────────────────────────────
  const procedural = { hall, bellTower, gate, walls };
  const loadedCredits = [];

  /** Co giãn và đặt mô hình vào vùng của ô, ẩn phần dựng bằng code mà nó thay thế. */
  function placeModel(obj, slot) {
    obj.rotation.y = slot.yaw ?? 0;
    obj.updateMatrixWorld(true);
    const size = new THREE.Box3().setFromObject(obj).getSize(new V3());
    obj.scale.setScalar(Math.min(slot.width / Math.max(size.x, 1e-3), slot.depth / Math.max(size.z, 1e-3)));
    obj.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(obj);
    const c = box2.getCenter(new V3());
    obj.position.x += slot.center[0] - c.x;
    obj.position.z += slot.center[1] - c.z;
    obj.position.y += (slot.y ?? 0) - box2.min.y;
    obj.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true;
      o.receiveShadow = true;
      // The renderer outputs linear colors (like the hand-built scene); show textures as authored.
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        for (const key of ["map", "emissiveMap"]) {
          if (m?.[key]) {
            m[key].encoding = THREE.LinearEncoding;
            m[key].needsUpdate = true;
          }
        }
      }
    });
    obj.userData.kind = slot.kind;
    scene.add(obj);
    for (const id of slot.hides ?? []) {
      const part = procedural[id];
      if (!part) continue;
      part.visible = false;
      const i = interactive.indexOf(part);
      if (i >= 0) interactive.splice(i, 1);
    }
    interactive.push(obj);
    loadedCredits.push(slot.credit);
  }

  function loadModels() {
    if (!THREE.GLTFLoader) return;
    const loader = new THREE.GLTFLoader();
    for (const slot of MODEL_SLOTS) {
      if (!slot.enabled) continue;
      // A missing file is normal (the model is optional): keep the hand-built part.
      loader.load(slot.url, (gltf) => placeModel(gltf.scene, slot), undefined, () => {});
    }
  }

  function dispose() {
    for (const [el, type, fn, opts] of listeners) el.removeEventListener(type, fn, opts);
    renderer.dispose();
    renderer.forceContextLoss?.();
  }

  resize();
  cam.radius = cam.want.radius;
  canvas.style.touchAction = "none";
  loadModels();
  return { kind: "3d", resize, render, onTap, worldToScreen, invalidate, dispose, credits: () => [...loadedCredits] };
}
