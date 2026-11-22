import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Validates and copies the 22 November 2026 editorial digest image
 * to the designated output directory for make.fun grading.
 *
 * Rules verified:
 * - PNG format with valid magic bytes (89 50 4E 47 0D 0A 1A 0A)
 * - Dimensions exactly 1024x1024 pixels
 * - File size <= 1 MiB (1,048,576 bytes)
 * - Deterministic byte-for-byte copy
 */
function main(): void {
  const sourcePath = fileURLToPath(new URL('./assets/entry.png', import.meta.url));
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR || '/output';
  const destPath = join(outputDir, 'entry.png');

  if (!existsSync(sourcePath)) {
    throw new Error(`Source image not found at: ${sourcePath}`);
  }

  const buffer = readFileSync(sourcePath);
  const sizeBytes = buffer.length;

  // Rule 1: Max 1 MiB
  const maxBytes = 1024 * 1024;
  if (sizeBytes === 0 || sizeBytes > maxBytes) {
    throw new Error(`Invalid file size: ${sizeBytes} bytes (must be between 1 and ${maxBytes} bytes)`);
  }

  // Rule 2: Valid PNG Header
  const pngHeader = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  if (!buffer.subarray(0, 8).equals(pngHeader)) {
    throw new Error('File is not a valid PNG image (incorrect signature)');
  }

  // Rule 3: IHDR Dimensions check (bytes 16-23)
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  if (width !== 1024 || height !== 1024) {
    throw new Error(`Invalid dimensions: ${width}x${height} (must be exactly 1024x1024)`);
  }

  // Prepare output directory
  mkdirSync(outputDir, { recursive: true });

  // Copy entry image
  copyFileSync(sourcePath, destPath);

  console.log(`[make.fun 2026-11-22] Verified and deployed entry:`);
  console.log(`  Source:      ${sourcePath}`);
  console.log(`  Destination: ${destPath}`);
  console.log(`  Dimensions:  ${width}x${height} px`);
  console.log(`  Size:        ${sizeBytes} bytes (${(sizeBytes / 1024).toFixed(1)} KB)`);
}

main();
