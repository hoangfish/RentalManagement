import { BaseView } from './BaseView.js';
import { APP_NAME, DEFAULT_RADIUS_KM, NEARBY_OPTIONS, assetUrl } from '../../Common/constant.js';
import { SearchController } from '../Controller/SearchController.js';
import { appBar, wireAppBar } from './components/appBar.js';
import { textField } from './components/fields.js';
import { escapeHtml } from './components/dom.js';
import { formatMoney, formatDistance } from './components/format.js';
import { RoomMap } from './components/map.js';
import { openRoomDialog } from './components/roomDialog.js';

// Tenant home: search form (left), results (middle), map (right).
export class SearchView extends BaseView {
  title = `Find a room – ${APP_NAME}`;
  #nearby = new Set();
  #map = null;
  #dialog = null;
  #selected = null;

  render() {
    const user = this.ctx.userController.getUserModel();
    const chips = NEARBY_OPTIONS.map((o) =>
      `<button type="button" class="chip" data-nearby="${o.id}" aria-pressed="false">${o.label}</button>`).join('');
    return `
      <div class="app-shell">
        ${appBar({ title: `${APP_NAME} – Find a room`, user })}
        <main class="search-page">
          <aside class="card search-card">
            <form id="search-form" novalidate>
              <h3>Where do you want to rent?</h3>
              ${textField({ name: 'address', label: 'Address', placeholder: 'Enter an address or area', maxlength: 200 })}
              ${textField({ name: 'radiusKm', label: 'Radius (km)', placeholder: String(DEFAULT_RADIUS_KM), inputmode: 'decimal', maxlength: 5 })}
              ${textField({ name: 'price', label: 'Desired price', placeholder: '3,000,000 – 5,000,000 đ', maxlength: 40 })}
              ${textField({ name: 'minArea', label: 'Minimum area (m²)', placeholder: '20', inputmode: 'decimal', maxlength: 7 })}
              <div class="chips" id="nearby">${chips}</div>
              <div class="form-error" hidden></div>
              <button type="submit" class="btn btn-primary btn-block" id="find-btn">Find rooms</button>
            </form>
          </aside>
          <section class="results" aria-live="polite">
            <p class="muted small" id="result-count"></p>
            <div class="result-list" id="result-list"></div>
          </section>
          <section class="map-card" aria-label="Map of the area around your address"><div id="map"></div></section>
        </main>
      </div>`;
  }

  onMount() {
    wireAppBar(this);
    const search = SearchController.getInstance();
    const model = search.getSearchModel();

    this.$('[name="radiusKm"]').value = DEFAULT_RADIUS_KM;
    this.#map = new RoomMap(this.$('#map'), { onSelect: (id) => this.select(id, { fromMap: true }) });
    this.#map.init();

    this.$('#nearby').addEventListener('click', (e) => {
      const chip = e.target.closest('.chip');
      if (!chip) return;
      const id = chip.dataset.nearby;
      if (this.#nearby.has(id)) this.#nearby.delete(id); else this.#nearby.add(id);
      this.$$('#nearby .chip').forEach((c) => {
        const on = this.#nearby.has(c.dataset.nearby);
        c.classList.toggle('on', on);
        c.setAttribute('aria-pressed', String(on));
      });
    });

    this.$('#search-form').addEventListener('submit', (e) => { e.preventDefault(); this.runSearch(); });

    this.$('#result-list').addEventListener('click', (e) => {
      const card = e.target.closest('.result');
      if (!card) return;
      if (e.target.closest('[data-view3d]')) this.openDetails(card.dataset.id);
      else this.select(card.dataset.id);
    });
    this.$('#result-list').addEventListener('keydown', (e) => {
      const card = e.target.closest('.result');
      if (card && e.key === 'Enter' && e.target === card) this.select(card.dataset.id);
    });

    this.listen(search, 'searchStarted', () => {
      this.clearFormErrors();
      this.setBusy(this.$('#find-btn'), true, 'Find rooms', 'Searching…');
    });
    this.listen(search, 'searchDone', (m) => {
      this.setBusy(this.$('#find-btn'), false, 'Find rooms', 'Searching…');
      this.paint(m);
    });
    this.listen(search, 'searchFailed', (message, errors) => {
      this.setBusy(this.$('#find-btn'), false, 'Find rooms', 'Searching…');
      this.showFormErrors(message, errors);
    });

    this.runSearch(); // show rooms straight away
  }

  destroy() {
    super.destroy();
    this.#dialog?.close();
    this.#map?.destroy();
  }

  runSearch() {
    this.#selected = null;
    SearchController.getInstance().search({
      address: this.$('[name="address"]').value,
      radiusKm: this.$('[name="radiusKm"]').value,
      price: this.$('[name="price"]').value,
      minArea: this.$('[name="minArea"]').value,
      nearby: [...this.#nearby],
    });
  }

  paint(model) {
    const { results, center, total } = model;
    const count = this.$('#result-count');
    const list = this.$('#result-list');

    if (!results.length) {
      count.textContent = '';
      list.innerHTML = `
        <div class="card empty">
          <h3>No rooms found</h3>
          <p class="muted">${center
            ? 'Try a bigger radius, a wider price range or fewer “near” filters.'
            : 'No rooms have been posted yet. Please check back soon.'}</p>
        </div>`;
    } else {
      const noun = total === 1 ? 'result' : 'results';
      count.textContent = center
        ? `${total} ${noun} near your address${total > results.length ? ` (showing the nearest ${results.length})` : ''}`
        : `${total} ${total === 1 ? 'room' : 'rooms'} available${total > results.length ? ` (showing the latest ${results.length})` : ''}`;
      list.innerHTML = results.map((room) => this.card(room, center)).join('');
    }
    this.#map.setData({ center, radiusKm: model.radiusKm, rooms: results });
  }

  card(room, center) {
    const cover = room.photos[0];
    const meta = [
      room.distanceKm != null ? `${center?.approximate ? '~' : ''}${formatDistance(room.distanceKm)} from you` : '',
      room.area ? `${room.area} m²` : '',
      room.maxPeople ? `up to ${room.maxPeople} ${room.maxPeople === 1 ? 'person' : 'people'}` : '',
    ].filter(Boolean).join(' • ');
    return `
      <article class="result card" data-id="${escapeHtml(room.id)}" tabindex="0">
        <div class="result-thumb">${cover
          ? `<img src="${escapeHtml(assetUrl(cover.url))}" alt="" loading="lazy">`
          : '<span>Room photo</span>'}</div>
        <div class="result-main">
          <h3>${escapeHtml(room.title)}</h3>
          <p class="muted small clamp">${escapeHtml(room.address)}</p>
          <p class="small">${escapeHtml(meta)}</p>
          <p class="room-price">${formatMoney(room.price)} đ/month</p>
        </div>
        <div class="result-act"><button type="button" class="btn btn-primary btn-sm" data-view3d>${room.panoramas?.length ? 'View 3D' : 'View details'}</button></div>
      </article>`;
  }

  select(id, { fromMap = false } = {}) {
    this.#selected = id;
    this.$$('.result').forEach((c) => c.classList.toggle('selected', c.dataset.id === id));
    if (fromMap) this.$(`.result[data-id="${CSS.escape(id)}"]`)?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    else this.#map.select(id);
  }

  openDetails(id) {
    const search = SearchController.getInstance();
    const model = search.getSearchModel();
    const room = model.find(id);
    if (!room) return;
    this.select(id);
    this.#dialog?.close();
    this.#dialog = openRoomDialog({ room, controller: search, center: model.center });
  }
}
