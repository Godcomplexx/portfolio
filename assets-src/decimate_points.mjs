// Subsample point-cloud primitives in a GLB: keep every Nth point.
// Usage: node assets-src/decimate_points.mjs <in.glb> <out.glb> <stride>
import { NodeIO } from '@gltf-transform/core';
import { KHRONOS_EXTENSIONS } from '@gltf-transform/extensions';

const [inPath, outPath, strideArg] = process.argv.slice(2);
const stride = Number(strideArg) || 2;

const io = new NodeIO().registerExtensions(KHRONOS_EXTENSIONS);
const doc = await io.read(inPath);
const seen = new Set();
let before = 0;
let after = 0;

for (const mesh of doc.getRoot().listMeshes()) {
  for (const prim of mesh.listPrimitives()) {
    if (prim.getMode() !== 0) continue; // POINTS only
    for (const semantic of prim.listSemantics()) {
      const acc = prim.getAttribute(semantic);
      if (seen.has(acc)) continue;
      seen.add(acc);
      const el = acc.getElementSize();
      const arr = acc.getArray();
      const count = acc.getCount();
      const keep = Math.ceil(count / stride);
      const out = new arr.constructor(keep * el);
      for (let i = 0; i < keep; i++) {
        const src = i * stride * el;
        for (let j = 0; j < el; j++) out[i * el + j] = arr[src + j];
      }
      acc.setArray(out);
      if (semantic === 'POSITION') {
        before += count;
        after += keep;
      }
    }
  }
}

await io.write(outPath, doc);
console.log(`points: ${before} -> ${after} (stride ${stride})`);
