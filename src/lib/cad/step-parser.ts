/**
 * Web Worker wrapper for STEP file parsing.
 * Provides a promise-based API with progress callbacks.
 */

export interface ParsedFace {
  id: string;
  name: string;
  positions: Float32Array;
  normals: Float32Array;
  indices: Uint32Array;
  color: [number, number, number];
  surfaceArea: number;
}

export interface ParseResult {
  faces: ParsedFace[];
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  totalSurfaceArea: number;
}

export interface ParseProgress {
  percent: number;
  message: string;
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const VALID_EXTENSIONS = ['.step', '.stp'];

export function validateStepFile(file: File): string | null {
  const ext = file.name.toLowerCase().slice(file.name.lastIndexOf('.'));
  if (!VALID_EXTENSIONS.includes(ext)) {
    return `Invalid file type "${ext}". Please upload a .step or .stp file.`;
  }
  if (file.size > MAX_FILE_SIZE) {
    return `File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 100MB.`;
  }
  return null;
}

export function parseStepFile(
  file: File,
  onProgress?: (progress: ParseProgress) => void,
): Promise<ParseResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('/wasm/step-worker.js');

    worker.onmessage = (e: MessageEvent) => {
      const msg = e.data;
      switch (msg.type) {
        case 'progress':
          onProgress?.({ percent: msg.percent, message: msg.message });
          break;
        case 'result':
          worker.terminate();
          resolve(msg.data as ParseResult);
          break;
        case 'error':
          worker.terminate();
          reject(new Error(msg.message));
          break;
      }
    };

    worker.onerror = (err) => {
      worker.terminate();
      reject(new Error(`Worker error: ${err.message}`));
    };

    // Read file and send to worker
    file.arrayBuffer().then((buffer) => {
      onProgress?.({ percent: 2, message: 'Sending file to parser…' });
      worker.postMessage({ type: 'parse', fileBuffer: buffer }, [buffer]);
    }).catch((err) => {
      worker.terminate();
      reject(new Error(`Failed to read file: ${err.message}`));
    });
  });
}
