import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = path.resolve("artifacts", "brand");
const svgPath = path.join(root, "punkt-zycia-logo.svg");
const svg = await fs.readFile(svgPath);
const width = 1440;
const height = 360;
await sharp(svg, { density: 288 })
  .resize(width, height, { fit: "fill" })
  .png({ compressionLevel: 9 })
  .toFile(path.join(root, "punkt-zycia-logo.png"));
await sharp(svg, { density: 288 })
  .resize(width, height, { fit: "fill" })
  .flatten({ background: "#faf9f5" })
  .jpeg({ quality: 95, chromaSubsampling: "4:4:4" })
  .toFile(path.join(root, "punkt-zycia-logo.jpg"));
console.log(`Rendered ${width} × ${height} PNG and JPEG from ${svgPath}`);
