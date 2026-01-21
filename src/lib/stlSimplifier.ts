/**
 * Fast Quadric Mesh Simplification
 * Based on: https://github.com/sp4cerat/Fast-Quadric-Mesh-Simplification
 * 
 * This algorithm uses quadric error metrics to determine the optimal
 * vertex positions when collapsing edges, preserving mesh quality
 * while reducing triangle count.
 */

// Vector3 class for 3D operations
class Vec3 {
  x: number;
  y: number;
  z: number;

  constructor(x = 0, y = 0, z = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z);
  }

  sub(v: Vec3): Vec3 {
    return new Vec3(this.x - v.x, this.y - v.y, this.z - v.z);
  }

  add(v: Vec3): Vec3 {
    return new Vec3(this.x + v.x, this.y + v.y, this.z + v.z);
  }

  scale(s: number): Vec3 {
    return new Vec3(this.x * s, this.y * s, this.z * s);
  }

  dot(v: Vec3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  cross(v: Vec3): Vec3 {
    return new Vec3(
      this.y * v.z - this.z * v.y,
      this.z * v.x - this.x * v.z,
      this.x * v.y - this.y * v.x
    );
  }

  length(): number {
    return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
  }

  normalize(): Vec3 {
    const len = this.length();
    if (len === 0) return new Vec3();
    return this.scale(1 / len);
  }

  equals(v: Vec3, epsilon = 1e-6): boolean {
    return Math.abs(this.x - v.x) < epsilon &&
           Math.abs(this.y - v.y) < epsilon &&
           Math.abs(this.z - v.z) < epsilon;
  }
}

// Symmetric Matrix for quadric error calculation
class SymmetricMatrix {
  m: number[];

  constructor(c = 0, ...rest: number[]) {
    if (rest.length === 9) {
      this.m = [c, ...rest];
    } else {
      this.m = [c, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    }
  }

  static fromPlane(a: number, b: number, c: number, d: number): SymmetricMatrix {
    const m = new SymmetricMatrix();
    m.m[0] = a * a; m.m[1] = a * b; m.m[2] = a * c; m.m[3] = a * d;
    m.m[4] = b * b; m.m[5] = b * c; m.m[6] = b * d;
    m.m[7] = c * c; m.m[8] = c * d;
    m.m[9] = d * d;
    return m;
  }

  add(n: SymmetricMatrix): SymmetricMatrix {
    const result = new SymmetricMatrix();
    for (let i = 0; i < 10; i++) {
      result.m[i] = this.m[i] + n.m[i];
    }
    return result;
  }

  det(a11: number, a12: number, a13: number,
      a21: number, a22: number, a23: number,
      a31: number, a32: number, a33: number): number {
    const det = this.m[a11] * this.m[a22] * this.m[a33] +
                this.m[a13] * this.m[a21] * this.m[a32] +
                this.m[a12] * this.m[a23] * this.m[a31] -
                this.m[a13] * this.m[a22] * this.m[a31] -
                this.m[a11] * this.m[a23] * this.m[a32] -
                this.m[a12] * this.m[a21] * this.m[a33];
    return det;
  }
}

interface Vertex {
  p: Vec3;
  tstart: number;
  tcount: number;
  q: SymmetricMatrix;
  border: boolean;
}

interface Triangle {
  v: number[];
  err: number[];
  deleted: boolean;
  dirty: boolean;
  n: Vec3;
}

interface Ref {
  tid: number;
  tvertex: number;
}

class MeshSimplifier {
  vertices: Vertex[] = [];
  triangles: Triangle[] = [];
  refs: Ref[] = [];

