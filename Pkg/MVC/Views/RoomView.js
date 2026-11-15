import { BaseView } from './BaseView.js';
import { APP_NAME, ROUTES, assetUrl } from '../../Common/constant.js';
import { SearchController } from '../Controller/SearchController.js';
import { appBar, wireAppBar } from './components/appBar.js';
import { escapeHtml } from './components/dom.js';
import { formatMoney } from './components/format.js';
import { icons } from './components/icons.js';
import { mountPanoViewer } from './components/panoViewer.js';

const initialsOf = (name) =>
  String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || '').join('') || '?';

// Tenant: one room on its own page (#/room?id=<roomId>).
//   top    : big 3D (360°) view – or the photos when the landlord did not add a 360° photo
//   below  : room details (left) and the landlord with contact buttons (right)
export class RoomView extends BaseView {
  title = `Room – ${APP_NAME}`;
  #roomId = null;
  #viewer = null;

  constructor(ctx, params) {
    super(ctx, params);
    this.#roomId = params.id || null;
  }

  render() {
    const user = this.ctx.userController.getUserModel();
    return `
      <div class="app-shell">
        ${appBar({ title: APP_NAME, user })}
        <main class="room-page">
          <a class="back-inline" href="#${ROUTES.HOME}">${icons.arrowLeft(16)} Back to results</a>
          <div id="room-body">
            <div class="card empty"><p class="muted" id="room-state">Loading room…</p></div>
          </div>
        </main>
      </div>`;
  }

