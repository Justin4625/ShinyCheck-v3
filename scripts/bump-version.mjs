// Stamps a fresh asset version so browsers load the new files after a deploy, and regenerates the
// file lists that depend on what's in css/ and js/:
//   index.html  the stylesheet links (css/*.css in name order) and the import map that gives every
//               JS module ?v=<version>, plus ?v= on the other scripts
//   sw.js       VERSION and the app files the service worker saves for offline use
// Runs from the pre-commit hook (scripts/bump-version.sh). Adding a CSS or JS file needs no other edit.
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const d = new Date(), p = n => String(n).padStart(2, "0");
const v = `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;

const walk = dir => readdirSync(dir).flatMap(f => {
  const full = join(dir, f);
  return statSync(full).isDirectory() ? walk(full) : [full];
});
const files = (dir, ext) => walk(join(ROOT, dir)).filter(f => f.endsWith(ext)).map(f => relative(ROOT, f).split("\\").join("/")).sort();
const css = files("css", ".css"), modules = files("js", ".js");

const between = (text, start, end, inner) => {
  const a = text.indexOf(start), b = text.indexOf(end);
  if (a < 0 || b < 0) throw new Error(`Markers ${start} … ${end} not found`);
  return text.slice(0, a + start.length) + inner + text.slice(b);
};

let html = readFileSync(join(ROOT, "index.html"), "utf8");
html = between(html, "<!-- css:start -->", "<!-- css:end -->",
  "\n" + css.map(f => `  <link rel="stylesheet" href="${f}?v=${v}">`).join("\n") + "\n  ");
const map = { imports: Object.fromEntries(modules.map(f => [`./${f}`, `./${f}?v=${v}`])) };
html = between(html, "<!-- importmap:start -->", "<!-- importmap:end -->",
  `\n  <script type="importmap">\n${JSON.stringify(map, null, 2).replace(/^/gm, "  ")}\n  </script>\n  `);
html = html.replace(/\?v=[0-9]+"/g, `?v=${v}"`);
writeFileSync(join(ROOT, "index.html"), html);

let sw = readFileSync(join(ROOT, "sw.js"), "utf8");
sw = sw.replace(/^const VERSION = "[0-9]+"/m, `const VERSION = "${v}"`);
const data = files("data", ".js");
sw = between(sw, "// files:start", "// files:end",
  "\n" + [...css, ...data, ...modules].map(f => `  \`${f}?v=\${VERSION}\`,`).join("\n") + "\n  ");
writeFileSync(join(ROOT, "sw.js"), sw);

console.log(`asset version ${v} · ${css.length} stylesheets · ${modules.length} modules`);