  // Parse STL binary format into mesh structure
  parseSTL(buffer: ArrayBuffer): void {
    const view = new DataView(buffer);
    const numTriangles = view.getUint32(80, true);
    
    // Build vertex map to merge identical vertices
    const vertexMap = new Map<string, number>();
    const vertexList: Vec3[] = [];
    const triangleList: number[][] = [];
    
    let offset = 84;
    
    for (let t = 0; t < numTriangles; t++) {
      // Skip normal (12 bytes)
      offset += 12;
      
      const triIndices: number[] = [];
      
      // Read 3 vertices
      for (let v = 0; v < 3; v++) {
        const x = view.getFloat32(offset, true);
        const y = view.getFloat32(offset + 4, true);
        const z = view.getFloat32(offset + 8, true);
        offset += 12;
        
        // Create hash key for vertex merging
        const key = `${x.toFixed(6)},${y.toFixed(6)},${z.toFixed(6)}`;
        
        let idx = vertexMap.get(key);
        if (idx === undefined) {
          idx = vertexList.length;
          vertexMap.set(key, idx);
          vertexList.push(new Vec3(x, y, z));
        }
        triIndices.push(idx);
      }
      
      // Skip attribute byte count
      offset += 2;
      
      // Only add non-degenerate triangles
      if (triIndices[0] !== triIndices[1] && 
          triIndices[1] !== triIndices[2] && 
          triIndices[2] !== triIndices[0]) {
        triangleList.push(triIndices);
      }
    }
    
    // Build mesh structure
    this.vertices = vertexList.map(p => ({
      p,
      tstart: 0,
      tcount: 0,
      q: new SymmetricMatrix(),
      border: false
    }));
    
    this.triangles = triangleList.map(v => ({
      v,
      err: [0, 0, 0, 0],
      deleted: false,
      dirty: false,
      n: new Vec3()
    }));
    
    console.log(`Parsed ${this.vertices.length} unique vertices, ${this.triangles.length} triangles`);
  }

  // Compute initial quadric errors for all vertices
  initQuadrics(): void {
    for (const t of this.triangles) {
      const p = t.v.map(i => this.vertices[i].p);
      
      // Calculate face normal
      const n = p[1].sub(p[0]).cross(p[2].sub(p[0])).normalize();
      t.n = n;
      
      // Calculate plane equation: ax + by + cz + d = 0
      const d = -n.dot(p[0]);
      const q = SymmetricMatrix.fromPlane(n.x, n.y, n.z, d);
      
      // Add quadric to each vertex
      for (const vi of t.v) {
        this.vertices[vi].q = this.vertices[vi].q.add(q);
      }
    }
  }

  // Calculate error for edge collapse
  calculateError(id_v1: number, id_v2: number): { error: number; p: Vec3 } {
    const q = this.vertices[id_v1].q.add(this.vertices[id_v2].q);
    const border = this.vertices[id_v1].border && this.vertices[id_v2].border;
    
    let p_result: Vec3;
    let error: number;
    
    const det = q.det(0, 1, 2, 1, 4, 5, 2, 5, 7);
    
    if (det !== 0 && !border) {
      // Optimal position via matrix solve
      p_result = new Vec3(
        -1 / det * q.det(1, 2, 3, 4, 5, 6, 5, 7, 8),
        1 / det * q.det(0, 2, 3, 1, 5, 6, 2, 7, 8),
        -1 / det * q.det(0, 1, 3, 1, 4, 6, 2, 5, 8)
      );
      error = this.vertexError(q, p_result);
    } else {
      // Try endpoints and midpoint
      const p1 = this.vertices[id_v1].p;
      const p2 = this.vertices[id_v2].p;
      const p3 = p1.add(p2).scale(0.5);
      
      const error1 = this.vertexError(q, p1);
      const error2 = this.vertexError(q, p2);
      const error3 = this.vertexError(q, p3);
      
      error = Math.min(error1, error2, error3);
      
      if (error === error3) p_result = p3;
      else if (error === error2) p_result = p2;
      else p_result = p1;
    }
    
    return { error, p: p_result };
  }

  vertexError(q: SymmetricMatrix, v: Vec3): number {
    return q.m[0] * v.x * v.x + 2 * q.m[1] * v.x * v.y + 2 * q.m[2] * v.x * v.z + 2 * q.m[3] * v.x +
           q.m[4] * v.y * v.y + 2 * q.m[5] * v.y * v.z + 2 * q.m[6] * v.y +
           q.m[7] * v.z * v.z + 2 * q.m[8] * v.z + q.m[9];
  }

