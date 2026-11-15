import { escapeHtml } from './dom.js';
import { icons } from './icons.js';
import { assetUrl } from '../../../Common/constant.js';
import { mountPanoViewer } from './panoViewer.js';

// Full-screen 3D (360°) viewer for a room.
//   openTourDialog({ title, panoramas: [{ url, label }], onClose })
// `url` may be a server path (/uploads/...), a full http(s) URL or a blob: URL (landlord's preview before posting).
// With several panoramas a row of spot buttons appears (used once rooms have more than one 360° photo).
// Returns { close }.
export function openTourDialog({ title, panoramas, onClose }) {
  const previouslyFocused = document.activeElement;
  const spots = panoramas.map((p, i) => ({
    url: /^(blob:|data:)/.test(p.url) ? p.url : assetUrl(p.url),
    label: p.label || `Spot ${i + 1}`,
  }));
  let index = 0;

  const backdrop = document.createElement('div');
  backdrop.className = 'tour-backdrop';
  backdrop.innerHTML = `
    <div class="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      <header class="tour-head">
        <div class="tour-titles">
          <h2 id="tour-title">${escapeHtml(title || 'Room')}</h2>
          <p class="tour-spot" id="tour-spot"></p>
        </div>
        <button type="button" class="icon-btn tour-close" aria-label="Close 3D view">${icons.close(22)}</button>
      </header>
      ${spots.length > 1 ? `<nav class="tour-spots" aria-label="Spots in this room">${spots.map((s, i) =>
        `<button type="button" class="chip${i === 0 ? ' on' : ''}" data-i="${i}">${escapeHtml(s.label)}</button>`).join('')}</nav>` : ''}
      <div class="tour-stage"></div>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('no-scroll');

  const $ = (s) => backdrop.querySelector(s);
  const viewer = mountPanoViewer($('.tour-stage'), { url: spots[0].url, label: spots[0].label });
  const paintSpot = () => { $('#tour-spot').textContent = spots.length > 1 ? spots[index].label : ''; };
  paintSpot();

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    window.removeEventListener('keydown', onKey, true);
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
    viewer.destroy();
    backdrop.remove();
    // keep the page locked when the room details are still open underneath
    if (!document.querySelector('.dialog-backdrop')) document.body.classList.remove('no-scroll');
    previouslyFocused?.focus?.();
    onClose?.();
  };
  // Capture phase on window: Escape closes only this viewer, not the room details underneath it.
  const onKey = (e) => {
    if (e.key !== 'Escape') return;
    e.stopPropagation();
    if (document.fullscreenElement) return; // the browser leaves full screen first
    close();
  };
  window.addEventListener('keydown', onKey, true);

  $('.tour-close').addEventListener('click', close);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.tour-spots')?.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (!btn) return;
    index = Number(btn.dataset.i);
    backdrop.querySelectorAll('.tour-spots .chip').forEach((c) => c.classList.toggle('on', c === btn));
    viewer.setUrl(spots[index].url);
    paintSpot();
  });

  $('.tour-stage .pano-canvas')?.focus({ preventScroll: true });
  return { close };
}
