const { NodeIO } = require('@gltf-transform/core');
const { KHRMaterialsUnlit } = require('@gltf-transform/extensions');
const { dedup, prune } = require('@gltf-transform/functions');
const fs = require('fs');

async function main() {
  const inputPath = process.argv[2] || 'new_house2nd_floor_updated_unlit.glb';
  const outputPath = process.argv[3] || 'new_house2nd_floor_updated_unlit.optimized.glb';

  const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);
  const document = await io.read(inputPath);

  // Lossless-only transforms: remove unused data and merge exact duplicates.
  // This preserves geometry shape and original image bytes; no simplification,
  // resizing, or texture recompression is applied.
  await document.transform(
    dedup(),
    prune()
  );

  await io.write(outputPath, document);

  const inSize = fs.statSync(inputPath).size;
  const outSize = fs.statSync(outputPath).size;
  const saved = inSize - outSize;
  const percent = inSize > 0 ? (saved / inSize) * 100 : 0;

  console.log(`Input: ${inSize} bytes`);
  console.log(`Output: ${outSize} bytes`);
  console.log(`Saved: ${saved} bytes (${percent.toFixed(2)}%)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