  // Update all triangle errors
  updateTriangles(i0: number, v: Vertex, deleted: boolean[]): boolean {
    for (let k = 0; k < v.tcount; k++) {
      const r = this.refs[v.tstart + k];
      const t = this.triangles[r.tid];
      
      if (t.deleted) continue;
      if (deleted[k]) {
        t.deleted = true;
        continue;
      }
      
      t.v[r.tvertex] = i0;
      t.dirty = true;
      
      // Update errors
      t.err[0] = this.calculateError(t.v[0], t.v[1]).error;
      t.err[1] = this.calculateError(t.v[1], t.v[2]).error;
      t.err[2] = this.calculateError(t.v[2], t.v[0]).error;
      t.err[3] = Math.min(t.err[0], t.err[1], t.err[2]);
    }
    return true;
  }

  // Check if edge can be flipped without causing topology issues
  // More conservative checks to prevent holes
  flipped(p: Vec3, i0: number, i1: number, v0: Vertex, deleted: boolean[]): boolean {
    for (let k = 0; k < v0.tcount; k++) {
      const ref = this.refs[v0.tstart + k];
      if (!ref) continue;
      
      const t = this.triangles[ref.tid];
      if (t.deleted) continue;
      
      const s = ref.tvertex;
      const id1 = t.v[(s + 1) % 3];
      const id2 = t.v[(s + 2) % 3];
      
      if (id1 === i1 || id2 === i1) {
        deleted[k] = true;
        continue;
      }
      
      const d1 = this.vertices[id1].p.sub(p).normalize();
      const d2 = this.vertices[id2].p.sub(p).normalize();
      
      // More conservative: reject if edges become too parallel (prevents holes)
      if (Math.abs(d1.dot(d2)) > 0.95) return true;
      
      const n = d1.cross(d2).normalize();
      deleted[k] = false;
      
      // More conservative: require better normal alignment (prevents flipping)
      if (n.dot(t.n) < 0.5) return true;
      
      // Additional check: prevent very thin triangles
      const cross = d1.cross(d2);
      const area = cross.length();
      if (area < 0.001) return true;
    }
    return false;
  }

  // Build reference list
  updateRefs(): void {
    // Count triangles per vertex
    for (const v of this.vertices) {
      v.tstart = 0;
      v.tcount = 0;
    }
    
    for (const t of this.triangles) {
      if (t.deleted) continue;
      for (const vi of t.v) {
        this.vertices[vi].tcount++;
      }
    }
    
    // Assign start positions
    let tstart = 0;
    for (const v of this.vertices) {
      v.tstart = tstart;
      tstart += v.tcount;
      v.tcount = 0;
    }
    
    // Fill references
    this.refs = new Array(tstart);
    for (let i = 0; i < this.triangles.length; i++) {
      const t = this.triangles[i];
      if (t.deleted) continue;
      
      for (let j = 0; j < 3; j++) {
        const v = this.vertices[t.v[j]];
        this.refs[v.tstart + v.tcount] = { tid: i, tvertex: j };
        v.tcount++;
      }
    }
    
    // Detect borders
    for (const v of this.vertices) {
      v.border = false;
    }
    
    const vids: number[] = [];
    const vcount: number[] = [];
    
    for (const v of this.vertices) {
      vids.length = 0;
      vcount.length = 0;
      
      for (let j = 0; j < v.tcount; j++) {
        const t = this.triangles[this.refs[v.tstart + j].tid];
        
        for (let k = 0; k < 3; k++) {
          let ofs = 0;
          const id = t.v[k];
          
          while (ofs < vids.length) {
            if (vids[ofs] === id) break;
            ofs++;
          }
          
          if (ofs === vids.length) {
            vids.push(id);
            vcount.push(1);
          } else {
            vcount[ofs]++;
          }
        }
      }
      
      for (let j = 0; j < vids.length; j++) {
        if (vcount[j] === 1) {
          this.vertices[vids[j]].border = true;
        }
      }
    }
  }

