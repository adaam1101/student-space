import fs from "fs";
import path from "path";
import crypto from "crypto";

const root = process.cwd();

function walk(dir) {
  let res = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) res.push(...walk(full));
    else res.push(full);
  }
  return res;
}

const files = [
  path.join(root, "package.json"),
  path.join(root, "tsconfig.json"),
  path.join(root, "next.config.ts"),
  path.join(root, "postcss.config.mjs"),
  ...walk(path.join(root, "src")),
];

const manifest = files
  .map((f) => {
    const buf = fs.readFileSync(f);
    return {
      file: path.relative(root, f).replace(/\\/g, "/"),
      size: buf.length,
      sha: crypto.createHash("sha1").update(buf).digest("hex"),
      base64: buf.toString("base64"),
      utf8: buf.toString("utf8"),
    };
  })
  .sort((a, b) => b.size - a.size);

fs.writeFileSync(
  path.join(root, "data", "deploy-manifest.json"),
  JSON.stringify(manifest, null, 2),
  "utf8"
);

console.log(
  "Total files:",
  manifest.length,
  "Total bytes:",
  manifest.reduce((s, x) => s + x.size, 0)
);
for (let i = 0; i < 20 && i < manifest.length; i++) {
  console.log(
    `${i + 1}. ${manifest[i].file} (${manifest[i].size} bytes, sha=${manifest[i].sha})`
  );
}
