const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

const inputDir = path.join(process.cwd(), "public", "images", "carousel");
const outputDir = path.join(process.cwd(), "public", "images", "carousel-optimized");

if (!fs.existsSync(inputDir)) {
  console.error("Input directory not found:", inputDir);
  process.exit(1);
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

async function optimizeImages() {
  const files = fs.readdirSync(inputDir).filter((f) => f.endsWith(".png"));

  for (const file of files) {
    const inputPath = path.join(inputDir, file);
    const outputPath = path.join(outputDir, file.replace(/\.png$/i, ".webp"));

    try {
      await sharp(inputPath)
        .resize(1920, null, { withoutEnlargement: true })
        .webp({ quality: 85 })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      console.log(`Optimized: ${file} -> ${(stats.size / 1024).toFixed(1)} KiB`);
    } catch (err) {
      console.error(`Failed ${file}:`, err.message);
    }
  }

  console.log("Done.");
}

async function optimizeLogo() {
  const logoPath = path.join(process.cwd(), "public", "images", "logo.png");
  const outPath = path.join(process.cwd(), "public", "images", "logo.webp");
  if (!fs.existsSync(logoPath)) {
    console.log("Logo not found, skipping.");
    return;
  }
  await sharp(logoPath)
    .webp({ quality: 90 })
    .toFile(outPath);
  const stats = fs.statSync(outPath);
  console.log(`Logo: logo.webp -> ${(stats.size / 1024).toFixed(1)} KiB`);
}

async function main() {
  await optimizeImages();
  await optimizeLogo();
}

main();
