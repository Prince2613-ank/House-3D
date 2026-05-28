const { NodeIO } = require('@gltf-transform/core');
const { dedup, prune } = require('@gltf-transform/functions');
const fs = require('fs');

async function main() {
  const inputPath = 'new_house2nd_floor.glb';
  const outputPath = 'new_house2nd_floor.optimized.glb';

  const io = new NodeIO();
  const document = await io.read(inputPath);

  // Lossless-only transforms: remove unused data and merge exact duplicates.
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
