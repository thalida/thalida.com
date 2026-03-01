import { Resvg } from "@resvg/resvg-js";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, "../public");

const conversions = [
  { input: "card-1200x630.svg", output: "card-1200x630.png", width: 1200 },
  { input: "card-512x512.svg", output: "card-512x512.png", width: 512 },
];

for (const { input, output, width } of conversions) {
  const svg = readFileSync(resolve(publicDir, input), "utf-8");
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: {
      loadSystemFonts: true,
    },
  });
  const rendered = resvg.render();
  const png = rendered.asPng();
  writeFileSync(resolve(publicDir, output), png);
  console.log(`✓ ${input} → ${output} (${png.length} bytes)`);
}
