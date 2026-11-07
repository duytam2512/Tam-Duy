import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Table CRC32 chuẩn PNG
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function createPng(width, height, isMaskable = false) {
  // Tạo buffer scanline: mỗi dòng có 1 byte filter (0) + width * 4 bytes RGBA
  const rowSize = 1 + width * 4;
  const rawData = Buffer.alloc(height * rowSize);

  // Bảng màu ấm áp "Góc Nhỏ Bình Yên"
  const bg = [250, 246, 240, 255];        // #FAF6F0
  const heartFill = [255, 245, 242, 255]; // #FFF5F2
  const strokeColor = [200, 125, 85, 255];// #C87D55
  const houseFill = [250, 247, 242, 255]; // #FAF7F2
  const doorFill = [232, 165, 152, 255];  // #E8A598

  // Safe margin nếu là maskable icon (15% viền)
  const marginScale = isMaskable ? 0.72 : 0.88;
  const cx = width / 2;
  const cy = height / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Tọa độ chuẩn hóa [-1, 1] tính từ tâm
      const nx = ((x - cx) / (width / 2)) / marginScale;
      const ny = ((y - cy) / (height / 2)) / marginScale;

      let r = bg[0], g = bg[1], b = bg[2], a = bg[3];

      // 1. Vẽ hình trái tim: công thức toán học (x^2 + y^2 - 1)^3 - x^2 * y^3 <= 0
      // Chuyển trục: Y ngược
      const hx = nx * 1.15;
      const hy = -(ny + 0.1) * 1.15;
      const aVal = hx * hx + hy * hy - 0.75;
      const heartEq = aVal * aVal * aVal - hx * hx * hy * hy * hy;

      if (heartEq <= 0.08) {
        // Bên trong trái tim
        r = heartFill[0];
        g = heartFill[1];
        b = heartFill[2];

        // Viền trái tim
        if (heartEq >= -0.04) {
          r = strokeColor[0];
          g = strokeColor[1];
          b = strokeColor[2];
        }
      }

      // 2. Vẽ mái nhà và ngôi nhà ấm cúng ở trung tâm
      // Tọa độ mái nhà: tam giác từ đỉnh (0, 0.05) xuống (-0.35, -0.15) và (0.35, -0.15)
      const roofPeakY = -0.18;
      const roofBaseY = 0.05;
      const houseBottomY = 0.42;

      // Kiểm tra trong phần mái nhà tam giác
      if (ny >= roofPeakY && ny <= roofBaseY) {
        const roofProgress = (ny - roofPeakY) / (roofBaseY - roofPeakY);
        const halfRoofWidth = roofProgress * 0.38;
        if (Math.abs(nx) <= halfRoofWidth) {
          r = houseFill[0];
          g = houseFill[1];
          b = houseFill[2];

          // Viền mái nhà
          if (Math.abs(nx) >= halfRoofWidth - 0.05 || Math.abs(ny - roofPeakY) <= 0.035) {
            r = strokeColor[0];
            g = strokeColor[1];
            b = strokeColor[2];
          }
        }
      }

      // 3. Kiểm tra phần thân nhà hình chữ nhật
      if (ny >= roofBaseY && ny <= houseBottomY && Math.abs(nx) <= 0.32) {
        r = houseFill[0];
        g = houseFill[1];
        b = houseFill[2];

        // 4. Cánh cửa nhỏ ở giữa nhà
        if (ny >= 0.18 && ny <= houseBottomY && Math.abs(nx) <= 0.12) {
          r = doorFill[0];
          g = doorFill[1];
          b = doorFill[2];

          // Viền cửa
          if (Math.abs(nx) >= 0.09 || ny <= 0.21) {
            r = strokeColor[0];
            g = strokeColor[1];
            b = strokeColor[2];
          }
        }

        // Viền thân nhà
        if (Math.abs(nx) >= 0.28 || Math.abs(ny - houseBottomY) <= 0.035) {
          r = strokeColor[0];
          g = strokeColor[1];
          b = strokeColor[2];
        }
      }

      // 5. Ống khói
      if (ny >= -0.28 && ny <= -0.10 && nx >= 0.14 && nx <= 0.24) {
        r = strokeColor[0];
        g = strokeColor[1];
        b = strokeColor[2];
      }

      // Làm tròn góc nếu không phải maskable
      if (!isMaskable) {
        const cornerRadius = width * 0.2;
        const inCorner =
          (x < cornerRadius && y < cornerRadius && Math.hypot(x - cornerRadius, y - cornerRadius) > cornerRadius) ||
          (x > width - cornerRadius && y < cornerRadius && Math.hypot(x - (width - cornerRadius), y - cornerRadius) > cornerRadius) ||
          (x < cornerRadius && y > height - cornerRadius && Math.hypot(x - cornerRadius, y - (height - cornerRadius)) > cornerRadius) ||
          (x > width - cornerRadius && y > height - cornerRadius && Math.hypot(x - (width - cornerRadius), y - (height - cornerRadius)) > cornerRadius);

        if (inCorner) {
          a = 0; // Trong suốt ngoài góc bo
        }
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  // Nén IDAT bằng Deflate
  const compressedData = zlib.deflateSync(rawData, { level: 9 });

  // Tạo Header IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    const crcValue = crc32(Buffer.concat([typeBuf, data]));
    crcBuf.writeUInt32BE(crcValue, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve(process.cwd(), 'public');

// Tạo các kích thước biểu tượng theo tiêu chuẩn PWA
const targets = [
  { file: 'pwa-192x192.png', size: 192, maskable: false },
  { file: 'pwa-512x512.png', size: 512, maskable: false },
  { file: 'pwa-maskable-512x512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: false },
];

for (const target of targets) {
  const filePath = path.join(publicDir, target.file);
  const buffer = createPng(target.size, target.size, target.maskable);
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: ${target.file} (${target.size}x${target.size})`);
}
