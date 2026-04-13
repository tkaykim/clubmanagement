const fs = require("fs");
const zlib = require("zlib");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
  const buf = Buffer.alloc(4 + 4 + data.length + 4);
  buf.writeUInt32BE(data.length, 0);
  buf.write(type, 4, 4, "ascii");
  data.copy(buf, 8);
  const crcData = Buffer.alloc(4 + data.length);
  crcData.write(type, 0, 4, "ascii");
  data.copy(crcData, 4);
  buf.writeUInt32BE(crc32(crcData), 8 + data.length);
  return buf;
}

function makePNG(size) {
  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = size / 2, cy = size / 2, r = size * 0.38;

  for (let y = 0; y < size; y++) {
    raw[y * rowSize] = 0;
    for (let x = 0; x < size; x++) {
      const offset = y * rowSize + 1 + x * 4;
      raw[offset] = 0x0f;
      raw[offset + 1] = 0x17;
      raw[offset + 2] = 0x2a;
      raw[offset + 3] = 0xff;

      const dx = x - cx, dy = y - cy;
      if (dx * dx + dy * dy < r * r) {
        raw[offset] = 0xff;
        raw[offset + 1] = 0xff;
        raw[offset + 2] = 0xff;
      }
    }
  }

  const deflated = zlib.deflateSync(raw);
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([sig, makeChunk("IHDR", ihdr), makeChunk("IDAT", deflated), makeChunk("IEND", Buffer.alloc(0))]);
}

fs.writeFileSync("public/icon-192.png", makePNG(192));
fs.writeFileSync("public/icon-512.png", makePNG(512));
console.log("Icons created: icon-192.png, icon-512.png");
