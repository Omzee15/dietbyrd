import sharp from 'sharp';
import path from 'path';

async function removeWhiteBackground() {
  const inputPath = path.resolve('public/signin-image.png');
  const outputPath = path.resolve('public/signin-image-nobg.png');

  const image = sharp(inputPath);
  const { data, info } = await image
    .raw()
    .ensureAlpha()
    .toBuffer({ resolveWithObject: true });

  const { width, height } = info;

  // Flood-fill approach: mark all near-white pixels reachable from edges as transparent
  const visited = new Uint8Array(width * height);
  const isNearWhite = (idx) => {
    const r = data[idx], g = data[idx + 1], b = data[idx + 2];
    return r > 225 && g > 225 && b > 225;
  };

  // BFS from all edge pixels
  const queue = [];
  
  // Add all edge pixels that are near-white
  for (let x = 0; x < width; x++) {
    // Top row
    let idx = x * 4;
    if (isNearWhite(idx)) { queue.push(x); visited[x] = 1; }
    // Bottom row
    let bottomPixel = (height - 1) * width + x;
    idx = bottomPixel * 4;
    if (isNearWhite(idx)) { queue.push(bottomPixel); visited[bottomPixel] = 1; }
  }
  for (let y = 0; y < height; y++) {
    // Left column
    let leftPixel = y * width;
    let idx = leftPixel * 4;
    if (isNearWhite(idx)) { queue.push(leftPixel); visited[leftPixel] = 1; }
    // Right column
    let rightPixel = y * width + (width - 1);
    idx = rightPixel * 4;
    if (isNearWhite(idx)) { queue.push(rightPixel); visited[rightPixel] = 1; }
  }

  console.log(`Starting BFS from ${queue.length} edge pixels...`);

  // BFS
  let head = 0;
  while (head < queue.length) {
    const pixel = queue[head++];
    const px = pixel % width;
    const py = Math.floor(pixel / width);

    // Check 4 neighbors
    const neighbors = [
      [px - 1, py], [px + 1, py],
      [px, py - 1], [px, py + 1]
    ];

    for (const [nx, ny] of neighbors) {
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
      const nPixel = ny * width + nx;
      if (visited[nPixel]) continue;
      
      const nIdx = nPixel * 4;
      if (isNearWhite(nIdx)) {
        visited[nPixel] = 1;
        queue.push(nPixel);
      }
    }
  }

  console.log(`Found ${queue.length} background pixels to make transparent`);

  // Make all visited pixels transparent, with edge anti-aliasing
  for (let i = 0; i < width * height; i++) {
    if (visited[i]) {
      data[i * 4 + 3] = 0; // Fully transparent
    }
  }

  // Edge softening: for non-transparent pixels adjacent to transparent ones,
  // slightly soften the alpha for anti-aliasing
  const output = Buffer.from(data);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = y * width + x;
      if (!visited[i]) {
        // Count transparent neighbors
        let transparentCount = 0;
        if (visited[i - 1]) transparentCount++;
        if (visited[i + 1]) transparentCount++;
        if (visited[i - width]) transparentCount++;
        if (visited[i + width]) transparentCount++;
        
        if (transparentCount >= 2) {
          output[i * 4 + 3] = Math.floor(output[i * 4 + 3] * 0.7);
        } else if (transparentCount === 1) {
          output[i * 4 + 3] = Math.floor(output[i * 4 + 3] * 0.9);
        }
      }
    }
  }

  await sharp(output, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);

  console.log(`✅ Background removed! Saved to ${outputPath}`);
}

removeWhiteBackground().catch(console.error);
