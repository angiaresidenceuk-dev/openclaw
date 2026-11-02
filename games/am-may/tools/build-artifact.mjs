#!/usr/bin/env node
// Gộp src/ thành MỘT tệp HTML (CSS + JS nội tuyến) để đăng lên nơi chỉ nhận
// một trang, ví dụ Claude Artifact, itch.io dạng HTML đơn, hoặc gửi qua Zalo.
//   node tools/build-artifact.mjs [out.html] [--fragment]
// --fragment: bỏ <!doctype>/<head>/<body> (trang sẽ được bọc khung bởi nơi đăng).

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(ROOT, "src");
const args = process.argv.slice(2);
const fragment = args.includes("--fragment");
const outPath = args.find((a) => !a.startsWith("--")) ?? join(ROOT, "dist/am-may.html");

// Dependency order: every module appears after the modules it imports.
const ORDER = ["tuning", "lunar", "rituals", "meditation", "world", "render", "audio", "presence", "share", "main"];

function bundleModule(name) {
  let code = readFileSync(join(SRC, "js", `${name}.js`), "utf8");
  const exported = [];
  code = code.replace(/import\s*\{([^}]*)\}\s*from\s*"\.\/([\w-]+)\.js";/gs, (_, names, from) => {
    if (!ORDER.includes(from)) throw new Error(`${name}.js imports unknown module ${from}`);
    return `const {${names}} = __m.${from};`;
  });
  code = code.replace(/^export\s+(async\s+function|function|const|let|class)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, id) => {
    exported.push(id);
    return `${kind} ${id}`;
  });
  if (/^\s*(import|export)\s/m.test(code)) throw new Error(`${name}.js has an import/export the bundler does not handle`);
  return `__m.${name} = (() => {\n${code}\nreturn { ${exported.join(", ")} };\n})();\n`;
}

const js = `const __m = {};\n${ORDER.map(bundleModule).join("\n")}`;
const css = readFileSync(join(SRC, "styles.css"), "utf8");
const html = readFileSync(join(SRC, "index.html"), "utf8");
const body = html.split("<!--AM-MAY-BODY-START-->")[1].split("<!--AM-MAY-BODY-END-->")[0];
const fonts =
  '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600&family=Cormorant+Garamond:wght@600&display=swap">';

const page = fragment
  ? `<title>Am Mây</title>
<meta name="claude:viewport-fit-sides" content="cover">
${fonts}
<style>
${css}
</style>
${body}
<script type="module">
${js}
</script>
`
  : `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Am Mây</title>
<meta name="theme-color" content="#17110d">
${fonts}
<style>
${css}
</style>
</head>
<body>
${body}
<script type="module">
${js}
</script>
</body>
</html>
`;

mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, page);
console.log(`Wrote ${outPath} (${(Buffer.byteLength(page) / 1024).toFixed(1)} KB)`);
