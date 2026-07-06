const sharp = require('sharp');
const fs = require('fs');

async function generateIcons() {
  const sizes = [
    { name: 'icon-192x192.png', size: 192 },
    { name: 'icon-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 },
  ];

  for (const { name, size } of sizes) {
    const svgContent = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#1B2B3A"/>
            <stop offset="100%" stop-color="#0F1C28"/>
          </linearGradient>
        </defs>
        <rect width="${size}" height="${size}" rx="${Math.round(size * 0.18)}" fill="url(#bg)"/>
        <text x="50%" y="42%" dominant-baseline="central" text-anchor="middle"
              font-family="'Playfair Display', Georgia, serif" font-weight="700"
              font-size="${Math.round(size * 0.22)}" fill="#FDFCF8" letter-spacing="-0.02em">
          Diet By
        </text>
        <text x="50%" y="68%" dominant-baseline="central" text-anchor="middle"
              font-family="'DM Sans', Arial, sans-serif" font-weight="800"
              font-size="${Math.round(size * 0.28)}" fill="#427A5B" letter-spacing="0.05em">
          RD
        </text>
      </svg>`;

    await sharp(Buffer.from(svgContent))
      .resize(size, size)
      .png()
      .toFile(`public/icons/${name}`);
    
    console.log(`Generated ${name} (${size}x${size})`);
  }
}

generateIcons().catch(console.error);
