import sharp from 'sharp';

async function crop() {
  const input = 'public/doctors-nobg.png';
  const output = 'public/doctors-cropped.png';
  
  const { info, data } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
    
  let minX = info.width, minY = info.height, maxX = 0, maxY = 0;
  
  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const alpha = data[(y * info.width + x) * 4 + 3];
      if (alpha > 10) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  
  console.log('Bounding box:', {minX, minY, maxX, maxY, originalWidth: info.width});
  
  await sharp(input)
    .extract({ left: minX, top: minY, width: maxX - minX + 1, height: maxY - minY + 1 })
    .toFile(output);
    
  console.log('Cropped image saved to', output);
}

crop().catch(console.error);
