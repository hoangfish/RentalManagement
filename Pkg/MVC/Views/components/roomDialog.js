import { escapeHtml } from './dom.js';
import { formatMoney, formatDistance } from './format.js';
import { assetUrl, NEARBY_LABEL } from '../../../Common/constant.js';
import { icons } from './icons.js';
import { openTourDialog } from './tourDialog.js';

// Room details: photo gallery, facts, the 360° "View 3D" button and "show contact details".
// Returns { close } so the caller can close it when leaving the page.
export function openRoomDialog({ room, controller, center }) {
  const panoramas = room.panoramas || [];
  amenities, ...room.nearby.map((n) => NEARBY_LABEL[n]).filter(Boolean)];

  backdrop.innerHTML = `
    <div class="dialog" role="dialog" aria-modal="true" aria-labelledby="dlg-title">
      <button type="button" class="icon-btn dialog-close" aria-label="Close">×</button>
      <div class="dialog-gallery">
        <div class="dialog-main">
          ${photos.length ? `<img id="dlg-main" src="${escapeHtml(photos[0])}" alt="Photo 1 of ${photos.length}">` : '<span class="muted">No photos</span>'}
          ${has3d ? `<button type="button" class="view3d-btn" id="view3d-btn">${icons.panorama(20)} View in 3D (360°)</button>` : ''}
        </div>
        <div class="dialog-thumbs">${photos.map((src, i) =>
          `<button type="button" class="thumb-btn${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Show photo ${i + 1}"><img src="${escapeHtml(src)}" alt=""></button>`).join('')}</div>
      </div>
      <div class="dialog-body">
        <h2 id="dlg-title">${escapeHtml(room.title)}</h2>
        <p class="room-price">${formatMoney(room.price)} đ/month</p>
        <p class="muted">${escapeHtml(room.address)}</p>
        <p>${escapeHtml(facts)}</p>
        ${tags.length ? `<div class="chips static">${tags.map((t) => `<span class="chip">${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        ${room.description ? `<p class="dialog-desc">${escapeHtml(room.description)}</p>` : ''}
        ${has3d
          ? `<button type="button" class="btn btn-outline" id="view3d-btn2">${icons.panorama(18)} Look around in 3D</button>`
          : '<div class="photo-status">The owner has not added a 3D (360°) view of this room yet. Browse the photos above.</div>'}
        <div class="contact" id="contact">
          <button type="button" class="btn btn-primary" id="contact-btn">Show contact details</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(backdrop);
  document.body.classList.add('no-scroll');

 .key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);

  $('.dialog-close').addEventListener('click', close);
  backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) close(); });
  backdrop.querySelector('.dialog-thumbs').addEventListener('click', (e) => {
    const btn = e.target.closest('.thumb-btn');
    if (!btn) return;
    const i = Number(btn.dataset.i);
    $('#dlg-main').src = photos[i];
    $('#dlg-main').alt = `Photo ${i + 1} of ${photos.length}`;
    backdrop.querySelectorAll('.thumb-btn').forEach((b) => b.classList.toggle('on', b === btn));
  });

  // Opening the 3D view is what counts as a "3D view" on the landlord's dashboard.
  let tour = null;
  const open3d = () => {
    if (tour) return;
    controller.recordView3d(room.id);
    tour = openTourDialog({ title: room.title, panoramas, onClose: () => { tour = null; } });
  };
  $('#view3d-btn')?.addEventListener('click', open3d);
  $('#view3d-btn2')?.addEventListener('click', open3d);

  const box = $('#contact');
  const contactBtn = $('#contact-btn');
  contactBtn.addEventListener('click', () => {
    contactBtn.disabled = true;
    contactBtn.textContent = 'Loading…';
    controller.loadContact(room.id);
  });
  offs.push(controller.on('contactLoaded', (id, c) => {
    if (id !== room.id) return;
    const tel = String(c.phone).replace(/[^\d+]/g, '');
    box.innerHTML = `
      <p><strong>${escapeHtml(c.ownerName)}</strong></p>
      <p>Phone: <a href="tel:${escapeHtml(tel)}">${escapeHtml(c.phone)}</a></p>
      <p>Email: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a></p>
      <p class="muted small">Contact the owner to arrange a viewing and agree on the price.</p>`;
  }));
  offs.push(controller.on('contactFailed', (id, message) => {
    if (id !== room.id) return;
    contactBtn.disabled = false;
    contactBtn.textContent = 'Show contact details';
    box.insertAdjacentHTML('beforeend', `<p class="field-error" role="alert">${escapeHtml(message)}</p>`);
  }));

  $('.dialog-close').focus();
  return { close };
}