  onMount() {
    wireAppBar(this);
    const search = SearchController.getInstance();

    this.listen(search, 'roomDetailsLoaded', (room) => this.paint(room));
    this.listen(search, 'roomDetailsFailed', (message) => this.paintError(message));

    if (!this.#roomId) return this.paintError('This room link is not valid');
    search.loadRoomDetails(this.#roomId);
  }

  destroy() {
    super.destroy();
    this.#viewer?.destroy();
    this.#viewer = null;
  }

  paintError(message) {
    this.$('#room-body').innerHTML = `
      <div class="card empty">
        <h3>We could not open this room</h3>
        <p class="muted">${escapeHtml(message)}</p>
        <a class="btn btn-primary" href="#${ROUTES.HOME}">Back to results</a>
      </div>`;
  }

  paint(room) {
    document.title = `${room.title} – ${APP_NAME}`;
    const bar = this.$('.app-bar-title');
    if (bar) bar.textContent = `${APP_NAME} – ${room.title}`;

    const panorama = room.panoramas?.[0] || null;
    const facts = [
      room.area ? `${room.area} m²` : '',
      room.maxPeople ? `${room.maxPeople} ${room.maxPeople === 1 ? 'person' : 'people'}` : '',
      ...(room.amenities || []),
    ].filter(Boolean).join(' • ');
    const updated = room.updatedAt
      ? new Date(room.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';

    this.$('#room-body').innerHTML = `
      ${panorama ? this.heroPanorama() : this.heroPhotos(room)}
      <div class="room-info">
        <section class="pn room-details">
          <h2>${escapeHtml(room.title)}</h2>
          <p class="pr room-price-lg">${formatMoney(room.price)} đ/month</p>
          ${facts ? `<p class="room-facts">${escapeHtml(facts)}</p>` : ''}
          <p class="lb">Address</p>
          <p class="room-text">${escapeHtml(room.address)}</p>
          <p class="lb">Description</p>
          <p class="room-text desc">${room.description ? escapeHtml(room.description) : '<span class="muted">The landlord has not added a description.</span>'}</p>
        </section>
        <section class="pn room-owner">
          <h3>Landlord</h3>
          <div class="owner-row">
            <div class="avatar owner-avatar" aria-hidden="true">${escapeHtml(initialsOf(room.ownerName))}</div>
            <div>
              <p class="owner-name">${escapeHtml(room.ownerName)}</p>
              ${updated ? `<p class="lb">Listing updated ${escapeHtml(updated)}</p>` : ''}
            </div>
          </div>
          <div id="contact">
            <p class="lb">Phone number</p>
            <p class="owner-phone" id="owner-phone">Shown when you contact the owner</p>
            <div class="contact-actions" id="contact-actions">
              <button type="button" class="btn btn-primary" data-contact="message">Message</button>
              <button type="button" class="hchip hchip-lg" data-contact="call">Call</button>
            </div>
            <p class="field-error" id="contact-error" role="alert"></p>
          </div>
        </section>
      </div>`;

    if (panorama) this.mountViewer(room, panorama);
    this.wireHero(room);
    this.wireContact(room);
  }

  // ---------- the big area at the top ----------

  heroPanorama() {
    return `
      <section class="room-hero" id="hero" aria-label="3D view of the room">
        <div class="room-hero-view" id="hero-view"></div>
        <span class="hchip hero-label">${icons.panorama(14)} 3D view – drag to look around</span>
        <div class="hero-modes" role="group" aria-label="View modes">
          <button type="button" class="hchip on" aria-pressed="true">Walk</button>
          <button type="button" class="hchip" disabled title="Coming soon">Floor plan</button>
          <button type="button" class="hchip" disabled title="Coming soon">Floors</button>
          <button type="button" class="hchip" disabled title="Coming soon">Measure</button>
        </div>
        <button type="button" class="hchip hero-full" id="hero-full" hidden>Fullscreen</button>
      </section>`;
  }

  // No 360° photo: show the normal photos in the same place.
  heroPhotos(room) {
    const photos = room.photos || [];
    if (!photos.length) {
      return '<section class="room-hero room-hero-empty" id="hero"><p>No photos yet</p></section>';
    }
    return `
      <section class="room-hero" id="hero" aria-label="Room photos">
        <img class="room-hero-img" id="hero-img" src="${escapeHtml(assetUrl(photos[0].url))}" alt="Photo 1 of ${photos.length}">
        <span class="hchip hero-label">No 3D view yet – photos</span>
        ${photos.length > 1 ? `<div class="hero-thumbs" id="hero-thumbs">${photos.map((p, i) =>
          `<button type="button" class="thumb-btn${i === 0 ? ' on' : ''}" data-i="${i}" aria-label="Show photo ${i + 1}"><img src="${escapeHtml(assetUrl(p.url))}" alt=""></button>`).join('')}</div>` : ''}
        <button type="button" class="hchip hero-full" id="hero-full" hidden>Fullscreen</button>
      </section>`;
  }

  mountViewer(room, panorama) {
    this.#viewer = mountPanoViewer(this.$('#hero-view'), {
      url: assetUrl(panorama.url),
      label: panorama.label || room.title,
      hint: false,           // the "3D view – drag to look around" chip already says it
      fullscreenTool: false, // the page has its own Fullscreen chip
    });
    SearchController.getInstance().recordView3d(room.id); // counts as one "3D view" on the landlord's dashboard
  }

  wireHero(room) {
    const hero = this.$('#hero');
    const full = this.$('#hero-full');
    if (full && hero.requestFullscreen) {
      full.hidden = false;
      full.addEventListener('click', () => {
        if (document.fullscreenElement) document.exitFullscreen?.();
        else hero.requestFullscreen().catch(() => {});
      });
    }
    this.$('#hero-thumbs')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.thumb-btn');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      const img = this.$('#hero-img');
      img.src = assetUrl(room.photos[i].url);
      img.alt = `Photo ${i + 1} of ${room.photos.length}`;
      this.$$('#hero-thumbs .thumb-btn').forEach((b) => b.classList.toggle('on', b === btn));
    });
  }

  // ---------- contact: shown only when the tenant asks ----------

  wireContact(room) {
    const search = SearchController.getInstance();
    const actions = this.$('#contact-actions');
    const errorBox = this.$('#contact-error');

    actions.addEventListener('click', (e) => {
      if (!e.target.closest('[data-contact]')) return;
      errorBox.textContent = '';
      actions.querySelectorAll('button').forEach((b) => { b.disabled = true; });
      search.loadContact(room.id);
    });

    this.listen(search, 'contactLoaded', (id, c) => {
      if (id !== room.id) return;
      const tel = String(c.phone).replace(/[^\d+]/g, '');
      this.$('#owner-phone').innerHTML = `<a href="tel:${escapeHtml(tel)}">${escapeHtml(c.phone)}</a>`;
      actions.innerHTML = `
        <a class="btn btn-primary" href="sms:${escapeHtml(tel)}">Message</a>
        <a class="hchip hchip-lg" href="tel:${escapeHtml(tel)}">Call</a>`;
      errorBox.innerHTML = `<span class="muted small">Email: <a href="mailto:${escapeHtml(c.email)}">${escapeHtml(c.email)}</a><br>
        Contact the owner to arrange a viewing and agree on the price.</span>`;
    });
    this.listen(search, 'contactFailed', (id, message) => {
      if (id !== room.id) return;
      actions.querySelectorAll('button').forEach((b) => { b.disabled = false; });
      errorBox.textContent = message;
    });
  }
}
