#!/usr/bin/env node
// Xuất tượng Phật dựng bằng code (src/js/statue3d.js) ra GLB để mở và chỉnh trong Blender.
//   node server/presence-server.mjs &   (cổng 8787)
//   node tools/export-statue.mjs [out.glb]
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] ?? join(HERE, "../assets/blender/phap-chu-statue-base.glb");
const BASE = process.env.BASE_URL ?? "http://localhost:8787";

const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  await page.goto(`${BASE}/?mode=2d`, { timeout: 60000 });
  await page.addScriptTag({ content: readFileSync(join(HERE, "vendor/GLTFExporter.js"), "utf8") });
  const b64 = await page.evaluate(async () => {
    const THREE = globalThis.THREE;
    const { buildPhapChuStatue } = await import("/js/statue3d.js");
    const mat = (color, metalness, roughness) => new THREE.MeshStandardMaterial({ color, metalness, roughness });
    const group = buildPhapChuStatue(THREE, { gold: mat(0xe0b85a, 0.85, 0.3), goldDark: mat(0xb08a3a, 0.8, 0.42), lotus: mat(0xe9b07a, 0.6, 0.38) });
    group.updateMatrixWorld(true);
    // r128's exporter does not write InstancedMesh: bake each instance into one plain mesh.
    const baked = [];
    group.traverse((o) => {
      if (!o.isInstancedMesh) return;
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry;
      const per = src.attributes.position.count;
      const pos = new Float32Array(per * 3 * o.count);
      const nor = new Float32Array(per * 3 * o.count);
      const m = new THREE.Matrix4();
      const nm = new THREE.Matrix3();
      const v = new THREE.Vector3();
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m);
        nm.getNormalMatrix(m);
        for (let k = 0; k < per; k++) {
          v.fromBufferAttribute(src.attributes.position, k).applyMatrix4(m);
          pos.set([v.x, v.y, v.z], (i * per + k) * 3);
          v.fromBufferAttribute(src.attributes.normal, k).applyMatrix3(nm).normalize();
          nor.set([v.x, v.y, v.z], (i * per + k) * 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
      const mesh = new THREE.Mesh(geo, o.material);
      mesh.name = `${o.name || "instanced"}-baked`;
      baked.push([o, mesh]);
    });
    for (const [o, mesh] of baked) {
      o.parent.add(mesh);
      o.parent.remove(o);
    }
    const exporter = new THREE.GLTFExporter();
    const buf = await new Promise((res) => exporter.parse(group, res, { binary: true }));
    let s = "";
    const bytes = new Uint8Array(buf);
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    return btoa(s);
  });
  const data = Buffer.from(b64, "base64");
  writeFileSync(OUT, data);
  console.log(`Wrote ${OUT} (${(data.length / 1024).toFixed(0)} KB)`);
} finally {
  await browser.close();
}
