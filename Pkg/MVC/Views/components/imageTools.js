// Phone photos are often 4000x3000 and 5 MB+. Before uploading we shrink them to a size that is
// still plenty for room viewing and 3D reconstruction, which keeps uploads fast on mobile data.
import {
  MAX_PHOTO_BYTES, MAX_PANORAMA_BYTES, PANORAMA_MIN_WIDTH, PANORAMA_MAX_WIDTH, PANORAMA_SHRINK_WIDTH, PANORAMA_RATIO_TOLERANCE,
} from '../../../Common/constant.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIDE = 2560;
const KEEP_AS_IS_BYTES = 3 * 1024 * 1024;
const QUALITY = 0.88;

const baseName = (name) => String(name || 'photo').replace(/\.[^.]+$/, '') || 'photo';

// Resolves to a Blob ready to upload, or throws an Error with a message fit to show the user.
export async function prepareImage(file) {
  if (!ALLOWED.includes(file.type)) throw new Error('only JPG, PNG or WebP photos are allowed');

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= KEEP_AS_IS_BYTES) { bitmap.close?.(); return file; }

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; // PNGs with transparency would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    if (blob && (blob.size < file.size || scale < 1)) {
      return new File([blob], `${baseName(file.name)}.jpg`, { type: 'image/jpeg' });
    }
  } catch { /* unreadable by the canvas: fall through and try the original */ }

  if (file.size > MAX_PHOTO_BYTES) throw new Error('the photo is larger than 10 MB');
  return file;
}

const toJpeg = (canvas, quality) => new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));

// 360° photos must be "equirectangular": a flat picture exactly twice as wide as it is tall.
// Resolves to { blob, width, height } (the file as picked when it is fine, otherwise a shrunk copy),
// or throws an Error with a message fit to show the landlord.
export async function preparePanorama(file) {
  if (!ALLOWED.includes(file.type)) throw new Error('only JPG, PNG or WebP photos are allowed');

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw new Error('this file could not be read as a photo');
  }
  const { width, height } = bitmap;
  try {
    if (Math.abs(width / height - 2) > 2 * PANORAMA_RATIO_TOLERANCE) {
      throw new Error(`a 360° photo must be twice as wide as it is tall (2:1) – this one is ${width}×${height}. `
        + 'A normal phone panorama is not a full 360° photo; use a 360° camera or a 360° photo app');
    }
    if (width < PANORAMA_MIN_WIDTH) {
      throw new Error(`the photo is too small (${width}×${height}). Use at least ${PANORAMA_MIN_WIDTH}×${PANORAMA_MIN_WIDTH / 2} px`);
    }
    if (width <= PANORAMA_MAX_WIDTH && file.size <= MAX_PANORAMA_BYTES) return { blob: file, width, height };

    // Too many pixels or too many bytes: shrink step by step until it fits.
    let target = Math.min(width, PANORAMA_SHRINK_WIDTH);
    for (let attempt = 0; attempt < 4 && target >= PANORAMA_MIN_WIDTH; attempt++, target = Math.round(target * 0.75)) {
      const canvas = document.createElement('canvas');
      canvas.width = target;
      canvas.height = Math.round(target / 2);
      canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await toJpeg(canvas, 0.9);
      if (blob && blob.size <= MAX_PANORAMA_BYTES) {
        const name = `${baseName(file.name)}.jpg`;
        return { blob: new File([blob], name, { type: 'image/jpeg' }), width: canvas.width, height: canvas.height };
      }
    }
    throw new Error('the photo is too large to upload (over 25 MB). Export it at a smaller size');
  } finally {
    bitmap.close?.();
  }
}
