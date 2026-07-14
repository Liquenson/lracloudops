import sharp from 'sharp'
import { readFileSync } from 'fs'

const svg = readFileSync('public/favicon-optimized.svg')

// PNG sizes para favicon
const sizes = [16, 32, 48, 96, 180, 192, 512]

for (const size of sizes) {
  await sharp(svg)
    .resize(size, size)
    .png()
    .toFile(`public/favicon-${size}x${size}.png`)
  console.log(`Generated favicon-${size}x${size}.png`)
}

// Apple Touch Icon
await sharp(svg)
  .resize(180, 180)
  .png()
  .toFile('public/apple-touch-icon.png')
console.log('Generated apple-touch-icon.png')

console.log('All favicons generated!')
