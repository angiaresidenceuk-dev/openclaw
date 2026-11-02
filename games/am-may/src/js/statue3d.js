// Tượng Phật Thích Ca phỏng theo mô tả tượng Phật Pháp Chủ ở chùa Bái Đính
// (Ninh Bình): ngồi trên toà sen ba tầng, chỉ lộ bàn chân phải; tay phải giơ
// ngang tầm đầu cầm nụ sen, tay trái ngửa trên chân trước bụng; tóc xoắn ốc có
// nhục kế, tai dài, mắt nhìn xuống; hào quang lá bồ đề thếp vàng gắn nhiều tượng
// Phật nhỏ. Dựng hoàn toàn bằng khối hình học trong code — một cách diễn giải
// theo hình tượng truyền thống, không phải bản sao đo đạc của pho tượng thật.
//
// Hệ toạ độ riêng: gốc ở tâm đáy toà sen, trục Y lên, tượng nhìn về +Z.
// Cao tới đỉnh nhục kế ≈ 6.3 đơn vị; hào quang cao ≈ 9.5 đơn vị phía sau.

/**
 * @param {any} THREE  Three.js r128
 * @param {{gold:any, goldDark:any, lotus:any}} mats  vật liệu thếp vàng
 * @returns {any} THREE.Group
 */
