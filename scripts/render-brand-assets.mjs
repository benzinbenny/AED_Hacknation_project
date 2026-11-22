import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const source = path.resolve("public", "punkt-zycia-logo.webp");
const output = path.resolve("artifacts", "brand");
await fs.mkdir(output, { recursive: true });
const input = await fs.readFile(source);
const metadata = await sharp(input).metadata();
await sharp(input).png().toFile(path.join(output, "punkt-zycia-logo.png"));
await sharp(input).jpeg({ quality: 95 }).toFile(path.join(output, "punkt-zycia-logo.jpg"));
const image = input.toString("base64");
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${metadata.width}" height="${metadata.height}" viewBox="0 0 ${metadata.width} ${metadata.height}"><title>Punkt Życia</title><image width="${metadata.width}" height="${metadata.height}" href="data:image/webp;base64,${image}"/></svg>`;
await fs.writeFile(path.join(output, "punkt-zycia-logo.svg"), svg);
console.log("Przygotowano PNG, JPG i SVG z osadzonym obrazem rastrowym.");