  // Main simplification loop - more conservative to prevent holes
  simplify(targetCount: number, aggressiveness = 5): void {
    console.log(`Starting simplification: target ${targetCount} triangles`);
    
    // Initialize
    for (const t of this.triangles) {
      t.deleted = false;
    }
    
    this.updateRefs();
    this.initQuadrics();
    
    // Calculate initial errors
    for (const t of this.triangles) {
      t.err[0] = this.calculateError(t.v[0], t.v[1]).error;
      t.err[1] = this.calculateError(t.v[1], t.v[2]).error;
      t.err[2] = this.calculateError(t.v[2], t.v[0]).error;
      t.err[3] = Math.min(t.err[0], t.err[1], t.err[2]);
    }
    
    let deletedTriangles = 0;
    const deleted0: boolean[] = [];
    const deleted1: boolean[] = [];
    
    const triangleCount = this.triangles.length;
    let stuckIterations = 0;
    let lastDeletedCount = 0;
    
    // More iterations but more conservative per iteration
    for (let iteration = 0; iteration < 200; iteration++) {
      const currentCount = triangleCount - deletedTriangles;
      if (currentCount <= targetCount) break;
      
      // Track if we're making progress
      if (deletedTriangles === lastDeletedCount) {
        stuckIterations++;
        if (stuckIterations > 20) {
          console.log(`Stopping early: no progress after ${stuckIterations} iterations`);
          break;
        }
      } else {
        stuckIterations = 0;
        lastDeletedCount = deletedTriangles;
      }
      
      // Update refs more frequently for better topology awareness
      if (iteration % 3 === 0) {
        this.updateRefs();
      }
      
      // More gradual threshold increase (less aggressive)
      const threshold = 0.0000000001 * Math.pow(iteration + 3, aggressiveness);
      
      // Process all triangles
      for (let i = 0; i < this.triangles.length; i++) {
        const t = this.triangles[i];
        if (t.deleted) continue;
        if (t.dirty) continue;
        if (t.err[3] > threshold) continue;
        
        for (let j = 0; j < 3; j++) {
          if (t.err[j] > threshold) continue;
          
          const i0 = t.v[j];
          const i1 = t.v[(j + 1) % 3];
          const v0 = this.vertices[i0];
          const v1 = this.vertices[i1];
          
          // Skip border edges
          if (v0.border !== v1.border) continue;
          
          // Calculate collapse target
          const { p } = this.calculateError(i0, i1);
          
          deleted0.length = v0.tcount;
          deleted1.length = v1.tcount;
          deleted0.fill(false);
          deleted1.fill(false);
          
          // Check for flipped triangles
          if (this.flipped(p, i0, i1, v0, deleted0)) continue;
          if (this.flipped(p, i1, i0, v1, deleted1)) continue;
          
          // Collapse edge
          v0.p = p;
          v0.q = v0.q.add(v1.q);
          
          const tstart = this.refs.length;
          
          this.updateTriangles(i0, v0, deleted0);
          this.updateTriangles(i0, v1, deleted1);
          
          const tcount = this.refs.length - tstart;
          
          if (tcount <= v0.tcount) {
            if (tcount > 0) {
              for (let k = 0; k < tcount; k++) {
                this.refs[v0.tstart + k] = this.refs[tstart + k];
              }
            }
          } else {
            v0.tstart = tstart;
          }
          
          v0.tcount = tcount;
          deletedTriangles++;
          break;
        }
        
        if (triangleCount - deletedTriangles <= targetCount) break;
      }
      
      // Clear dirty flags
      for (const t of this.triangles) {
        t.dirty = false;
      }
    }
    
    console.log(`Simplification complete: ${triangleCount - deletedTriangles} triangles remaining`);
  }

