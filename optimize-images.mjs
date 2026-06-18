import sharp from 'sharp';
import fs from 'fs';

async function optimizeImages() {
  const images = [
    { in: 'public/doctors-nobg.png', out: 'public/doctors-nobg.webp' },
    { in: 'public/signin-image-nobg.png', out: 'public/signin-image-nobg.webp' }
  ];

  for (const img of images) {
    console.log(`Optimizing ${img.in}...`);
    try {
      await sharp(img.in)
        .webp({ quality: 80, effort: 6 })
        .toFile(img.out);
      
      const inSize = fs.statSync(img.in).size;
      const outSize = fs.statSync(img.out).size;
      console.log(`Successfully converted to WebP: ${img.out}`);
      console.log(`Size reduction: ${(inSize / 1024 / 1024).toFixed(2)} MB -> ${(outSize / 1024 / 1024).toFixed(2)} MB`);
    } catch (err) {
      console.error(`Error optimizing ${img.in}:`, err);
    }
  }
}

optimizeImages();
