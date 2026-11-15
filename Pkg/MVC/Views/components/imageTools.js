// Phone photos are often 4000x3000 and 5 MB+. Before uploading we shrink them to a size that is
// still plenty for room viewing and 3D reconstruction, which keeps uploads fast on mobile data.
import { MAX_PHOTO_BYTES } from '../../../Common/constant.js';

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
