const fs = require('fs');

const inputPath = process.argv[2] || 'new_house2nd_floor_updated.glb';
const outputPath = process.argv[3] || 'new_house2nd_floor_updated_unlit.glb';
const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

function pad4(buffer, padByte) {
  const padding = (4 - (buffer.length % 4)) % 4;
  return padding ? Buffer.concat([buffer, Buffer.alloc(padding, padByte)]) : buffer;
}

function readChunks(buffer) {
  if (buffer.readUInt32LE(0) !== GLB_MAGIC) {
    throw new Error(`${inputPath} is not a GLB file.`);
  }

  const version = buffer.readUInt32LE(4);
  if (version !== 2) {
    throw new Error(`Unsupported GLB version ${version}; expected version 2.`);
  }

  const chunks = [];
  let offset = 12;
  while (offset < buffer.length) {
    const byteLength = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const start = offset + 8;
    const end = start + byteLength;
    chunks.push({ type, data: buffer.subarray(start, end) });
    offset = end;
  }
  return chunks;
}

const input = fs.readFileSync(inputPath);
const chunks = readChunks(input);
const jsonChunk = chunks.find((chunk) => chunk.type === JSON_CHUNK);

if (!jsonChunk) {
  throw new Error('GLB does not contain a JSON chunk.');
}

const json = JSON.parse(jsonChunk.data.toString('utf8').replace(/\0+$/, '').trimEnd());
const materials = json.materials || [];

json.extensionsUsed = Array.from(new Set([...(json.extensionsUsed || []), 'KHR_materials_unlit']));

for (const material of materials) {
  material.extensions = material.extensions || {};
  material.extensions.KHR_materials_unlit = material.extensions.KHR_materials_unlit || {};

  material.pbrMetallicRoughness = material.pbrMetallicRoughness || {};
  if (!material.pbrMetallicRoughness.baseColorFactor) {
    material.pbrMetallicRoughness.baseColorFactor = [1, 1, 1, 1];
  }
}

const updatedJson = pad4(Buffer.from(JSON.stringify(json), 'utf8'), 0x20);
const outputChunks = chunks.map((chunk) => ({
  type: chunk.type,
  data: chunk.type === JSON_CHUNK ? updatedJson : chunk.data,
}));

let totalLength = 12;
for (const chunk of outputChunks) {
  totalLength += 8 + chunk.data.length;
}

const header = Buffer.alloc(12);
header.writeUInt32LE(GLB_MAGIC, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(totalLength, 8);

const output = [header];
for (const chunk of outputChunks) {
  if (chunk.type !== JSON_CHUNK && chunk.type !== BIN_CHUNK) {
    throw new Error(`Unsupported GLB chunk type 0x${chunk.type.toString(16)}.`);
  }

  const chunkHeader = Buffer.alloc(8);
  chunkHeader.writeUInt32LE(chunk.data.length, 0);
  chunkHeader.writeUInt32LE(chunk.type, 4);
  output.push(chunkHeader, chunk.data);
}

fs.writeFileSync(outputPath, Buffer.concat(output));

const imageCount = (json.images || []).length;
const textureCount = (json.textures || []).length;
console.log(`Wrote ${outputPath}`);
console.log(`Materials set to KHR_materials_unlit: ${materials.length}`);
console.log(`Embedded images preserved without recompression: ${imageCount}`);
console.log(`Textures preserved: ${textureCount}`);
