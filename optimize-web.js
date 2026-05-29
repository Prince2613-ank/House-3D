const { NodeIO } = require('@gltf-transform/core');
const { KHRDracoMeshCompression, KHRMaterialsUnlit } = require('@gltf-transform/extensions');
const { dedup, draco, prune, reorder } = require('@gltf-transform/functions');
const draco3d = require('draco3dgltf');
const { MeshoptEncoder } = require('meshoptimizer');
const fs = require('fs');

async function main() {
  const inputPath = process.argv[2] || 'new_house2nd_floor_updated_unlit.optimized.glb';
  const outputPath = process.argv[3] || 'new_house2nd_floor_updated_unlit.web.glb';

  await MeshoptEncoder.ready;

  const io = new NodeIO()
    .registerExtensions([KHRDracoMeshCompression, KHRMaterialsUnlit])
    .registerDependencies({
      'draco3d.encoder': await draco3d.createEncoderModule(),
    });

  const document = await io.read(inputPath);

  for (const material of document.getRoot().listMaterials()) {
    // KHR_materials_unlit renders base color directly. These lighting maps are
    // ignored by the unlit shader but dominate transfer size on hosted builds.
    material.setNormalTexture(null);
    material.setMetallicRoughnessTexture(null);
    material.setOcclusionTexture(null);
    material.setEmissiveTexture(null);
    material.setEmissiveFactor([0, 0, 0]);
  }

  await document.transform(
    dedup(),
    prune(),
    reorder({ encoder: MeshoptEncoder }),
    draco({
      method: 'edgebreaker',
      encodeSpeed: 5,
      decodeSpeed: 7,
      quantizePosition: 16,
      quantizeNormal: 12,
      quantizeTexcoord: 14,
      quantizeColor: 8,
      quantizeGeneric: 14,
    }),
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