export function buildPhapChuStatue(THREE, mats) {
  const V3 = THREE.Vector3;
  const root = new THREE.Group();
  root.name = "phap-chu-statue";
  const { gold, goldDark, lotus } = mats;

  const add = (parent, geo, mat, x = 0, y = 0, z = 0) => {
    const o = new THREE.Mesh(geo, mat);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  };
  const ellipsoid = (parent, mat, [x, y, z], [sx, sy, sz], seg = 20) => {
    const o = add(parent, new THREE.SphereGeometry(1, seg, Math.max(8, seg / 2)), mat, x, y, z);
    o.scale.set(sx, sy, sz);
    return o;
  };
  const tube = (parent, pts, r, mat, seg = 24) =>
    add(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p))), seg, r, 10, false), mat);
  const lathe = (pts, seg = 32) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

  // ── Toà sen ba tầng ─────────────────────────────────────────────────────────
  // A pointed petal (spindle lathe, flattened); base at y = 0, tip up.
  const petalGeo = lathe(
    [
      [0.001, 0],
      [0.22, 0.12],
      [0.3, 0.42],
      [0.24, 0.75],
      [0.1, 0.98],
      [0.001, 1.08],
    ],
    12,
  );
  petalGeo.scale(1, 1, 0.34);
  const ring = (count, radius, y, tilt, size, mat, phase = 0) => {
    const g = new THREE.Group();
    for (let i = 0; i < count; i++) {
      const a = ((i + phase) / count) * Math.PI * 2;
      const p = new THREE.Mesh(petalGeo, mat);
      p.castShadow = true;
      p.position.set(Math.sin(a) * radius, y, Math.cos(a) * radius);
      p.rotation.order = "YXZ";
      p.rotation.set(tilt, a, 0);
      p.scale.setScalar(size);
      g.add(p);
    }
    root.add(g);
  };
  add(root, new THREE.CylinderGeometry(2.95, 3.15, 0.35, 40), goldDark, 0, 0.175, 0);
  ring(20, 2.75, 0.95, Math.PI * 0.78, 0.95, lotus); // drooping tier
  add(root, new THREE.CylinderGeometry(2.45, 2.55, 0.55, 40), goldDark, 0, 0.72, 0);
  ring(18, 2.5, 0.95, 0.62, 1.15, lotus); // large petals, upward
  ring(18, 2.3, 1.22, 0.42, 0.78, lotus, 0.5); // small petals, staggered
  add(root, new THREE.CylinderGeometry(2.3, 2.38, 0.22, 40), gold, 0, 1.55, 0);
  const y0 = 1.66; // seat

  // ── Thân, chân xếp, bàn chân phải ──────────────────────────────────────────
  ellipsoid(root, gold, [0, y0 + 0.52, 0.32], [2.3, 0.6, 1.42], 28);
  for (const sx of [-1, 1]) ellipsoid(root, gold, [sx * 1.92, y0 + 0.48, 0.72], [0.66, 0.5, 0.68]);
  // Only the right foot shows, sole up, resting on the left thigh (statue's left = +X).
  const foot = ellipsoid(root, gold, [0.78, y0 + 1.0, 0.98], [0.56, 0.17, 0.27]);
  foot.rotation.y = 0.35;
  for (let i = 0; i < 5; i++) ellipsoid(root, gold, [0.32 + i * 0.06, y0 + 1.04, 1.12 - i * 0.05], [0.06, 0.05, 0.05], 8);
  // Robe hem folds across the lap
  for (let k = 0; k < 3; k++) {
    tube(root, [
      [-2.1, y0 + 0.62 + k * 0.08, 0.95 - k * 0.15],
      [-0.9, y0 + 0.48 + k * 0.08, 1.32 - k * 0.12],
      [0.4, y0 + 0.5 + k * 0.08, 1.35 - k * 0.12],
      [2.1, y0 + 0.62 + k * 0.08, 0.95 - k * 0.15],
    ], 0.045, goldDark);
  }
  const torso = add(
    root,
    lathe([
      [0.001, 0.55],
      [1.18, 0.55],
      [1.26, 1.2],
      [1.36, 1.9],
      [1.42, 2.55],
      [1.3, 2.86],
      [0.86, 3.06],
      [0.42, 3.16],
      [0.001, 3.16],
    ]),
    gold,
    0,
    y0,
    0,
  );
  torso.scale.z = 0.72;
  // Cà sa: the robe sweeps from the left shoulder across the chest to the right waist.
  for (const off of [0, 0.22]) {
    tube(root, [
      [1.28, y0 + 2.86 - off, 0.42],
      [0.62, y0 + 2.36 - off, 0.86],
      [-0.2, y0 + 1.86 - off, 0.94],
      [-0.98, y0 + 1.3 - off, 0.86],
    ], 0.06, goldDark);
  }

  // ── Cổ, đầu, khuôn mặt ─────────────────────────────────────────────────────
  add(root, new THREE.CylinderGeometry(0.34, 0.4, 0.5, 20), gold, 0, y0 + 3.32, 0);
  for (let i = 0; i < 3; i++) {
    const fold = add(root, new THREE.TorusGeometry(0.36 - i * 0.01, 0.022, 6, 28), goldDark, 0, y0 + 3.18 + i * 0.1, 0);
    fold.rotation.x = Math.PI / 2;
  }
  const hy = y0 + 4.02;
  ellipsoid(root, gold, [0, hy, 0], [0.61, 0.72, 0.63], 32);
  const faceZ = 0.6;
  const arc = (r, t, x, y, z, flip) => {
    const o = add(root, new THREE.TorusGeometry(r, t, 4, 14, Math.PI), goldDark, x, y, z);
    if (flip) o.rotation.z = Math.PI;
    return o;
  };
  for (const sx of [-1, 1]) {
    arc(0.11, 0.016, sx * 0.2, hy + 0.06, faceZ - 0.02, true); // downcast eyes
    arc(0.14, 0.014, sx * 0.21, hy + 0.17, faceZ - 0.05, false); // brows
    // Long earlobes
    ellipsoid(root, gold, [sx * 0.61, hy - 0.12, -0.02], [0.12, 0.4, 0.18]);
  }
  ellipsoid(root, gold, [0, hy - 0.04, faceZ + 0.03], [0.065, 0.15, 0.08], 12); // nose
  arc(0.085, 0.014, 0, hy - 0.24, faceZ - 0.06, true); // a faint smile
  ellipsoid(root, goldDark, [0, hy + 0.3, faceZ - 0.02], [0.03, 0.03, 0.03], 8); // bạch hào

  // Snail-shell curls over the head and the ushnisha (nhục kế), instanced.
  const curlGeo = new THREE.SphereGeometry(0.06, 8, 6);
  const curlPts = [];
  const fib = (n, cx, cy, cz, rx, ry, rz, keep) => {
    const golden = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < n; i++) {
      const yy = 1 - (i / (n - 1)) * 2;
      const rr = Math.sqrt(1 - yy * yy);
      const th = golden * i;
      const p = new V3(Math.cos(th) * rr, yy, Math.sin(th) * rr);
      if (keep(p)) curlPts.push(new V3(cx + p.x * rx, cy + p.y * ry, cz + p.z * rz));
    }
  };
  // Hairline sits above the brows in front and lower at the back.
  fib(600, 0, hy, 0, 0.65, 0.75, 0.67, (p) => (p.z > 0.25 ? p.y > 0.42 : p.y > -0.1 + Math.max(0, p.z) * 0.6));
  fib(150, 0, hy + 0.72, -0.03, 0.35, 0.32, 0.35, (p) => p.y > -0.55);
  const curls = new THREE.InstancedMesh(curlGeo, goldDark, curlPts.length);
  const m4 = new THREE.Matrix4();
  curlPts.forEach((p, i) => curls.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  curls.castShadow = true;
  root.add(curls);
  ellipsoid(root, gold, [0, hy + 0.72, -0.03], [0.32, 0.3, 0.32]);
  add(root, new THREE.ConeGeometry(0.06, 0.16, 10), gold, 0, hy + 1.08, -0.03);

  // ── Hai tay ────────────────────────────────────────────────────────────────
  // Right arm (statue's right = −X) raised; the hand at head height holds a lotus bud.
  tube(root, [
    [-1.32, y0 + 2.78, 0.0],
    [-1.68, y0 + 2.2, 0.28],
    [-1.74, y0 + 1.72, 0.58],
  ], 0.31, gold);
  tube(root, [
    [-1.74, y0 + 1.72, 0.58],
    [-1.5, y0 + 2.4, 0.95],
    [-1.24, y0 + 3.02, 1.08],
  ], 0.25, gold);
  const sleeveR = ellipsoid(root, gold, [-1.86, y0 + 1.5, 0.62], [0.3, 0.62, 0.16]);
  sleeveR.rotation.z = -0.15;
  ellipsoid(root, gold, [-1.2, y0 + 3.3, 1.1], [0.17, 0.3, 0.1]); // hand, palm forward
  const pinch = add(root, new THREE.TorusGeometry(0.07, 0.025, 6, 14), gold, -1.16, y0 + 3.5, 1.18);
  pinch.rotation.y = Math.PI / 2;
  tube(root, [
    [-1.17, y0 + 3.45, 1.16],
    [-1.15, y0 + 3.7, 1.17],
    [-1.13, y0 + 3.9, 1.16],
  ], 0.025, lotus);
  const bud = add(
    root,
    lathe(
      [
        [0.001, 0],
        [0.11, 0.07],
        [0.15, 0.2],
        [0.1, 0.36],
        [0.001, 0.48],
      ],
      14,
    ),
    lotus,
    -1.13,
    y0 + 3.9,
    1.16,
  );
  bud.castShadow = true;
  // Left arm rests; the hand lies palm-up on the right leg, in front of the belly.
  tube(root, [
    [1.32, y0 + 2.78, 0.0],
    [1.72, y0 + 2.15, 0.25],
    [1.86, y0 + 1.6, 0.48],
  ], 0.31, gold);
  tube(root, [
    [1.86, y0 + 1.6, 0.48],
    [0.9, y0 + 1.22, 1.0],
    [-0.15, y0 + 1.12, 1.14],
  ], 0.25, gold);
  const sleeveL = ellipsoid(root, gold, [1.98, y0 + 1.35, 0.5], [0.3, 0.58, 0.16]);
  sleeveL.rotation.z = 0.15;
  ellipsoid(root, gold, [-0.45, y0 + 1.12, 1.18], [0.34, 0.1, 0.22]); // palm-up hand

  // ── Hào quang lá bồ đề ─────────────────────────────────────────────────────
  const leafShape = (k) => {
    const s = new THREE.Shape();
    s.moveTo(0, 0.3 * k);
    s.bezierCurveTo(-2.2 * k, -0.2 * k, -3.6 * k, 1.6 * k, -3.4 * k, 3.8 * k);
    s.bezierCurveTo(-3.2 * k, 6.0 * k, -1.6 * k, 7.4 * k, -0.35 * k, 8.3 * k);
    s.quadraticCurveTo(-0.08 * k, 8.8 * k, 0, 9.4 * k);
    s.quadraticCurveTo(0.08 * k, 8.8 * k, 0.35 * k, 8.3 * k);
    s.bezierCurveTo(1.6 * k, 7.4 * k, 3.2 * k, 6.0 * k, 3.4 * k, 3.8 * k);
    s.bezierCurveTo(3.6 * k, 1.6 * k, 2.2 * k, -0.2 * k, 0, 0.3 * k);
    return s;
  };
  const LEAF = 0.9; // overall scale of the leaf
  const leafY = 1.0;
  const leafZ = -1.45;
  const field = add(root, new THREE.ExtrudeGeometry(leafShape(LEAF), { depth: 0.16, bevelEnabled: true, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 1, curveSegments: 24 }), goldDark, 0, leafY, leafZ);
  field.receiveShadow = true;
  const rimShape = leafShape(LEAF);
  const inner = leafShape(LEAF * 0.9);
  // The smaller outline is lifted so the gold rim has an even width all round.
  const hole = new THREE.Path(inner.getPoints(96).map((p) => new THREE.Vector2(p.x, p.y + 0.42)));
  rimShape.holes.push(hole);
  add(root, new THREE.ExtrudeGeometry(rimShape, { depth: 0.14, bevelEnabled: false, curveSegments: 24 }), gold, 0, leafY, leafZ + 0.16);
  // Veins radiating from the base
  for (const a of [-1, -0.6, -0.25, 0.25, 0.6, 1]) {
    tube(root, [
      [0, leafY + 0.8, leafZ + 0.2],
      [a * 1.2, leafY + 3.2, leafZ + 0.2],
      [a * 2.2, leafY + 5.6 - Math.abs(a) * 1.2, leafZ + 0.2],
    ], 0.035, gold, 16);
  }
  // Head nimbus
  const nimbus = add(root, new THREE.TorusGeometry(1.05, 0.06, 8, 48), gold, 0, hy + 0.05, leafZ + 0.32);
  nimbus.castShadow = false;
  add(root, new THREE.CircleGeometry(1.0, 48), gold, 0, hy + 0.05, leafZ + 0.27);

  // Many small seated Buddhas set into the leaf (the Dharma reaching everywhere).
  const smallBody = lathe(
    [
      [0.001, 0],
      [0.13, 0],
      [0.11, 0.08],
      [0.075, 0.16],
      [0.04, 0.2],
      [0.001, 0.2],
    ],
    8,
  );
  const smallHead = new THREE.SphereGeometry(0.05, 8, 6);
  smallHead.translate(0, 0.25, 0);
  const smallBase = new THREE.CylinderGeometry(0.12, 0.1, 0.04, 8);
  const spots = [];
  for (const k of [0.82, 0.68, 0.54]) {
    const pts = leafShape(LEAF * k).getSpacedPoints(Math.round(64 * k));
    for (const p of pts) {
      const y = p.y + (1 - k) * 4.2 * LEAF; // lift inner rings toward the leaf's center
      // Leave the body and nimbus of the main figure clear.
      if (Math.abs(p.x) < 1.6 && y < hy + 1.3 - leafY) continue;
      spots.push([p.x, leafY + y, leafZ + 0.3]);
    }
  }
  for (const [geo, mat] of [
    [smallBody, gold],
    [smallHead, gold],
    [smallBase, goldDark],
  ]) {
    const inst = new THREE.InstancedMesh(geo, mat, spots.length);
    spots.forEach(([x, y, z], i) => inst.setMatrixAt(i, m4.makeTranslation(x, y, z)));
    root.add(inst);
  }

  return root;
}
