/**
 * NASTRAN BDF (Bulk Data Format) thermal mesh parser.
 *
 * Supports both small-field (8-char fixed-width columns) and
 * free-field (comma-delimited) card formats. Continuation lines
 * (leading +, *, or whitespace) are merged before parsing.
 *
 * Mapped card types:
 *   GRID        → grid points (x, y, z)
 *   CHBDYE      → surface heat-transfer elements
 *   CHBDYG      → general surface heat-transfer elements
 *   MAT4        → isotropic thermal material
 *   MAT5        → anisotropic thermal material
 *   PCONV       → convection property
 *   PRAD        → radiation property
 *   SPC / SPC1  → single-point constraint (fixed temperature)
 *   TEMP        → node initial temperature
 *   TEMPD       → default initial temperature
 */

// ── Public types ────────────────────────────────────────────────────────────

export interface BdfGrid {
  id: number;
  cp: number;
  x: number;
  y: number;
  z: number;
}

export interface BdfChbdye {
  eid: number;
  eid2: number; // parent element id
  side: number;
  iviewF?: number;
  iviewB?: number;
  radMidF?: number;
  radMidB?: number;
}

export interface BdfChbdyg {
  eid: number;
  type: string; // e.g. AREA4, AREA8, etc.
  iviewF?: number;
  iviewB?: number;
  radMidF?: number;
  radMidB?: number;
  grids: number[]; // grid point ids
}

export interface BdfMat4 {
  mid: number;
  k: number;       // thermal conductivity W/(m·K)
  cp: number;      // specific heat J/(kg·K)
  rho: number;     // density kg/m³
  h?: number;      // free convection coefficient
  mu?: number;     // dynamic viscosity
  hgen?: number;   // volumetric heat generation
  refEnthalpy?: number;
  tch?: number;
  tdelta?: number;
  qlat?: number;
}

export interface BdfMat5 {
  mid: number;
  kxx: number;
  kxy: number;
  kxz: number;
  kyy: number;
  kyz: number;
  kzz: number;
  cp: number;
  rho: number;
  hgen?: number;
}

export interface BdfPconv {
  pid: number;
  mid: number;     // MAT4 id
  form: number;
  expf: number;
  ftype?: number;
  tid?: number;
  chlen?: number;
  giession?: number;
  ce?: number;
  e1?: number;
  e2?: number;
  e3?: number;
}

export interface BdfPrad {
  pid: number;
  mid: number;     // MAT4 id
  absorb: number;  // absorptivity
  emissivity: number;
}

export interface BdfSpc {
  sid: number;
  nodeId: number;
  dof: number;
  value: number;
}

export interface BdfTemp {
  sid: number;
  nodeId: number;
  temperature: number;
}

export interface BdfTempd {
  sid: number;
  temperature: number;
}

