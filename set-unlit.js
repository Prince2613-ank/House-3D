const { NodeIO } = require('@gltf-transform/core');
const { KHRMaterialsUnlit } = require('@gltf-transform/extensions');

async function main() {
  const inputPath = 'new_house2nd_floor.glb';
  const outputPath = 'new_house2nd_floor.unlit.glb';

  const io = new NodeIO().registerExtensions([KHRMaterialsUnlit]);
  const document = await io.read(inputPath);

  // Ensure extension is registered on this document.
  const unlitExtension = document.createExtension(KHRMaterialsUnlit);

  const materials = document.getRoot().listMaterials();
  if (materials.length === 0) {
    console.log('No materials found. Writing file unchanged.');
  }

  for (const material of materials) {
    material.setExtension('KHR_materials_unlit', unlitExtension.createUnlit());
  }

  await io.write(outputPath, document);
  console.log(`Wrote ${outputPath} with KHR_materials_unlit on ${materials.length} materials.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
