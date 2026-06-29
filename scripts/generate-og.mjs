/**
 * Generates /public/og-image.png from /public/og-image.svg using sharp.
 *
 * sharp is already available as a transitive dependency of Astro.
 * Run: node scripts/generate-og.mjs
 *
 * The output PNG (1200×630) is committed to the repository so it is
 * available both locally and on Cloudflare Pages without running this
 * script during the CI build.
 */
import { createRequire } from 'module'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

// Resolve sharp from Astro's node_modules if not at project root
const require = createRequire(import.meta.url)
const sharp = (
  await import('sharp').catch(() => {
    try {
      return { default: require(path.join(root, 'node_modules', 'sharp')) }
    } catch {
      throw new Error(
        'sharp not found. It is a transitive dependency of Astro — ' +
          'run `npm install` from the project root to restore it.'
      )
    }
  })
).default

const svgPath = path.join(root, 'public', 'og-image.svg')
const pngPath = path.join(root, 'public', 'og-image.png')

const svgBuffer = readFileSync(svgPath)

await sharp(svgBuffer, { density: 150 })
  .resize(1200, 630)
  .png({ quality: 90, compressionLevel: 8 })
  .toFile(pngPath)

console.log(`✓ OG image generated: public/og-image.png (1200×630)`)