  // Export to binary STL
  exportSTL(): ArrayBuffer {
    // Count valid triangles
    const validTriangles = this.triangles.filter(t => !t.deleted);
    const numTriangles = validTriangles.length;
    
    // STL binary format: 80 header + 4 bytes count + 50 bytes per triangle
    const bufferSize = 80 + 4 + numTriangles * 50;
    const buffer = new ArrayBuffer(bufferSize);
    const view = new DataView(buffer);
    const uint8 = new Uint8Array(buffer);
    
    // Write header
    const header = "Fast Quadric Mesh Simplification - Lovable";
    for (let i = 0; i < Math.min(header.length, 80); i++) {
      uint8[i] = header.charCodeAt(i);
    }
    
    // Write triangle count
    view.setUint32(80, numTriangles, true);
    
    // Write triangles
    let offset = 84;
    for (const t of validTriangles) {
      const p0 = this.vertices[t.v[0]].p;
      const p1 = this.vertices[t.v[1]].p;
      const p2 = this.vertices[t.v[2]].p;
      
      // Calculate normal
      const n = p1.sub(p0).cross(p2.sub(p0)).normalize();
      
      // Write normal
      view.setFloat32(offset, n.x, true); offset += 4;
      view.setFloat32(offset, n.y, true); offset += 4;
      view.setFloat32(offset, n.z, true); offset += 4;
      
      // Write vertices
      view.setFloat32(offset, p0.x, true); offset += 4;
      view.setFloat32(offset, p0.y, true); offset += 4;
      view.setFloat32(offset, p0.z, true); offset += 4;
      
      view.setFloat32(offset, p1.x, true); offset += 4;
      view.setFloat32(offset, p1.y, true); offset += 4;
      view.setFloat32(offset, p1.z, true); offset += 4;
      
      view.setFloat32(offset, p2.x, true); offset += 4;
      view.setFloat32(offset, p2.y, true); offset += 4;
      view.setFloat32(offset, p2.z, true); offset += 4;
      
      // Write attribute byte count
      view.setUint16(offset, 0, true); offset += 2;
    }
    
    return buffer;
  }
}

/**
 * Simplify an STL file using the Fast Quadric Mesh Simplification algorithm
 * More conservative settings to prevent holes while still achieving size reduction
 * 
 * @param file - The STL file to simplify
 * @param targetSizeMB - Target file size in MB (default: 10 for better quality)
 * @param progressCallback - Optional callback for progress updates
 */
export const simplifySTL = async (
  file: File, 
  targetSizeMB: number = 10,
  progressCallback?: (progress: number, message: string) => void
): Promise<File> => {
  console.log('Starting Fast Quadric Mesh Simplification (conservative mode)...');
  progressCallback?.(0, 'Bestand lezen...');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        const originalSizeMB = file.size / 1024 / 1024;
        
        console.log(`Original size: ${originalSizeMB.toFixed(2)} MB`);
        progressCallback?.(10, 'Mesh analyseren...');
        
        // Parse the STL
        const simplifier = new MeshSimplifier();
        simplifier.parseSTL(arrayBuffer);
        
        const originalTriangles = simplifier.triangles.length;
        
        // More conservative reduction - aim for max 50% reduction to prevent holes
        // Calculate based on file size but cap the reduction
        const rawReductionRatio = targetSizeMB / originalSizeMB;
        // Never reduce below 50% of original triangles to maintain quality
        const reductionRatio = Math.max(rawReductionRatio, 0.5);
        
        const targetTriangles = Math.max(
          Math.floor(originalTriangles * reductionRatio),
          50000 // Higher minimum triangles for better quality
        );
        
        console.log(`Original triangles: ${originalTriangles}`);
        console.log(`Target triangles: ${targetTriangles}`);
        console.log(`Reduction ratio: ${(reductionRatio * 100).toFixed(1)}%`);
        
        progressCallback?.(20, `Vereenvoudigen van ${originalTriangles.toLocaleString()} naar ~${targetTriangles.toLocaleString()} driehoeken...`);
        
        // Run simplification with lower aggressiveness (5 instead of 7)
        simplifier.simplify(targetTriangles, 5);
        
        progressCallback?.(80, 'Nieuw bestand genereren...');
        
        // Export to STL
        const newBuffer = simplifier.exportSTL();
        const newSizeMB = newBuffer.byteLength / 1024 / 1024;
        
        console.log(`New size: ${newSizeMB.toFixed(2)} MB`);
        
        progressCallback?.(100, `Klaar! ${newSizeMB.toFixed(2)} MB`);
        
        // Create new file
        const blob = new Blob([newBuffer], { type: 'application/octet-stream' });
        const newFile = new File([blob], file.name, { type: file.type });
        
        resolve(newFile);
      } catch (error) {
        console.error('Error simplifying STL:', error);
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Check if a file needs simplification (>5MB)
 */
export const needsSimplification = (file: File, thresholdMB: number = 5): boolean => {
  return file.size > thresholdMB * 1024 * 1024;
};
