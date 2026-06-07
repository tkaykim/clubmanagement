// lib/xlsx.ts
// 의존성 없는 최소 XLSX(OOXML) 생성기 — 브라우저에서 클라이언트 사이드 다운로드용.
// 쓰기 전용(파싱 안 함)이므로 SheetJS 류 외부 의존성/취약점 없이 안전하게 사용.
// 다중 시트, 문자열/숫자 셀, inline string 방식 지원. ZIP 은 store(무압축).

export type XlsxCell = string | number | null | undefined;
export type XlsxSheet = { name: string; rows: XlsxCell[][] };

// ── XML escape ─────────────────────────────────────────────
function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// 0-based 컬럼 인덱스 → 엑셀 컬럼명 (0→A, 26→AA)
function colName(n: number): string {
  let s = "";
  let x = n + 1;
  while (x > 0) {
    const r = (x - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    x = Math.floor((x - 1) / 26);
  }
  return s;
}

// 시트 이름 정규화: 31자 제한, 금지문자 제거, 공백 보정, 중복 회피
function sanitizeSheetName(name: string, used: Set<string>): string {
  let n = (name || "Sheet").replace(/[[\]:*?/\\]/g, " ").trim().slice(0, 31);
  if (!n) n = "Sheet";
  let candidate = n;
  let i = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${i})`;
    candidate = n.slice(0, 31 - suffix.length) + suffix;
    i++;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function sheetXml(rows: XlsxCell[][]): string {
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((cell, c) => {
          const ref = `${colName(c)}${r + 1}`;
          if (cell === null || cell === undefined || cell === "") {
            return "";
          }
          if (typeof cell === "number" && Number.isFinite(cell)) {
            return `<c r="${ref}"><v>${cell}</v></c>`;
          }
          const text = String(cell);
          return `<c r="${ref}" t="inlineStr"><is><t xml:space="preserve">${esc(text)}</t></is></c>`;
        })
        .join("");
      return `<row r="${r + 1}">${cells}</row>`;
    })
    .join("");
  return (
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<sheetData>${body}</sheetData></worksheet>`
  );
}

// ── ZIP (store, 무압축) ────────────────────────────────────
function strToU8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = ~0;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  }
  return (~crc) >>> 0;
}

type ZipEntry = { name: string; data: Uint8Array };

function zipStore(entries: ZipEntry[]): Uint8Array {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const e of entries) {
    const nameBytes = strToU8(e.name);
    const crc = crc32(e.data);
    const size = e.data.length;

    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true);
    lh.setUint16(4, 20, true); // version needed
    lh.setUint16(6, 0, true); // flags
    lh.setUint16(8, 0, true); // method: store
    lh.setUint16(10, 0, true); // mod time
    lh.setUint16(12, 0x21, true); // mod date = 1980-01-01
    lh.setUint32(14, crc, true);
    lh.setUint32(18, size, true);
    lh.setUint32(22, size, true);
    lh.setUint16(26, nameBytes.length, true);
    lh.setUint16(28, 0, true);
    const lhBytes = new Uint8Array(lh.buffer);
    localChunks.push(lhBytes, nameBytes, e.data);

    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true);
    ch.setUint16(4, 20, true); // version made by
    ch.setUint16(6, 20, true); // version needed
    ch.setUint16(8, 0, true);
    ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true);
    ch.setUint16(14, 0x21, true);
    ch.setUint32(16, crc, true);
    ch.setUint32(20, size, true);
    ch.setUint32(24, size, true);
    ch.setUint16(28, nameBytes.length, true);
    ch.setUint16(30, 0, true);
    ch.setUint16(32, 0, true);
    ch.setUint16(34, 0, true);
    ch.setUint16(36, 0, true);
    ch.setUint32(38, 0, true);
    ch.setUint32(42, offset, true);
    const chBytes = new Uint8Array(ch.buffer);
    const centralEntry = new Uint8Array(chBytes.length + nameBytes.length);
    centralEntry.set(chBytes, 0);
    centralEntry.set(nameBytes, chBytes.length);
    centralChunks.push(centralEntry);

    offset += lhBytes.length + nameBytes.length + size;
  }

  const centralSize = centralChunks.reduce((s, c) => s + c.length, 0);
  const centralOffset = offset;

  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true);
  eocd.setUint16(4, 0, true);
  eocd.setUint16(6, 0, true);
  eocd.setUint16(8, entries.length, true);
  eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, centralSize, true);
  eocd.setUint32(16, centralOffset, true);
  eocd.setUint16(20, 0, true);

  const total = offset + centralSize + 22;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of localChunks) { out.set(c, p); p += c.length; }
  for (const c of centralChunks) { out.set(c, p); p += c.length; }
  out.set(new Uint8Array(eocd.buffer), p);
  return out;
}

// ── 워크북 빌드 + 다운로드 ────────────────────────────────
export function buildXlsx(sheets: XlsxSheet[]): Uint8Array {
  const used = new Set<string>();
  const named = sheets.map((s) => ({
    name: sanitizeSheetName(s.name, used),
    rows: s.rows,
  }));

  const contentTypes =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    named
      .map(
        (_, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
      )
      .join("") +
    `</Types>`;

  const rootRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>` +
    named
      .map(
        (s, i) =>
          `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`
      )
      .join("") +
    `</sheets></workbook>`;

  const workbookRels =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    named
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`
      )
      .join("") +
    `</Relationships>`;

  const entries: ZipEntry[] = [
    { name: "[Content_Types].xml", data: strToU8(contentTypes) },
    { name: "_rels/.rels", data: strToU8(rootRels) },
    { name: "xl/workbook.xml", data: strToU8(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: strToU8(workbookRels) },
    ...named.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: strToU8(sheetXml(s.rows)),
    })),
  ];

  return zipStore(entries);
}

export function downloadXlsx(filename: string, sheets: XlsxSheet[]): void {
  const bytes = buildXlsx(sheets);
  const blob = new Blob([bytes as BlobPart], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