export interface BdfParseResult {
  grids: BdfGrid[];
  chbdye: BdfChbdye[];
  chbdyg: BdfChbdyg[];
  mat4: BdfMat4[];
  mat5: BdfMat5[];
  pconv: BdfPconv[];
  prad: BdfPrad[];
  spc: BdfSpc[];
  temp: BdfTemp[];
  tempd: BdfTempd[];
  warnings: string[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Detect if a line uses free-field (comma) format */
function isFreeField(line: string): boolean {
  return line.includes(',');
}

/** Parse a free-field (comma-separated) line into trimmed string fields */
function parseFreeFields(line: string): string[] {
  return line.split(',').map((f) => f.trim());
}

/**
 * Parse a small-field (8-char column) line into trimmed string fields.
 * First field is 8 chars, then every subsequent field is 8 chars.
 */
function parseSmallFields(line: string): string[] {
  const fields: string[] = [];
  // Pad to avoid substring OOB
  const padded = line.padEnd(80, ' ');
  for (let i = 0; i < 80; i += 8) {
    fields.push(padded.substring(i, i + 8).trim());
  }
  return fields;
}

/** Parse fields from a line, auto-detecting format */
function parseFields(line: string): string[] {
  return isFreeField(line) ? parseFreeFields(line) : parseSmallFields(line);
}

/** Parse a numeric field, returning 0 for empty/invalid */
function num(field: string | undefined): number {
  if (!field || field === '') return 0;
  const v = parseFloat(field);
  return isNaN(v) ? 0 : v;
}

/** Parse an integer field, returning 0 for empty/invalid */
function int(field: string | undefined): number {
  if (!field || field === '') return 0;
  const v = parseInt(field, 10);
  return isNaN(v) ? 0 : v;
}

// ── Continuation merging ────────────────────────────────────────────────────

/**
 * Merge continuation lines into their parent card.
 * Continuation lines start with +, *, or 8+ spaces (small field continuation).
 * We also handle the convention where a line ends with a continuation marker
 * (field 10 = +xxx) and the next line starts with +xxx.
 */
function mergeContLines(rawLines: string[]): string[] {
  const merged: string[] = [];
  let current = '';

  for (const line of rawLines) {
    const trimmed = line.trimStart();

    // Skip empty lines, comments, and executive/case control
    if (!trimmed || trimmed.startsWith('$')) continue;

    // Check if this is a continuation line
    const isCont =
      trimmed.startsWith('+') ||
      trimmed.startsWith('*') ||
      (line.startsWith('        ') && current !== '');

    if (isCont && current) {
      // Append fields from continuation line (skip the continuation marker in field 1)
      if (isFreeField(trimmed)) {
        // Free-field continuation: skip the first field (continuation marker)
        const parts = trimmed.split(',');
        current += ',' + parts.slice(1).join(',');
      } else {
        // Small-field continuation: strip the first 8-char field, append rest
        const rest = trimmed.length > 8 ? trimmed.substring(8) : '';
        current += rest;
      }
    } else {
      // Flush previous card
      if (current) merged.push(current);
      current = line;
    }
  }
  // Flush last card
  if (current) merged.push(current);

  return merged;
}

// ── Card parsers ────────────────────────────────────────────────────────────

function parseGrid(fields: string[]): BdfGrid {
  return {
    id: int(fields[1]),
    cp: int(fields[2]),
    x: num(fields[3]),
    y: num(fields[4]),
    z: num(fields[5]),
  };
}

function parseChbdye(fields: string[]): BdfChbdye {
  return {
    eid: int(fields[1]),
    eid2: int(fields[2]),
    side: int(fields[3]),
    iviewF: int(fields[4]) || undefined,
    iviewB: int(fields[5]) || undefined,
    radMidF: int(fields[6]) || undefined,
    radMidB: int(fields[7]) || undefined,
  };
}

function parseChbdyg(fields: string[]): BdfChbdyg {
  const grids: number[] = [];
  // Grids start at field 9 onward (after type, iview, radmid fields)
  for (let i = 9; i < fields.length; i++) {
    const g = int(fields[i]);
    if (g > 0) grids.push(g);
  }
  return {
    eid: int(fields[1]),
    type: (fields[3] || '').toUpperCase(),
    iviewF: int(fields[4]) || undefined,
    iviewB: int(fields[5]) || undefined,
    radMidF: int(fields[6]) || undefined,
    radMidB: int(fields[7]) || undefined,
    grids,
  };
}

function parseMat4(fields: string[]): BdfMat4 {
  return {
    mid: int(fields[1]),
    k: num(fields[2]),
    cp: num(fields[3]),
    rho: num(fields[4]),
    h: num(fields[5]) || undefined,
    mu: num(fields[6]) || undefined,
    hgen: num(fields[7]) || undefined,
    refEnthalpy: num(fields[8]) || undefined,
    tch: num(fields[9]) || undefined,
    tdelta: num(fields[10]) || undefined,
    qlat: num(fields[11]) || undefined,
  };
}

function parseMat5(fields: string[]): BdfMat5 {
  return {
    mid: int(fields[1]),
    kxx: num(fields[2]),
    kxy: num(fields[3]),
    kxz: num(fields[4]),
    kyy: num(fields[5]),
    kyz: num(fields[6]),
    kzz: num(fields[7]),
    cp: num(fields[8]),
    rho: num(fields[9]),
    hgen: num(fields[10]) || undefined,
  };
}

function parsePconv(fields: string[]): BdfPconv {
  return {
    pid: int(fields[1]),
    mid: int(fields[2]),
    form: int(fields[3]),
    expf: num(fields[4]),
  };
}

function parsePrad(fields: string[]): BdfPrad {
  return {
    pid: int(fields[1]),
    mid: int(fields[2]),
    absorb: num(fields[3]),
    emissivity: num(fields[4]),
  };
}

function parseSpc(fields: string[]): BdfSpc[] {
  // SPC can have multiple node/dof/value triples on one card
  const results: BdfSpc[] = [];
  const sid = int(fields[1]);
  // fields: SPC, SID, G1, C1, D1, G2, C2, D2
  for (let i = 2; i + 2 < fields.length; i += 3) {
    const nodeId = int(fields[i]);
    if (nodeId === 0) break;
    results.push({
      sid,
      nodeId,
      dof: int(fields[i + 1]),
      value: num(fields[i + 2]),
    });
  }
  return results;
}

function parseTemp(fields: string[]): BdfTemp[] {
  // TEMP can have multiple node/temp pairs: TEMP, SID, G1, T1, G2, T2, ...
  const results: BdfTemp[] = [];
  const sid = int(fields[1]);
  for (let i = 2; i + 1 < fields.length; i += 2) {
    const nodeId = int(fields[i]);
    if (nodeId === 0 && (fields[i] || '').trim() === '') break;
    results.push({ sid, nodeId, temperature: num(fields[i + 1]) });
  }
  return results;
}

function parseTempd(fields: string[]): BdfTempd {
  return {
    sid: int(fields[1]),
    temperature: num(fields[2]),
  };
}

// ── Main parser ─────────────────────────────────────────────────────────────

const KNOWN_CARDS = new Set([
  'GRID', 'CHBDYE', 'CHBDYG', 'MAT4', 'MAT5',
  'PCONV', 'PRAD', 'SPC', 'SPC1', 'TEMP', 'TEMPD',
]);

// Cards we silently skip without warning (executive control, common structural)
const SKIP_CARDS = new Set([
  'SOL', 'CEND', 'BEGIN', 'ENDDATA', 'PARAM', 'EIGR', 'EIGRL',
  'TITLE', 'SUBTITLE', 'LABEL', 'SUBCASE', 'LOAD', 'DLOAD',
  'TSTEP', 'NLPARM', 'OUTPUT',
]);

/**
 * Parse a NASTRAN BDF file content string into structured data.
 */
export function parseBdf(content: string): BdfParseResult {
  const result: BdfParseResult = {
    grids: [],
    chbdye: [],
    chbdyg: [],
    mat4: [],
    mat5: [],
    pconv: [],
    prad: [],
    spc: [],
    temp: [],
    tempd: [],
    warnings: [],
  };

  const rawLines = content.replace(/\r\n/g, '\n').split('\n');
  const cards = mergeContLines(rawLines);

  let inBulk = false;

  for (const card of cards) {
    const trimmed = card.trim();
    if (!trimmed) continue;

    // Track bulk data section
    if (trimmed.toUpperCase().startsWith('BEGIN BULK') || trimmed.toUpperCase() === 'BEGIN BULK') {
      inBulk = true;
      continue;
    }
    if (trimmed.toUpperCase() === 'ENDDATA') {
      break;
    }

    // Skip executive/case control before BEGIN BULK
    // (but also allow files with no BEGIN BULK — treat all as bulk)
    const fields = parseFields(trimmed);
    const cardName = (fields[0] || '').toUpperCase();

    if (!cardName) continue;
    if (SKIP_CARDS.has(cardName)) continue;

    // If we haven't seen BEGIN BULK, check if this looks like a bulk card
    if (!inBulk && !KNOWN_CARDS.has(cardName)) continue;

    try {
      switch (cardName) {
        case 'GRID':
          result.grids.push(parseGrid(fields));
          break;
        case 'CHBDYE':
          result.chbdye.push(parseChbdye(fields));
          break;
        case 'CHBDYG':
          result.chbdyg.push(parseChbdyg(fields));
          break;
        case 'MAT4':
          result.mat4.push(parseMat4(fields));
          break;
        case 'MAT5':
          result.mat5.push(parseMat5(fields));
          break;
        case 'PCONV':
          result.pconv.push(parsePconv(fields));
          break;
        case 'PRAD':
          result.prad.push(parsePrad(fields));
          break;
        case 'SPC':
        case 'SPC1':
          result.spc.push(...parseSpc(fields));
          break;
        case 'TEMP':
          result.temp.push(...parseTemp(fields));
          break;
        case 'TEMPD':
          result.tempd.push(parseTempd(fields));
          break;
        default:
          if (inBulk) {
            result.warnings.push(`Unsupported card: ${cardName}`);
          }
          break;
      }
    } catch (err) {
      result.warnings.push(
        `Error parsing ${cardName}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  return result;
}
