/**
 * Procedural 3D GLB Model Generator for EPOCH 3D Earth Viewer
 * Creates compliant, lightweight, highly optimized binary glTF 2.0 (.glb) models for:
 * 1. house.glb (Himalayan pitched-roof residential dwelling)
 * 2. building_multistorey.glb (Multi-storey commercial/civic building)
 * 3. hospital.glb (Hospital complex with emergency wing and medical cross emblem)
 * 4. school.glb (School / Community emergency shelter facility)
 * 5. bridge_truss.glb (Steel truss / Bailey bridge module)
 * 6. substation_power.glb (Hydro powerhouse / electrical substation with transformers)
 * 7. infrastructure_tower.glb (Communication / telemetry lattice tower)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const modelsDir = path.resolve(__dirname, '../frontend/public/models');

if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir, { recursive: true });
}

class MeshBuilder {
  constructor() {
    this.positions = []; // [x, y, z, ...]
    this.normals = [];   // [nx, ny, nz, ...]
    this.colors = [];    // [r, g, b, ...] (0-1)
    this.indices = [];   // [i0, i1, i2, ...]
  }

  addQuad(v0, v1, v2, v3, normal, color) {
    const baseIdx = this.positions.length / 3;
    
    [v0, v1, v2, v3].forEach(v => {
      this.positions.push(v[0], v[1], v[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(color[0], color[1], color[2]);
    });

    this.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
    this.indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
  }

  addTriangle(v0, v1, v2, normal, color) {
    const baseIdx = this.positions.length / 3;
    
    [v0, v1, v2].forEach(v => {
      this.positions.push(v[0], v[1], v[2]);
      this.normals.push(normal[0], normal[1], normal[2]);
      this.colors.push(color[0], color[1], color[2]);
    });

    this.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
  }

  addBox(minX, minY, minZ, maxX, maxY, maxZ, color) {
    // 6 faces of a box (Z is up)
    // Bottom (z = minZ)
    this.addQuad(
      [minX, minY, minZ], [maxX, minY, minZ], [maxX, maxY, minZ], [minX, maxY, minZ],
      [0, 0, -1], [color[0]*0.7, color[1]*0.7, color[2]*0.7]
    );
    // Top (z = maxZ)
    this.addQuad(
      [minX, minY, maxZ], [minX, maxY, maxZ], [maxX, maxY, maxZ], [maxX, minY, maxZ],
      [0, 0, 1], [color[0]*1.1, color[1]*1.1, color[2]*1.1]
    );
    // Front (y = minY)
    this.addQuad(
      [minX, minY, minZ], [maxX, minY, minZ], [maxX, minY, maxZ], [minX, minY, maxZ],
      [0, -1, 0], [color[0]*0.9, color[1]*0.9, color[2]*0.9]
    );
    // Back (y = maxY)
    this.addQuad(
      [maxX, maxY, minZ], [minX, maxY, minZ], [minX, maxY, maxZ], [maxX, maxY, maxZ],
      [0, 1, 0], [color[0]*0.85, color[1]*0.85, color[2]*0.85]
    );
    // Left (x = minX)
    this.addQuad(
      [minX, maxY, minZ], [minX, minY, minZ], [minX, minY, maxZ], [minX, maxY, maxZ],
      [-1, 0, 0], [color[0]*0.95, color[1]*0.95, color[2]*0.95]
    );
    // Right (x = maxX)
    this.addQuad(
      [maxX, minY, minZ], [maxX, maxY, minZ], [maxX, maxY, maxZ], [maxX, minY, maxZ],
      [1, 0, 0], [color[0], color[1], color[2]]
    );
  }

  addGableRoof(minX, minY, baseZ, maxX, maxY, peakZ, roofColor) {
    const midY = (minY + maxY) / 2;
    const eaves = 0.5;

    // Roof Slope 1 (North)
    this.addQuad(
      [minX - eaves, minY - eaves, baseZ],
      [maxX + eaves, minY - eaves, baseZ],
      [maxX + eaves, midY, peakZ],
      [minX - eaves, midY, peakZ],
      [0, -0.707, 0.707],
      roofColor
    );

    // Roof Slope 2 (South)
    this.addQuad(
      [maxX + eaves, maxY + eaves, baseZ],
      [minX - eaves, maxY + eaves, baseZ],
      [minX - eaves, midY, peakZ],
      [maxX + eaves, midY, peakZ],
      [0, 0.707, 0.707],
      [roofColor[0]*0.9, roofColor[1]*0.9, roofColor[2]*0.9]
    );

    // Gable Triangle Front (X = minX)
    this.addTriangle(
      [minX, minY, baseZ],
      [minX, midY, peakZ],
      [minX, maxY, baseZ],
      [-1, 0, 0],
      [roofColor[0]*0.8, roofColor[1]*0.8, roofColor[2]*0.8]
    );

    // Gable Triangle Back (X = maxX)
    this.addTriangle(
      [maxX, maxY, baseZ],
      [maxX, midY, peakZ],
      [maxX, minY, baseZ],
      [1, 0, 0],
      [roofColor[0]*0.8, roofColor[1]*0.8, roofColor[2]*0.8]
    );
  }

  buildGLB() {
    const numVertices = this.positions.length / 3;
    const numIndices = this.indices.length;

    // Calculate bounds for positions
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    for (let i = 0; i < this.positions.length; i += 3) {
      const x = this.positions[i];
      const y = this.positions[i + 1];
      const z = this.positions[i + 2];
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }

    // Convert positions, normals, colors to Float32Array
    const posBuffer = Buffer.from(new Float32Array(this.positions).buffer);
    const normBuffer = Buffer.from(new Float32Array(this.normals).buffer);
    const colBuffer = Buffer.from(new Float32Array(this.colors).buffer);
    
    // Convert indices to Uint16Array (or Uint32Array if > 65535)
    const idxBuffer = Buffer.from(new Uint16Array(this.indices).buffer);

    // Combine into single binary buffer with proper 4-byte alignments
    const padBuffer = (buf) => {
      const pad = (4 - (buf.length % 4)) % 4;
      return pad > 0 ? Buffer.concat([buf, Buffer.alloc(pad)]) : buf;
    };

    const posOffset = 0;
    const normOffset = posBuffer.length;
    const colOffset = normOffset + normBuffer.length;
    const idxOffset = colOffset + colBuffer.length;

    const binBody = padBuffer(Buffer.concat([posBuffer, normBuffer, colBuffer, idxBuffer]));

    const gltfJSON = {
      asset: { version: "2.0", generator: "EPOCH 3D Procedural Model Generator" },
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0 }],
      meshes: [
        {
          primitives: [
            {
              attributes: {
                POSITION: 0,
                NORMAL: 1,
                COLOR_0: 2
              },
              indices: 3,
              material: 0
            }
          ]
        }
      ],
      materials: [
        {
          pbrMetallicRoughness: {
            metallicFactor: 0.1,
            roughnessFactor: 0.7
          },
          doubleSided: true
        }
      ],
      accessors: [
        // 0: POSITION
        {
          bufferView: 0,
          byteOffset: 0,
          componentType: 5126, // FLOAT
          count: numVertices,
          type: "VEC3",
          min: [minX, minY, minZ],
          max: [maxX, maxY, maxZ]
        },
        // 1: NORMAL
        {
          bufferView: 1,
          byteOffset: 0,
          componentType: 5126, // FLOAT
          count: numVertices,
          type: "VEC3"
        },
        // 2: COLOR_0
        {
          bufferView: 2,
          byteOffset: 0,
          componentType: 5126, // FLOAT
          count: numVertices,
          type: "VEC3"
        },
        // 3: INDICES
        {
          bufferView: 3,
          byteOffset: 0,
          componentType: 5123, // UNSIGNED_SHORT
          count: numIndices,
          type: "SCALAR"
        }
      ],
      bufferViews: [
        // 0: Positions
        {
          buffer: 0,
          byteOffset: posOffset,
          byteLength: posBuffer.length,
          target: 34962 // ARRAY_BUFFER
        },
        // 1: Normals
        {
          buffer: 0,
          byteOffset: normOffset,
          byteLength: normBuffer.length,
          target: 34962 // ARRAY_BUFFER
        },
        // 2: Colors
        {
          buffer: 0,
          byteOffset: colOffset,
          byteLength: colBuffer.length,
          target: 34962 // ARRAY_BUFFER
        },
        // 3: Indices
        {
          buffer: 0,
          byteOffset: idxOffset,
          byteLength: idxBuffer.length,
          target: 34963 // ELEMENT_ARRAY_BUFFER
        }
      ],
      buffers: [
        {
          byteLength: binBody.length
        }
      ]
    };

    let jsonString = JSON.stringify(gltfJSON);
    let jsonBuffer = Buffer.from(jsonString, 'utf8');
    const jsonPad = (4 - (jsonBuffer.length % 4)) % 4;
    if (jsonPad > 0) {
      jsonBuffer = Buffer.concat([jsonBuffer, Buffer.from(' '.repeat(jsonPad), 'utf8')]);
    }

    const totalLength = 12 + (8 + jsonBuffer.length) + (8 + binBody.length);
    const glbHeader = Buffer.alloc(12);
    glbHeader.writeUInt32LE(0x46546C67, 0); // magic: "glTF"
    glbHeader.writeUInt32LE(2, 4);          // version: 2
    glbHeader.writeUInt32LE(totalLength, 8); // total length

    const jsonChunkHeader = Buffer.alloc(8);
    jsonChunkHeader.writeUInt32LE(jsonBuffer.length, 0);
    jsonChunkHeader.writeUInt32LE(0x4E4F534A, 4); // "JSON"

    const binChunkHeader = Buffer.alloc(8);
    binChunkHeader.writeUInt32LE(binBody.length, 0);
    binChunkHeader.writeUInt32LE(0x004E4942, 4); // "BIN\0"

    return Buffer.concat([
      glbHeader,
      jsonChunkHeader,
      jsonBuffer,
      binChunkHeader,
      binBody
    ]);
  }
}

// -----------------------------------------------------------------------------
// MODEL 1: HOUSE (Himalayan Hill House with Gable Roof)
// -----------------------------------------------------------------------------
function generateHouseModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.92, 0.89, 0.83]; // Himalayan warm cream
  const roofColor = [0.72, 0.28, 0.22]; // Terracotta red / mountain zinc
  const trimColor = [0.25, 0.22, 0.20]; // Timber framing

  // Main House Base (8m x 6m x 4.5m high)
  mesh.addBox(-4, -3, 0, 4, 3, 4.5, wallColor);
  // Gable Roof (pitched up to 7.0m)
  mesh.addGableRoof(-4.2, -3.2, 4.5, 4.2, 3.2, 7.0, roofColor);
  
  // Doorway
  mesh.addBox(-1.0, -3.05, 0, 1.0, -3.0, 2.5, [0.35, 0.25, 0.18]);
  // Windows
  mesh.addBox(-3.0, -3.05, 1.5, -1.8, -3.0, 2.8, [0.30, 0.50, 0.65]);
  mesh.addBox(1.8, -3.05, 1.5, 3.0, -3.0, 2.8, [0.30, 0.50, 0.65]);

  // Chimney
  mesh.addBox(2.2, 0.8, 4.5, 3.0, 1.6, 7.8, [0.65, 0.35, 0.30]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 2: MULTI-STOREY BUILDING (Civic / Commercial 4-Storey)
// -----------------------------------------------------------------------------
function generateMultiStoreyModel() {
  const mesh = new MeshBuilder();
  const concreteColor = [0.82, 0.84, 0.85];
  const glassColor = [0.22, 0.45, 0.58];
  const accentColor = [0.09, 0.50, 0.47]; // EPOCH Teal

  // 12m x 10m x 14m high (4 floors)
  mesh.addBox(-6, -5, 0, 6, 5, 14, concreteColor);
  
  // Parapet roof rim
  mesh.addBox(-6.2, -5.2, 14, 6.2, 5.2, 14.8, [0.70, 0.72, 0.74]);
  // Rooftop utility room
  mesh.addBox(-2, -2, 14, 2, 2, 16.5, [0.55, 0.58, 0.60]);

  // Front glass window bands per floor
  for (let f = 0; f < 4; f++) {
    const z = 1.0 + f * 3.3;
    mesh.addBox(-5.2, -5.08, z, 5.2, -5.0, z + 1.8, glassColor);
    // Back windows
    mesh.addBox(-5.2, 5.0, z, 5.2, 5.08, z + 1.8, glassColor);
  }

  // Ground Floor Entrance canopy
  mesh.addBox(-3.0, -6.5, 3.0, 3.0, -5.0, 3.3, accentColor);
  mesh.addBox(-2.8, -6.3, 0, -2.5, -6.0, 3.0, [0.3, 0.3, 0.3]);
  mesh.addBox(2.5, -6.3, 0, 2.8, -6.0, 3.0, [0.3, 0.3, 0.3]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 3: HOSPITAL (Trauma Center / Health Sub-Centre with Medical Cross)
// -----------------------------------------------------------------------------
function generateHospitalModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.94, 0.95, 0.95];
  const redCrossColor = [0.86, 0.15, 0.15];
  const glassColor = [0.25, 0.52, 0.65];

  // Main Central Pavilion (14m x 10m x 10m high)
  mesh.addBox(-7, -5, 0, 7, 5, 10, wallColor);

  // Left Emergency Wing (8m x 7m x 6m high)
  mesh.addBox(-15, -3.5, 0, -7, 3.5, 6, [0.90, 0.92, 0.93]);

  // Right Outpatient Wing (8m x 7m x 6m high)
  mesh.addBox(7, -3.5, 0, 15, 3.5, 6, [0.90, 0.92, 0.93]);

  // Emergency Entrance Canopy
  mesh.addBox(-14, -6.0, 3.2, -8, -3.5, 3.5, [0.86, 0.15, 0.15]);
  
  // Rooftop Helipad Pad / Central Tower
  mesh.addBox(-4, -4, 10, 4, 4, 11.2, [0.75, 0.78, 0.80]);
  
  // 3D Red Cross Emblem on Roof Pavilion
  // Vertical bar
  mesh.addBox(-0.6, -0.6, 11.2, 0.6, 0.6, 13.5, redCrossColor);
  // Horizontal bar
  mesh.addBox(-1.8, -0.6, 12.0, 1.8, 0.6, 12.8, redCrossColor);

  // Window strips
  for (let z = 1.8; z < 9; z += 3.2) {
    mesh.addBox(-6.2, -5.08, z, 6.2, -5.0, z + 1.4, glassColor);
  }

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 4: SCHOOL / COMMUNITY SHELTER
// -----------------------------------------------------------------------------
function generateSchoolModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.95, 0.92, 0.84];
  const roofColor = [0.09, 0.50, 0.47]; // Forest Teal
  const doorColor = [0.45, 0.32, 0.24];

  // Wide Long Academic Block (22m x 8m x 6m)
  mesh.addBox(-11, -4, 0, 11, 4, 6, wallColor);
  // Large Gable Pitched Roof
  mesh.addGableRoof(-11.5, -4.5, 6, 11.5, 4.5, 9.5, roofColor);

  // Front Covered Verandah / Colonnade
  mesh.addBox(-11, -6.5, 0, 11, -4.0, 0.4, [0.75, 0.72, 0.68]);
  mesh.addBox(-11.2, -6.7, 4.2, 11.2, -4.0, 4.5, roofColor);
  
  // Colonnade Pillars
  for (let x = -10; x <= 10; x += 4) {
    mesh.addBox(x - 0.25, -6.4, 0.4, x + 0.25, -5.9, 4.2, [0.98, 0.98, 0.98]);
  }

  // Windows along facade
  for (let x = -9; x <= 9; x += 4.5) {
    mesh.addBox(x - 1.2, -4.08, 1.8, x + 1.2, -4.0, 3.8, [0.28, 0.48, 0.60]);
    // Classroom Door
    mesh.addBox(x + 1.4, -4.08, 0.4, x + 2.2, -4.0, 3.8, doorColor);
  }

  // Designated Shelter Flagpole / Tower
  mesh.addBox(-10.5, 2.5, 6, -9.5, 3.5, 12.5, [0.85, 0.85, 0.85]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 5: BRIDGE TRUSS / BAILEY SPAN MODULE
// -----------------------------------------------------------------------------
function generateBridgeTrussModel() {
  const mesh = new MeshBuilder();
  const steelColor = [0.35, 0.42, 0.48]; // Galvanized Steel
  const roadColor = [0.20, 0.22, 0.24];  // Asphalt Deck
  const pierColor = [0.65, 0.64, 0.62];  // Reinforced Concrete

  // Roadway Deck (30m long x 7m wide x 0.8m thick)
  mesh.addBox(-15, -3.5, 0, 15, 3.5, 0.8, roadColor);
  
  // Concrete Abutments / Piers at ends
  mesh.addBox(-16, -4.2, -6.0, -13.5, 4.2, 0, pierColor);
  mesh.addBox(13.5, -4.2, -6.0, 16, 4.2, 0, pierColor);

  // Left Steel Truss Girder (Y = -3.4)
  // Bottom chord
  mesh.addBox(-15, -3.6, 0.8, 15, -3.3, 1.3, steelColor);
  // Top chord
  mesh.addBox(-15, -3.6, 5.0, 15, -3.3, 5.5, steelColor);
  // Vertical & Diagonal Posts
  for (let x = -15; x <= 15; x += 3.75) {
    mesh.addBox(x - 0.2, -3.55, 1.3, x + 0.2, -3.35, 5.0, steelColor);
  }

  // Right Steel Truss Girder (Y = 3.4)
  // Bottom chord
  mesh.addBox(-15, 3.3, 0.8, 15, 3.6, 1.3, steelColor);
  // Top chord
  mesh.addBox(-15, 3.3, 5.0, 15, 3.6, 5.5, steelColor);
  // Vertical Posts
  for (let x = -15; x <= 15; x += 3.75) {
    mesh.addBox(x - 0.2, 3.35, 1.3, x + 0.2, 3.55, 5.0, steelColor);
  }

  // Overhead Cross-Bracing Girders
  for (let x = -15; x <= 15; x += 3.75) {
    mesh.addBox(x - 0.2, -3.5, 5.2, x + 0.2, 3.5, 5.5, steelColor);
  }

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 6: POWER SUBSTATION / HYDRO POWERHOUSE
// -----------------------------------------------------------------------------
function generateSubstationPowerModel() {
  const mesh = new MeshBuilder();
  const turbineBuildingColor = [0.38, 0.42, 0.46]; // Industrial grey
  const transformerColor = [0.22, 0.25, 0.28];
  const warningYellow = [0.88, 0.70, 0.15];

  // Main Turbine Hall / Control Building (16m x 12m x 9m)
  mesh.addBox(-8, -6, 0, 8, 6, 9, turbineBuildingColor);
  // Roof monitors / vents
  mesh.addBox(-6, -2, 9, 6, 2, 10.5, [0.30, 0.33, 0.36]);

  // Heavy Step-Up Transformer 1
  mesh.addBox(-7, 8, 0, -2, 13, 4.5, transformerColor);
  // Bushing insulators
  mesh.addBox(-6, 9.5, 4.5, -5.2, 10.3, 7.0, [0.85, 0.85, 0.85]);
  mesh.addBox(-3.8, 9.5, 4.5, -3.0, 10.3, 7.0, [0.85, 0.85, 0.85]);

  // Heavy Step-Up Transformer 2
  mesh.addBox(2, 8, 0, 7, 13, 4.5, transformerColor);
  mesh.addBox(3, 9.5, 4.5, 3.8, 10.3, 7.0, [0.85, 0.85, 0.85]);
  mesh.addBox(5.2, 9.5, 4.5, 6.0, 10.3, 7.0, [0.85, 0.85, 0.85]);

  // Security Perimeter Warning Barrier
  mesh.addBox(-9, -7.5, 0, 9, -7.2, 2.2, warningYellow);

  // Transmission Gantries
  mesh.addBox(-6, 14, 0, -5.5, 14.5, 12, [0.45, 0.48, 0.50]);
  mesh.addBox(5.5, 14, 0, 6, 14.5, 12, [0.45, 0.48, 0.50]);
  mesh.addBox(-6, 14, 11.5, 6, 14.5, 12, [0.45, 0.48, 0.50]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 7: INFRASTRUCTURE / TELEMETRY TOWER
// -----------------------------------------------------------------------------
function generateInfrastructureTowerModel() {
  const mesh = new MeshBuilder();
  const steelRed = [0.82, 0.22, 0.18];
  const steelWhite = [0.94, 0.94, 0.94];
  const baseConcrete = [0.60, 0.60, 0.60];

  // Base Concrete Foundation
  mesh.addBox(-2.5, -2.5, 0, 2.5, 2.5, 0.6, baseConcrete);

  // 4 Tapered Lattice Legs
  const height = 24.0;
  const sections = 6;
  const sectionHeight = height / sections;

  for (let s = 0; s < sections; s++) {
    const z0 = 0.6 + s * sectionHeight;
    const z1 = 0.6 + (s + 1) * sectionHeight;
    const w0 = 2.0 * (1 - (s / sections) * 0.7);
    const w1 = 2.0 * (1 - ((s + 1) / sections) * 0.7);
    const color = s % 2 === 0 ? steelRed : steelWhite;

    // 4 Corner vertical legs
    mesh.addBox(-w0, -w0, z0, -w1, -w1, z1, color);
    mesh.addBox(w0, -w0, z0, w1, -w1, z1, color);
    mesh.addBox(w0, w0, z0, w1, w1, z1, color);
    mesh.addBox(-w0, w0, z0, -w1, w1, z1, color);

    // Horizontal ring girders
    mesh.addBox(-w1, -w1, z1 - 0.2, w1, -w1 + 0.2, z1, color);
    mesh.addBox(-w1, w1 - 0.2, z1 - 0.2, w1, w1, z1, color);
    mesh.addBox(-w1, -w1, z1 - 0.2, -w1 + 0.2, w1, z1, color);
    mesh.addBox(w1 - 0.2, -w1, z1 - 0.2, w1, w1, z1, color);
  }

  // Top Microwave Dish Antenna
  mesh.addBox(-0.8, -1.2, 20.0, 0.8, -0.6, 22.5, [0.95, 0.95, 0.95]);
  // Warning Beacon on Top
  mesh.addBox(-0.3, -0.3, 24.6, 0.3, 0.3, 25.4, [0.95, 0.15, 0.15]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 8: HIMALAYAN GREEN-ROOF COTTAGE (Reference Photo 1 - Sikkim hillside)
// -----------------------------------------------------------------------------
function generateHouseGreenModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.94, 0.92, 0.86]; // Warm cream stucco
  const stoneBase = [0.45, 0.44, 0.42]; // Mountain stone plinth
  const roofGreen = [0.12, 0.52, 0.32]; // Pine green corrugated zinc
  const timberDark = [0.28, 0.20, 0.15]; // Himalayan cedar timber

  // Stone plinth base (slope foundation)
  mesh.addBox(-4.2, -3.2, -1.0, 4.2, 3.2, 0.0, stoneBase);
  // Main Wall Base (8m x 6m x 4.2m)
  mesh.addBox(-4, -3, 0, 4, 3, 4.2, wallColor);
  // Green Gable Roof with extended mountain eaves
  mesh.addGableRoof(-4.4, -3.4, 4.2, 4.4, 3.4, 6.8, roofGreen);

  // Front wooden verandah deck
  mesh.addBox(-4.2, -4.5, 0, 4.2, -3.0, 0.3, stoneBase);
  // Verandah roof awning
  mesh.addBox(-4.4, -4.6, 3.4, 4.4, -3.0, 3.6, roofGreen);
  // Verandah timber posts
  for (let x = -4.0; x <= 4.0; x += 2.0) {
    mesh.addBox(x - 0.12, -4.4, 0.3, x + 0.12, -4.2, 3.4, timberDark);
  }

  // Windows & Doors
  mesh.addBox(-1.0, -3.05, 0.3, 1.0, -3.0, 2.6, timberDark); // Door
  mesh.addBox(-3.2, -3.05, 1.4, -1.8, -3.0, 2.8, [0.25, 0.45, 0.60]); // Window left
  mesh.addBox(1.8, -3.05, 1.4, 3.2, -3.0, 2.8, [0.25, 0.45, 0.60]); // Window right

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 9: HIMALAYAN TERRACOTTA-ROOF COTTAGE (Reference Photo 1 & 2)
// -----------------------------------------------------------------------------
function generateHouseTerracottaModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.96, 0.95, 0.92]; // Whitewashed
  const stonePlinth = [0.42, 0.40, 0.38];
  const roofRed = [0.78, 0.24, 0.18]; // Vibrant terracotta red
  const trimColor = [0.22, 0.18, 0.16];

  // Plinth
  mesh.addBox(-3.8, -2.8, -0.8, 3.8, 2.8, 0.0, stonePlinth);
  // Main structure
  mesh.addBox(-3.6, -2.6, 0, 3.6, 2.6, 4.0, wallColor);
  // Terracotta Gable Roof
  mesh.addGableRoof(-4.0, -3.0, 4.0, 4.0, 3.0, 6.4, roofRed);

  // Front porch
  mesh.addBox(-1.5, -3.6, 0, 1.5, -2.6, 0.25, stonePlinth);
  mesh.addBox(-1.6, -3.7, 2.8, 1.6, -2.6, 3.0, roofRed);
  mesh.addBox(-1.4, -3.5, 0.25, -1.2, -3.3, 2.8, trimColor);
  mesh.addBox(1.2, -3.5, 0.25, 1.4, -3.3, 2.8, trimColor);

  // Door and windows
  mesh.addBox(-0.8, -2.65, 0.25, 0.8, -2.6, 2.4, trimColor);
  mesh.addBox(-2.8, -2.65, 1.3, -1.6, -2.6, 2.5, [0.25, 0.45, 0.60]);
  mesh.addBox(1.6, -2.65, 1.3, 2.8, -2.6, 2.5, [0.25, 0.45, 0.60]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 10: HIMALAYAN ZINC/BLUE-ROOF DWELLING (Reference Photo 2 & 3)
// -----------------------------------------------------------------------------
function generateHouseZincModel() {
  const mesh = new MeshBuilder();
  const wallColor = [0.88, 0.90, 0.90]; // Himalayan cool grey/stone
  const roofBlue = [0.20, 0.42, 0.62]; // Mountain blue zinc
  const stoneBase = [0.38, 0.38, 0.36];

  mesh.addBox(-4.5, -3.0, -0.6, 4.5, 3.0, 0.0, stoneBase);
  mesh.addBox(-4.2, -2.8, 0, 4.2, 2.8, 4.2, wallColor);
  mesh.addGableRoof(-4.6, -3.2, 4.2, 4.6, 3.2, 6.6, roofBlue);

  // Windows per facade
  mesh.addBox(-3.5, -2.85, 1.2, -2.0, -2.8, 2.6, [0.22, 0.48, 0.65]);
  mesh.addBox(-0.8, -2.85, 0.0, 0.8, -2.8, 2.6, [0.30, 0.25, 0.20]);
  mesh.addBox(2.0, -2.85, 1.2, 3.5, -2.8, 2.6, [0.22, 0.48, 0.65]);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 11: RAILWAY VIADUCT MODULE (Haflong / Lumding-Badarpur Hill Section)
// -----------------------------------------------------------------------------
function generateRailwayViaductModel() {
  const mesh = new MeshBuilder();
  const pierColor = [0.62, 0.60, 0.58]; // Weathered concrete arches
  const steelGirder = [0.25, 0.28, 0.32]; // Dark steel
  const ballastColor = [0.40, 0.38, 0.36]; // Gravel ballast
  const railColor = [0.82, 0.82, 0.84]; // Polished steel rails

  // Long Viaduct Deck (36m long x 5m wide x 1.2m thick)
  mesh.addBox(-18, -2.5, 0, 18, 2.5, 1.2, steelGirder);
  // Ballast Trackbed
  mesh.addBox(-18, -2.0, 1.2, 18, 2.0, 1.5, ballastColor);

  // Parallel Steel Rails (Dual Track gauge)
  mesh.addBox(-18, -0.8, 1.5, 18, -0.65, 1.75, railColor);
  mesh.addBox(-18, 0.65, 1.5, 18, 0.8, 1.75, railColor);

  // Rail Sleepers / Ties (transverse bars every 1.5m)
  for (let x = -18; x <= 18; x += 1.5) {
    mesh.addBox(x - 0.15, -1.6, 1.45, x + 0.15, 1.6, 1.55, [0.28, 0.22, 0.18]);
  }

  // Safety Handrails
  mesh.addBox(-18, -2.4, 1.2, 18, -2.3, 2.4, [0.45, 0.48, 0.50]);
  mesh.addBox(-18, 2.3, 1.2, 18, 2.4, 2.4, [0.45, 0.48, 0.50]);

  // Tall Concrete Arched Support Piers
  mesh.addBox(-15, -2.2, -10.0, -11, 2.2, 0.0, pierColor);
  mesh.addBox(11, -2.2, -10.0, 15, 2.2, 0.0, pierColor);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 12: HIMALAYAN PINE TREE (Sikkim steep slopes & road edges)
// -----------------------------------------------------------------------------
function generateTreePineModel() {
  const mesh = new MeshBuilder();
  const trunkColor = [0.35, 0.24, 0.16];
  const pineDark = [0.08, 0.32, 0.20];
  const pineMid = [0.12, 0.42, 0.26];
  const pineLight = [0.16, 0.52, 0.30];

  // Tree Trunk
  mesh.addBox(-0.35, -0.35, 0, 0.35, 0.35, 4.0, trunkColor);

  // Tier 1 (Lowest, widest)
  mesh.addBox(-2.4, -2.4, 2.5, 2.4, 2.4, 4.5, pineDark);
  // Tier 2 (Middle)
  mesh.addBox(-1.8, -1.8, 4.2, 1.8, 1.8, 6.5, pineMid);
  // Tier 3 (Upper)
  mesh.addBox(-1.2, -1.2, 6.2, 1.2, 1.2, 8.2, pineLight);
  // Tier 4 (Tapered Apex)
  mesh.addBox(-0.6, -0.6, 8.0, 0.6, 0.6, 9.8, pineLight);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// MODEL 13: SUBTROPICAL BROADLEAF TREE (Haflong / Dima Hasao lush hills)
// -----------------------------------------------------------------------------
function generateTreeBroadleafModel() {
  const mesh = new MeshBuilder();
  const trunkColor = [0.40, 0.28, 0.18];
  const leafDark = [0.14, 0.48, 0.22];
  const leafMid = [0.18, 0.58, 0.28];
  const leafBright = [0.24, 0.68, 0.34];

  // Trunk
  mesh.addBox(-0.4, -0.4, 0, 0.4, 0.4, 3.5, trunkColor);

  // Rounded overlapping foliage canopy
  mesh.addBox(-2.6, -2.6, 3.0, 2.6, 2.6, 6.0, leafDark);
  mesh.addBox(-2.2, -2.2, 4.5, 2.2, 2.2, 7.5, leafMid);
  mesh.addBox(-1.5, -1.5, 6.5, 1.5, 1.5, 8.8, leafBright);

  // Side asymmetrical canopy clusters
  mesh.addBox(1.0, -1.8, 3.8, 3.2, 1.2, 6.5, leafMid);
  mesh.addBox(-3.0, -0.5, 3.5, -1.0, 2.2, 6.2, leafDark);

  return mesh.buildGLB();
}

// -----------------------------------------------------------------------------
// EXECUTE GENERATION
// -----------------------------------------------------------------------------
const models = [
  { name: 'house.glb', generator: generateHouseModel },
  { name: 'house_himalayan_green.glb', generator: generateHouseGreenModel },
  { name: 'house_himalayan_terracotta.glb', generator: generateHouseTerracottaModel },
  { name: 'house_himalayan_zinc.glb', generator: generateHouseZincModel },
  { name: 'building_multistorey.glb', generator: generateMultiStoreyModel },
  { name: 'hospital.glb', generator: generateHospitalModel },
  { name: 'school.glb', generator: generateSchoolModel },
  { name: 'bridge_truss.glb', generator: generateBridgeTrussModel },
  { name: 'substation_power.glb', generator: generateSubstationPowerModel },
  { name: 'infrastructure_tower.glb', generator: generateInfrastructureTowerModel },
  { name: 'railway_viaduct.glb', generator: generateRailwayViaductModel },
  { name: 'tree_pine.glb', generator: generateTreePineModel },
  { name: 'tree_broadleaf.glb', generator: generateTreeBroadleafModel }
];

console.log('Generating GLB 3D models for EPOCH 3D Earth...');
models.forEach(m => {
  const filePath = path.join(modelsDir, m.name);
  const glbBuffer = m.generator();
  fs.writeFileSync(filePath, glbBuffer);
  console.log(`✔ Generated ${m.name} (${glbBuffer.length} bytes) -> ${filePath}`);
});

console.log('All 3D models generated successfully.');

