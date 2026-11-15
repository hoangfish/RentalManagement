import { BaseView } from './BaseView.js';
import { ROUTES, ROOM_STATUS, APP_NAME, assetUrl } from '../../Common/constant.js';
import { RoomController } from '../Controller/RoomController.js';
import { appBar, wireAppBar } from './components/appBar.js';
import { escapeHtml } from './components/dom.js';
import { formatMoney, STATUS_LABEL } from './components/format.js';
import { toast } from './components/toast.js';
import { icons } from './components/icons.js';

// Landlord dashboard ("My rooms"): counters + the list of the landlord's rooms.
export class MyRoomsView extends BaseView {
  title = `My rooms – ${APP_NAME}`;
  #error = '';

  render() {
    const user = this.ctx.userController.getUserModel();
    return `
      <div class="app-shell">
        ${appBar({ title: `${APP_NAME} – Landlord`, user })}
        <main class="app-body wide">
          <div class="page-head">
            <h2>My rooms</h2>
            <a class="btn btn-primary" id="new-room" href="#${ROUTES.ROOM_NEW}">+ Post new room</a>
          </div>
          <div class="stats" id="stats"></div>
          <section class="card room-list" id="list" aria-live="polite"></section>
        </main>
      </div>`;
  }

  onMount() {
    wireAppBar(this);
    const rooms = RoomController.getInstance();
    const model = rooms.getRoomModel();

    this.paint(model);
    this.listen(model, 'changed', () => this.paint(model));
    this.listen(rooms, 'roomsLoadFailed', (message) => { this.#error = message; this.paint(model); });
    this.listen(rooms, 'roomsLoaded', () => { this.#error = ''; });
    this.listen(rooms, 'statusChanged', (room) => toast(`“${room.title}” is now ${STATUS_LABEL[room.status].toLowerCase()}`));
    this.listen(rooms, 'statusChangeFailed', (message) => { toast(message); this.paint(model); });

    this.$('#list').addEventListener('click', (event) => {
      const button = event.target.closest('button[data-action]');
      if (!button) return;
      if (button.dataset.action === 'retry') {
        this.#error = '';
        this.paint(model);
        rooms.loadMyRooms();
        return;
      }
      button.disabled = true;
      rooms.setStatus(button.dataset.id, button.dataset.status);
    });

    rooms.loadMyRooms();
  }

  paint(model) {
    this.paintStats(model);
    this.paintList(model);
  }

  paintStats(model) {
    const loaded = model.loaded;
    const card = (label, value, note = '') => `
      <div class="card stat">
        <p class="stat-label">${label}</p>
        <p class="stat-value">${value}</p>
        ${note ? `<p class="stat-note">${note}</p>` : ''}
      </div>`;
    this.$('#stats').innerHTML =
      card('Active listings', loaded ? model.activeCount : '–') +
      card('3D views', loaded ? model.views3d : '–') +
      card('New messages', '–', 'Coming soon') +
      card('Viewing appointments', '–', 'Coming soon');
  }

  paintList(model) {
    const list = this.$('#list');
    if (!model.loaded) {
      list.innerHTML = this.#error
        ? `<div class="empty"><p>${escapeHtml(this.#error)}</p>
             <button type="button" class="btn btn-outline" data-action="retry">Try again</button></div>`
        : '<p class="muted center pad">Loading your rooms…</p>';
      return;
    }
    if (!model.rooms.length) {
      list.innerHTML = `
        <div class="empty">
          <span class="empty-icon">${icons.home(28)}</span>
          <h3>You have not posted any rooms yet</h3>
          <p class="muted">Add the room details and photos. Tenants will be able to find it by address and price.</p>
          <a class="btn btn-primary" href="#${ROUTES.ROOM_NEW}">+ Post your first room</a>
        </div>`;
      return;
    }
    list.innerHTML = model.rooms.map((room) => this.row(room)).join('');
  }

  row(room) {
    const isDraft = room.status === ROOM_STATUS.DRAFT;
    const cover = room.photos[0];
    const details = [
      room.address,
      room.area ? `${room.area} m²` : '',
      room.maxPeople ? `up to ${room.maxPeople} ${room.maxPeople === 1 ? 'person' : 'people'}` : '',
    ].filter(Boolean).join(' • ');
    const editHref = `#${ROUTES.ROOM_EDIT}?id=${encodeURIComponent(room.id)}`;
    const action = (status, label, cls = 'btn-outline') =>
      `<button type="button" class="btn ${cls} btn-sm" data-action="status" data-id="${escapeHtml(room.id)}" data-status="${status}">${label}</button>`;

    let buttons;
    if (isDraft) {
      buttons = `<a class="btn btn-outline btn-sm" href="${editHref}">Continue editing</a>`;
    } else {
      const hide = room.status === ROOM_STATUS.HIDDEN
        ? action(ROOM_STATUS.ACTIVE, 'Show')
        : action(ROOM_STATUS.HIDDEN, 'Hide');
      const rented = room.status === ROOM_STATUS.RENTED
        ? action(ROOM_STATUS.ACTIVE, 'Mark available', 'btn-ghost')
        : action(ROOM_STATUS.RENTED, 'Mark rented', 'btn-ghost');
      buttons = `<a class="btn btn-outline btn-sm" href="${editHref}">Edit</a>${hide}${rented}`;
    }

    return `
      <article class="room-row" data-room="${escapeHtml(room.id)}">
        <div class="room-thumb">${cover
          ? `<img src="${escapeHtml(assetUrl(cover.url))}" alt="" loading="lazy">`
          : '<span>No photo</span>'}</div>
        <div class="room-main">
          <p class="room-title">${escapeHtml(room.title)}</p>
          <p class="room-sub">${escapeHtml(details || 'Draft – not posted yet')}</p>
        </div>
        <p class="room-price">${room.price ? `${formatMoney(room.price)} đ/month` : '–'}</p>
        <span class="status status-${room.status}">${STATUS_LABEL[room.status]}</span>
        <div class="room-actions">${buttons}</div>
      </article>`;
  }
}
