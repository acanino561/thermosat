/**
 * Web Worker for parsing STEP files using occt-import-js (Open Cascade WASM).
 * Lives in public/ so it can be loaded as a worker URL.
 */

let occtInstance = null;

function postMsg(msg) {
  self.postMessage(msg);
}

function triangleArea(ax, ay, az, bx, by, bz, cx, cy, cz) {
  const abx = bx - ax, aby = by - ay, abz = bz - az;
  const acx = cx - ax, acy = cy - ay, acz = cz - az;
  const nx = aby * acz - abz * acy;
  const ny = abz * acx - abx * acz;
  const nz = abx * acy - aby * acx;
  return 0.5 * Math.sqrt(nx * nx + ny * ny + nz * nz);
}

async function initOcct() {
  if (occtInstance) return occtInstance;
  postMsg({ type: 'progress', percent: 5, message: 'Loading WASM module…' });

  // Import the occt-import-js library
  importScripts('/wasm/occt-import-js.js');
  occtInstance = await occtimportjs({
    locateFile: (name) => `/wasm/${name}`,
  });
  return occtInstance;
}

async function parseStepFile(fileBuffer) {
  try {
    const occt = await initOcct();
    postMsg({ type: 'progress', percent: 15, message: 'Parsing STEP file…' });

    const fileData = new Uint8Array(fileBuffer);
    const result = occt.ReadStepFile(fileData, null);

    if (!result.success) {
      postMsg({ type: 'error', message: 'Failed to parse STEP file — invalid or unsupported format.' });
      return;
    }

    postMsg({ type: 'progress', percent: 50, message: 'Extracting geometry…' });

    const faces = [];
    let faceIndex = 0;
    const bboxMin = [Infinity, Infinity, Infinity];
    const bboxMax = [-Infinity, -Infinity, -Infinity];
    let totalSurfaceArea = 0;

    const totalMeshes = result.meshes.length;

    for (let mi = 0; mi < totalMeshes; mi++) {
      const mesh = result.meshes[mi];
      const meshPositions = mesh.attributes?.position?.array;
      const meshNormals = mesh.attributes?.normal?.array;
      const meshIndices = mesh.index?.array;

      if (!meshPositions || !meshIndices) continue;

      const brepFaces = mesh.brep_faces;

      if (brepFaces && brepFaces.length > 0) {
        for (const brepFace of brepFaces) {
          const firstTri = brepFace.first;
          const lastTri = brepFace.last;
          const triCount = lastTri - firstTri + 1;

          const faceIndices = new Uint32Array(triCount * 3);
          const vertexSet = new Set();

          for (let t = 0; t < triCount; t++) {
            const srcIdx = (firstTri + t) * 3;
            faceIndices[t * 3] = meshIndices[srcIdx];
            faceIndices[t * 3 + 1] = meshIndices[srcIdx + 1];
            faceIndices[t * 3 + 2] = meshIndices[srcIdx + 2];
            vertexSet.add(meshIndices[srcIdx]);
            vertexSet.add(meshIndices[srcIdx + 1]);
            vertexSet.add(meshIndices[srcIdx + 2]);
          }

          const uniqueVerts = Array.from(vertexSet).sort((a, b) => a - b);
          const remapTable = new Map();
          uniqueVerts.forEach((v, i) => remapTable.set(v, i));

          const positions = new Float32Array(uniqueVerts.length * 3);
          const normals = new Float32Array(uniqueVerts.length * 3);
          const remappedIndices = new Uint32Array(faceIndices.length);

          for (let vi = 0; vi < uniqueVerts.length; vi++) {
            const srcV = uniqueVerts[vi];
            positions[vi * 3] = meshPositions[srcV * 3];
            positions[vi * 3 + 1] = meshPositions[srcV * 3 + 1];
            positions[vi * 3 + 2] = meshPositions[srcV * 3 + 2];

            for (let c = 0; c < 3; c++) {
              const val = positions[vi * 3 + c];
              if (val < bboxMin[c]) bboxMin[c] = val;
              if (val > bboxMax[c]) bboxMax[c] = val;
            }

            if (meshNormals) {
              normals[vi * 3] = meshNormals[srcV * 3];
              normals[vi * 3 + 1] = meshNormals[srcV * 3 + 1];
              normals[vi * 3 + 2] = meshNormals[srcV * 3 + 2];
            }
          }

          for (let i = 0; i < faceIndices.length; i++) {
            remappedIndices[i] = remapTable.get(faceIndices[i]);
          }

          let faceArea = 0;
          for (let t = 0; t < remappedIndices.length; t += 3) {
            const a = remappedIndices[t], b = remappedIndices[t + 1], c = remappedIndices[t + 2];
            faceArea += triangleArea(
              positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2],
              positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2],
              positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2],
            );
          }
          totalSurfaceArea += faceArea;

          const color = brepFace.color
            ? [brepFace.color[0] / 255, brepFace.color[1] / 255, brepFace.color[2] / 255]
            : mesh.color
              ? [mesh.color[0] / 255, mesh.color[1] / 255, mesh.color[2] / 255]
              : [0.7, 0.7, 0.7];

          faces.push({
            id: `face-${faceIndex}`,
            name: `${mesh.name || 'Face'}-${faceIndex}`,
            positions,
            normals,
            indices: remappedIndices,
            color,
            surfaceArea: faceArea,
          });
          faceIndex++;
        }
      } else {
        // No brep_faces — treat entire mesh as one face
        const positions = new Float32Array(meshPositions);
        const normals = meshNormals ? new Float32Array(meshNormals) : new Float32Array(meshPositions.length);
        const indices = new Uint32Array(meshIndices);

        for (let vi = 0; vi < positions.length; vi += 3) {
          for (let c = 0; c < 3; c++) {
            if (positions[vi + c] < bboxMin[c]) bboxMin[c] = positions[vi + c];
            if (positions[vi + c] > bboxMax[c]) bboxMax[c] = positions[vi + c];
          }
        }

        let faceArea = 0;
        for (let t = 0; t < indices.length; t += 3) {
          const a = indices[t], b = indices[t + 1], c = indices[t + 2];
          faceArea += triangleArea(
            positions[a * 3], positions[a * 3 + 1], positions[a * 3 + 2],
            positions[b * 3], positions[b * 3 + 1], positions[b * 3 + 2],
            positions[c * 3], positions[c * 3 + 1], positions[c * 3 + 2],
          );
        }
        totalSurfaceArea += faceArea;

        const color = mesh.color
          ? [mesh.color[0] / 255, mesh.color[1] / 255, mesh.color[2] / 255]
          : [0.7, 0.7, 0.7];

        faces.push({
          id: `face-${faceIndex}`,
          name: mesh.name || `Mesh-${faceIndex}`,
          positions,
          normals,
          indices,
          color,
          surfaceArea: faceArea,
        });
        faceIndex++;
      }

      const progressPercent = 50 + Math.round((mi / totalMeshes) * 45);
      postMsg({ type: 'progress', percent: progressPercent, message: `Processing mesh ${mi + 1}/${totalMeshes}…` });
    }

    postMsg({ type: 'progress', percent: 98, message: 'Finalizing…' });

    const transferables = [];
    for (const face of faces) {
      transferables.push(face.positions.buffer, face.normals.buffer, face.indices.buffer);
    }

    const parseResult = {
      faces,
      boundingBox: { min: bboxMin, max: bboxMax },
      totalSurfaceArea,
    };

    self.postMessage({ type: 'result', data: parseResult }, transferables);
  } catch (err) {
    postMsg({ type: 'error', message: err.message || 'Unknown error during STEP parsing.' });
  }
}

self.onmessage = (e) => {
  if (e.data.type === 'parse') {
    parseStepFile(e.data.fileBuffer);
  }
};
